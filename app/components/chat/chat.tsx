'use client';

import { type Message, useChat } from '@ai-sdk/react';
import { useAction, useConvex, useMutation, useQuery } from 'convex/react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Conversation } from '@/app/components/chat/conversation';
import { ChatInput } from '@/app/components/chat-input/chat-input';
import { useChatSession } from '@/app/providers/chat-session-provider';
import { useUser } from '@/app/providers/user-provider';
import { toast } from '@/components/ui/toast';
import { api } from '@/convex/_generated/api';
import type { Doc, Id } from '@/convex/_generated/dataModel';
import { convertConvexToAISDK } from '@/lib/ai-sdk-utils';
import {
  buildSystemPrompt,
  MESSAGE_MAX_LENGTH,
  MODEL_DEFAULT,
  MODELS,
  REMAINING_QUERY_ALERT_THRESHOLD,
} from '@/lib/config';
import { classifyError, shouldShowAsToast } from '@/lib/error-utils';
import { API_ROUTE_CHAT } from '@/lib/routes';
import { cn } from '@/lib/utils';

const DialogAuth = dynamic(
  () => import('./dialog-auth').then((mod) => mod.DialogAuth),
  { ssr: false }
);

// Helper to map Convex message doc to AI SDK message type
const mapMessage = (msg: Doc<'messages'>): Message => convertConvexToAISDK(msg);

// Map backend error codes to user-friendly messages
function humaniseUploadError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Error uploading file';
  }
  const msg = err.message;
  if (msg.includes('ERR_UNSUPPORTED_MODEL')) {
    return 'File uploads are not supported for the selected model.';
  }
  if (msg.includes('ERR_BAD_MIME')) {
    return 'Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.';
  }
  if (msg.includes('ERR_FILE_TOO_LARGE')) {
    return 'Files can be at most 10 MB.';
  }
  return 'Error uploading file';
}

// Helper to check if a model supports configurable reasoning effort
function supportsReasoningEffort(modelId: string): boolean {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model?.features) {
    return false;
  }
  const reasoningFeature = model.features.find((f) => f.id === 'reasoning');
  return (
    reasoningFeature?.enabled === true &&
    reasoningFeature?.supportsEffort === true
  );
}

// Helper function to extract first name from full name
const getFirstName = (fullName?: string): string | null => {
  if (!fullName) {
    return null;
  }
  return fullName.split(' ')[0];
};

// Get the display name - prefer preferredName over extracted first name
const getDisplayName = (user: Doc<'users'> | null): string | null => {
  if (user?.preferredName) {
    return user.preferredName;
  }
  return getFirstName(user?.name);
};

// Helper function to process branch error
const processBranchError = (branchError: unknown): string => {
  const errorMsg =
    branchError instanceof Error ? branchError.message : String(branchError);
  if (errorMsg.includes('Can only branch from assistant messages')) {
    return 'You can only branch from assistant messages';
  }
  if (errorMsg.includes('not found')) {
    return 'Message not found or chat unavailable';
  }
  if (errorMsg.includes('unauthorized')) {
    return "You don't have permission to branch this chat";
  }
  return 'Failed to branch chat';
};

export default function Chat() {
  const { chatId, isDeleting, setIsDeleting } = useChatSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading: isUserLoading } = useUser();

  // --- Convex Data Hooks ---
  const messagesFromDB = useQuery(
    api.messages.getMessagesForChat,
    chatId ? { chatId: chatId as Id<'chats'> } : 'skip'
  );
  const currentChat = useQuery(
    api.chats.getChat,
    chatId ? { chatId: chatId as Id<'chats'> } : 'skip'
  );
  const createChat = useMutation(api.chats.createChat);
  const updateChatModel = useMutation(api.chats.updateChatModel);
  const branchChat = useMutation(api.chats.branchChat);
  const deleteMessage = useMutation(api.messages.deleteMessageAndDescendants);
  const generateUploadUrl = useAction(api.files.generateUploadUrl);
  const saveFileAttachment = useAction(api.files.saveFileAttachment);
  const convex = useConvex();

  // --- Local State ---
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBranching, setIsBranching] = useState(false);
  const [hasDialogAuth, setHasDialogAuth] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedModel, setSelectedModel] = useState(
    user?.preferredModel || MODEL_DEFAULT
  );
  const [reasoningEffort, setReasoningEffort] = useState<
    'low' | 'medium' | 'high'
  >('low');
  const [personaPrompt, setPersonaPrompt] = useState<string | undefined>();
  const [systemPrompt, setSystemPrompt] = useState(() =>
    buildSystemPrompt(user)
  );

  const isAuthenticated = !!user && !user.isAnonymous;

  // --- Vercel AI SDK useChat Hook ---
  const { messages, status, error, reload, stop, setMessages, append } =
    useChat({
      api: API_ROUTE_CHAT,
      // initialMessages are now set via useEffect
      onResponse: () => {
        // console.log("onResponse", response)
      },
      onFinish: () => {
        // console.log("onFinish", message)
      },
    });

  // --- Effects for State Synchronization ---

  // useEffect(() => {
  //   console.log("Chat component mounted", chatId)
  //   return () => {
  //     console.log("Chat component unmounted", chatId)
  //   }
  // }, [])

  // useEffect(() => {
  //   console.log("useChat status:", status)
  //   console.log("useChat messages:", messages)
  // }, [status, messages])

  // Sync messages from DB to AI SDK state ensuring IDs from Convex are merged
  // into the client state. We avoid the flash by:
  // 1. Replacing the entire list only when DB has >= messages.length
  // 2. When DB has fewer messages (likely because the latest user message
  //    hasn't persisted yet), we merge IDs/metadata for the overlap without
  //    dropping optimistic messages.
  // 3. While a delete operation is in flight (isDeleting), we skip syncing to
  //    prevent the just-deleted message from reappearing.
  useEffect(() => {
    if (
      (status !== 'ready' && status !== 'error') ||
      !messagesFromDB ||
      isDeleting
    ) {
      return;
    }

    const mappedDb = messagesFromDB.map(mapMessage);

    if (mappedDb.length >= messages.length) {
      // DB is up-to-date or ahead – merge to ensure we keep streaming-only
      // properties (e.g. `parts`) that are not yet persisted in the DB.
      const merged = mappedDb.map((dbMsg: Message, idx: number) => {
        const prev = messages[idx];
        if (prev?.parts && !dbMsg.parts) {
          return { ...dbMsg, parts: prev.parts };
        }
        return dbMsg;
      });
      setMessages(merged);
    } else if (mappedDb.length > 0) {
      // DB is behind: merge IDs for the portion we have *without* dropping
      // recent optimistic messages (e.g., the just-streamed assistant reply).
      // We still update canonical IDs/metadata for the overlapping range so
      // that once the DB catches up the local state is already aligned.
      const merged = messages.map((msg, idx) => {
        if (idx < mappedDb.length) {
          const dbMsg = mappedDb[idx];
          return {
            ...msg,
            id: dbMsg.id,
            experimental_attachments: dbMsg.experimental_attachments,
            parts: msg.parts ?? dbMsg.parts,
          };
        }
        // Keep optimistic messages beyond the DB length untouched to avoid
        // momentary disappearance in the UI.
        return msg;
      });
      setMessages(merged);
    }
  }, [messagesFromDB, status, messages, setMessages, isDeleting]);

  // If we're in a brand-new chat (no chatId yet) ensure local state stays empty.
  useEffect(() => {
    if ((status === 'ready' || status === 'error') && !chatId) {
      setMessages([]);
    }
  }, [status, chatId, setMessages]);

  // Sync chat settings from DB to local state
  useEffect(() => {
    if (currentChat) {
      setSelectedModel(currentChat.model || MODEL_DEFAULT);
      setSystemPrompt(currentChat.systemPrompt || buildSystemPrompt(user));
      setPersonaPrompt(undefined);
    }
  }, [currentChat, user]);

  useEffect(() => {
    if (!chatId) {
      setSystemPrompt(buildSystemPrompt(user, personaPrompt));
    }
  }, [
    chatId,
    user,
    user?.preferredName,
    user?.occupation,
    user?.traits,
    user?.about,
    personaPrompt,
  ]);

  // --- Error Handling ---
  useEffect(() => {
    if (error && shouldShowAsToast(error)) {
      const classified = classifyError(error);
      toast({
        title: classified.userFriendlyMessage,
        status: 'error',
      });
    }
  }, [error]);

  // --- Core Logic Handlers ---

  const checkLimitsAndNotify = async (): Promise<boolean> => {
    try {
      const rateData = await convex.query(api.users.getRateLimitStatus, {});
      const remaining = rateData.effectiveRemaining;
      const plural = remaining === 1 ? 'query' : 'queries';

      if (remaining === 0 && !isAuthenticated) {
        setHasDialogAuth(true);
        return false;
      }

      if (remaining === REMAINING_QUERY_ALERT_THRESHOLD) {
        toast({
          title: `Only ${remaining} ${plural} remaining today.`,
          status: 'info',
        });
      }

      return true;
    } catch {
      // Rate limit check failed - log silently and allow the request to proceed
      return false;
    }
  };

  const ensureChatExists = async (inputMessage: string) => {
    if (messages.length === 0 && inputMessage) {
      try {
        const result = await createChat({
          title: inputMessage.substring(0, 50), // Create a title from the first message
          model: selectedModel,
          systemPrompt: systemPrompt || buildSystemPrompt(user),
        });
        const newChatId = result.chatId;
        window.history.pushState(null, '', `/c/${newChatId}`);
        return newChatId;
      } catch {
        toast({ title: 'Failed to create new chat.', status: 'error' });
        return null;
      }
    }
    return chatId;
  };

  const handleModelChange = useCallback(
    async (model: string) => {
      if (!user || user.isAnonymous) {
        return;
      }
      if (!chatId) {
        setSelectedModel(model);
        return;
      }
      const oldModel = selectedModel;
      setSelectedModel(model);
      try {
        await updateChatModel({ chatId: chatId as Id<'chats'>, model });
      } catch {
        setSelectedModel(oldModel);
        toast({ title: 'Failed to update chat model', status: 'error' });
      }
    },
    [chatId, selectedModel, user, updateChatModel]
  );

  const handlePersonaSelect = useCallback(
    (prompt: string) => {
      const base = prompt || undefined;
      setPersonaPrompt(base);
      setSystemPrompt(buildSystemPrompt(user, base));
    },
    [user]
  );

  const uploadAndSaveFile = async (
    file: File,
    chatIdForUpload: Id<'chats'>
  ) => {
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const { storageId } = await response.json();
      return await saveFileAttachment({
        storageId,
        chatId: chatIdForUpload,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
    } catch (uploadError) {
      const friendly = humaniseUploadError(uploadError);
      toast({ title: friendly, status: 'error' });
      return null;
    }
  };

  // Helper function to validate input
  const validateInput = (inputMessage: string): boolean => {
    if (!inputMessage.trim() && files.length === 0) {
      return false;
    }

    if (!user?._id) {
      toast({ title: 'User not found. Please sign in.', status: 'error' });
      return false;
    }

    if (inputMessage.length > MESSAGE_MAX_LENGTH) {
      toast({
        title: `Message is too long (max ${MESSAGE_MAX_LENGTH} chars).`,
        status: 'error',
      });
      return false;
    }

    return true;
  };

  // Helper function to send message without files
  const sendMessageWithoutFiles = (
    inputMessage: string,
    currentChatId: string,
    opts?: { body?: { enableSearch?: boolean } }
  ) => {
    const isReasoningModel = supportsReasoningEffort(selectedModel);
    setIsSubmitting(true);

    try {
      const options = {
        body: {
          chatId: currentChatId,
          model: selectedModel,
          systemPrompt: systemPrompt || buildSystemPrompt(user),
          ...(opts?.body && typeof opts.body.enableSearch !== 'undefined'
            ? { enableSearch: opts.body.enableSearch }
            : {}),
          ...(isReasoningModel ? { reasoningEffort } : {}),
        },
      };

      append(
        {
          role: 'user',
          content: inputMessage,
        },
        options
      ).catch(() => {
        toast({ title: 'Failed to send message', status: 'error' });
      });
    } catch {
      toast({ title: 'Failed to send message', status: 'error' });
    }

    setIsSubmitting(false);
  };

  // Helper function to handle file uploads
  const uploadFilesInParallel = async (
    filesToUpload: File[],
    currentChatId: Id<'chats'>
  ) => {
    const vercelAiAttachments: Array<{
      name: string;
      contentType: string;
      url: string;
      storageId: string;
    }> = [];

    const uploadPromises = filesToUpload.map((file) =>
      uploadAndSaveFile(file, currentChatId)
    );
    const uploadResults = await Promise.all(uploadPromises);

    // Process upload results sequentially to avoid await in loop
    const urlPromises = uploadResults.map(async (attachment) => {
      if (!attachment) {
        return null;
      }

      try {
        const url = await convex.query(api.files.getStorageUrl, {
          storageId: attachment.storageId,
        });
        if (url) {
          return {
            name: attachment.fileName,
            contentType: attachment.fileType,
            url,
            storageId: attachment.storageId,
          };
        }
      } catch {
        // Failed to generate URL for this attachment
        return null;
      }

      return null;
    });

    const urlResults = await Promise.all(urlPromises);

    for (const attachment of urlResults) {
      if (attachment) {
        vercelAiAttachments.push(attachment);
      }
    }

    return vercelAiAttachments;
  };

  // Helper function to send message with files
  const sendMessageWithFiles = async (
    inputMessage: string,
    currentChatId: string,
    filesToUpload: File[],
    opts?: { body?: { enableSearch?: boolean } }
  ) => {
    // Create optimistic attachments using blob URLs
    const optimisticAttachments = filesToUpload.map((file) => ({
      name: file.name,
      contentType: file.type,
      url: URL.createObjectURL(file),
    }));

    // Generate a simple placeholder ID based on timestamp
    const placeholderId = `placeholder-${Date.now()}`;

    // Insert optimistic placeholder message so UI doesn't look empty
    setMessages((cur) => [
      ...cur,
      {
        id: placeholderId,
        role: 'user' as const,
        content: inputMessage,
        createdAt: new Date(),
        experimental_attachments:
          optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
      },
    ]);

    setIsSubmitting(true);

    try {
      const vercelAiAttachments = await uploadFilesInParallel(
        filesToUpload,
        currentChatId as Id<'chats'>
      );

      const isReasoningModel = supportsReasoningEffort(selectedModel);
      const options = {
        body: {
          chatId: currentChatId,
          model: selectedModel,
          systemPrompt: systemPrompt || buildSystemPrompt(user),
          ...(opts?.body && typeof opts.body.enableSearch !== 'undefined'
            ? { enableSearch: opts.body.enableSearch }
            : {}),
          ...(isReasoningModel ? { reasoningEffort } : {}),
        },
        experimental_attachments:
          vercelAiAttachments.length > 0 ? vercelAiAttachments : undefined,
      };

      // Remove placeholder before sending real message
      setMessages((cur) => cur.filter((m) => m.id !== placeholderId));

      append(
        {
          role: 'user',
          content: inputMessage,
          experimental_attachments:
            vercelAiAttachments.length > 0 ? vercelAiAttachments : undefined,
        },
        options
      ).catch(() => {
        toast({ title: 'Failed to send message', status: 'error' });
      });
    } catch {
      toast({ title: 'Failed to send message', status: 'error' });
      // Remove placeholder on error as well
      setMessages((cur) => cur.filter((m) => m.id !== placeholderId));
    }

    setIsSubmitting(false);
  };

  const submit = async (
    inputMessage: string,
    opts?: { body?: { enableSearch?: boolean } }
  ) => {
    if (!validateInput(inputMessage)) {
      return;
    }

    const allowed = await checkLimitsAndNotify();
    if (!allowed) {
      return;
    }

    const currentChatId = await ensureChatExists(inputMessage);
    if (!currentChatId) {
      return;
    }

    // Save reference to files before clearing
    const filesToUpload = [...files];

    // Clear files immediately for better UX
    setFiles([]);

    // If no files, send message immediately
    if (filesToUpload.length === 0) {
      sendMessageWithoutFiles(inputMessage, currentChatId, opts);
      return;
    }

    // Path WITH file uploads
    await sendMessageWithFiles(
      inputMessage,
      currentChatId,
      filesToUpload,
      opts
    );
  };

  // Optimized callbacks using useRef to avoid dependency on messages array
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const handleBranch = useCallback(
    async (messageId: string) => {
      if (!(chatId && user?._id)) {
        toast({
          title: 'Unable to branch chat. Please try again.',
          status: 'error',
        });
        return;
      }

      if (isBranching) {
        return;
      }

      setIsBranching(true);

      try {
        const result = await branchChat({
          originalChatId: chatId as Id<'chats'>,
          branchFromMessageId: messageId as Id<'messages'>,
        });

        // Navigate to the new branched chat
        router.push(`/c/${result.chatId}`);

        toast({
          title: 'Chat branched successfully',
          status: 'success',
        });
      } catch (branchError: unknown) {
        const errorMessage = processBranchError(branchError);
        toast({
          title: errorMessage,
          status: 'error',
        });
      } finally {
        setIsBranching(false);
      }
    },
    [chatId, user, branchChat, router, isBranching]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      // Build an optimistically updated list that mimics server deletion of the
      // target message *and* ALL subsequent messages (matching backend behavior).
      const buildOptimisticList = (
        msgList: typeof messages,
        targetId: string
      ) => {
        const idx = msgList.findIndex((m) => m.id === targetId);
        if (idx === -1) {
          return msgList; // fallback – shouldn't happen
        }

        // Remove the target message and ALL subsequent messages
        // This matches the backend deleteMessageAndDescendants behavior
        return msgList.slice(0, idx);
      };

      const currentMessages = messagesRef.current;
      const originalMessages = [...currentMessages];
      const filteredMessages = buildOptimisticList(originalMessages, id);
      setMessages(filteredMessages); // Optimistic update (user + assistant)
      setIsDeleting(true);

      try {
        const result = await deleteMessage({ messageId: id as Id<'messages'> });
        if (result.chatDeleted) {
          router.push('/');
        } else {
          setIsDeleting(false);
        }
      } catch {
        setMessages(originalMessages); // Rollback on error
        toast({ title: 'Failed to delete message', status: 'error' });
        setIsDeleting(false);
      }
    },
    [deleteMessage, router, setIsDeleting, setMessages]
  );

  const handleEdit = useCallback(
    (id: string, newText: string) => {
      // This is a client-side only edit for now, as there's no backend mutation for it yet.
      const currentMessages = messagesRef.current;
      setMessages(
        currentMessages.map((message) =>
          message.id === id ? { ...message, content: newText } : message
        )
      );
    },
    [setMessages]
  );

  const handleReload = useCallback(
    async (messageId: string, opts?: { enableSearch?: boolean }) => {
      if (!(user?._id && chatId)) {
        return;
      }

      // 1. Optimistically remove all messages that come *after* the one being reloaded so
      //    they disappear from the UI immediately.
      const currentMessages = messagesRef.current;
      const originalMessages = [...currentMessages];
      const targetIdx = originalMessages.findIndex((m) => m.id === messageId);
      if (targetIdx === -1) {
        return;
      }
      const trimmedMessages = originalMessages.slice(0, targetIdx + 1);
      setMessages(trimmedMessages);

      // 2. Persist the deletion of the following messages in the DB by invoking the existing
      //    deleteMessageAndDescendants mutation on the first message *after* the target (if any).
      const firstFollowing = originalMessages[targetIdx + 1];
      if (firstFollowing) {
        setIsDeleting(true);
        try {
          await deleteMessage({
            messageId: firstFollowing.id as Id<'messages'>,
          });
        } catch {
          // Roll back optimistic update if the deletion fails
          setMessages(originalMessages);
          toast({
            title: 'Failed to delete messages for reload',
            status: 'error',
          });
        } finally {
          setIsDeleting(false);
        }
      }

      // 3. Trigger the assistant reload once the slate after the target message is clean.
      const options = {
        body: {
          chatId,
          model: selectedModel,
          systemPrompt: systemPrompt || buildSystemPrompt(user),
          reloadAssistantMessageId: messageId,
          ...(opts && typeof opts.enableSearch !== 'undefined'
            ? { enableSearch: opts.enableSearch }
            : {}),
        },
      };
      reload(options);
    },
    [
      user,
      chatId,
      setMessages,
      deleteMessage,
      selectedModel,
      systemPrompt,
      reload,
      setIsDeleting,
    ]
  );

  // Silent fallback redirect if chat somehow becomes inaccessible after initial
  // server validation (e.g., the chat is deleted in another tab).
  useEffect(() => {
    if (!isUserLoading && chatId && currentChat === null && !isDeleting) {
      router.replace('/');
    }
  }, [chatId, currentChat, isUserLoading, router, isDeleting]);

  // Use user's preferred model when starting a brand-new chat
  useEffect(() => {
    if (!chatId && user?.preferredModel) {
      setSelectedModel(user.preferredModel);
    }
  }, [user?.preferredModel, chatId]);

  const targetMessageId = searchParams.get('m');
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    if (targetMessageId) {
      hasScrolledRef.current = false;
    }
  }, [targetMessageId]);

  useEffect(() => {
    if (!targetMessageId || hasScrolledRef.current || messages.length === 0) {
      return;
    }
    const el = document.getElementById(targetMessageId);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      hasScrolledRef.current = true;
    }
  }, [targetMessageId, messages]);

  if (currentChat === null && chatId) {
    return null; // Render nothing while redirecting
  }

  return (
    <div
      className={cn(
        '@container/main relative flex h-full flex-col items-center justify-end md:justify-center'
      )}
    >
      <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} />
      <AnimatePresence initial={false} mode="popLayout">
        {!chatId && messages.length === 0 ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute bottom-[60%] mx-auto max-w-[50rem] md:relative md:bottom-auto"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="onboarding"
            layout="position"
            layoutId="onboarding"
            transition={{ layout: { duration: 0 } }}
          >
            <h1 className="mb-6 font-medium text-3xl tracking-tight">
              {(() => {
                const displayName = getDisplayName(user);
                return displayName
                  ? `What's on your mind, ${displayName}?`
                  : "What's on your mind?";
              })()}
            </h1>
          </motion.div>
        ) : (
          <Conversation
            autoScroll={!targetMessageId}
            key="conversation"
            messages={messages}
            onBranch={handleBranch}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReload={handleReload}
            status={status}
          />
        )}
      </AnimatePresence>
      <motion.div
        className={cn(
          'relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl'
        )}
        layout="position"
        layoutId="chat-input-container"
        transition={{ layout: { duration: messages.length === 1 ? 0.3 : 0 } }}
      >
        <ChatInput
          files={files}
          hasSuggestions={!chatId && messages.length === 0}
          isReasoningModel={supportsReasoningEffort(selectedModel)}
          isSubmitting={isSubmitting || status === 'streaming'}
          isUserAuthenticated={isAuthenticated}
          onFileRemoveAction={(file: File) =>
            setFiles((prev) => prev.filter((f) => f !== file))
          }
          onFileUploadAction={(newFiles: File[]) =>
            setFiles((prev) => [...prev, ...newFiles])
          }
          onSelectModelAction={handleModelChange}
          onSelectReasoningEffortAction={setReasoningEffort}
          onSelectSystemPromptAction={handlePersonaSelect}
          onSendAction={(
            message: string,
            { enableSearch }: { enableSearch: boolean }
          ) => submit(message, { body: { enableSearch } })}
          onSuggestionAction={(suggestion: string) =>
            append({ role: 'user', content: suggestion })
          }
          reasoningEffort={reasoningEffort}
          selectedModel={selectedModel}
          status={status}
          stopAction={stop}
          systemPrompt={personaPrompt}
        />
      </motion.div>
    </div>
  );
}
