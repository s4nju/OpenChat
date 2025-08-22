'use client';

import { type UIMessage, useChat } from '@ai-sdk/react';
import { convexQuery } from '@convex-dev/react-query';
import { useQuery as useTanStackQuery } from '@tanstack/react-query';
import { DefaultChatTransport, type FileUIPart } from 'ai';
import { useConvex } from 'convex/react';
import { AnimatePresence, motion } from 'motion/react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import {
  Conversation,
  type MessageWithExtras,
} from '@/app/components/chat/conversation';
import { ChatInput } from '@/app/components/chat-input/chat-input';
import { useChatOperations } from '@/app/hooks/use-chat-operations';
import { useChatValidation } from '@/app/hooks/use-chat-validation';
import { useDocumentTitle } from '@/app/hooks/use-document-title';
import { useFileHandling } from '@/app/hooks/use-file-handling';
import { useChatSession } from '@/app/providers/chat-session-provider';
import { useUser } from '@/app/providers/user-provider';
import { toast } from '@/components/ui/toast';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import { createChatErrorHandler } from '@/lib/chat-error-utils';
import { MODEL_DEFAULT } from '@/lib/config';
import {
  createPlaceholderId,
  mapMessage,
  validateInput,
} from '@/lib/message-utils';
import {
  createModelValidator,
  supportsReasoningEffort,
} from '@/lib/model-utils';
import { TRANSITION_LAYOUT } from '@/lib/motion';
import { API_ROUTE_CHAT } from '@/lib/routes';
import {
  getDisplayName,
  getUserTimezone,
  isUserAuthenticated,
} from '@/lib/user-utils';
import { cn } from '@/lib/utils';

// Schema for chat body
const ChatBodySchema = z.object({
  chatId: z.string(),
  model: z.string(),
  personaId: z.string().optional(),
  enableSearch: z.boolean().optional(),
  reasoningEffort: z.enum(['low', 'medium', 'high']).optional(),
  userInfo: z
    .object({
      timezone: z.string().optional(),
    })
    .optional(),
  enabledToolSlugs: z.array(z.string()).optional(),
});

type ChatBody = z.infer<typeof ChatBodySchema>;

// Dynamic imports
const DialogAuth = dynamic(
  () => import('./dialog-auth').then((mod) => mod.DialogAuth),
  { ssr: false }
);

export default function Chat() {
  const { chatId, isDeleting, setIsDeleting } = useChatSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    hasPremium,
    isLoading: isUserLoading,
    hasApiKey,
    isApiKeysLoading,
    connectors,
  } = useUser();

  // Initialize utilities
  const getValidModel = useMemo(() => createModelValidator(), []);
  const _convex = useConvex();

  // Get enabled tool slugs from connected integrations
  const enabledToolSlugs = useMemo(() => {
    if (!connectors || connectors.length === 0) {
      return [];
    }

    return connectors
      .filter((connector) => connector.isConnected && connector.type)
      .map((connector) => connector.type.toUpperCase());
  }, [connectors]);

  // Custom hooks
  const {
    handleCreateChat,
    handleModelChange: handleModelUpdate,
    handleBranch,
    handleDeleteMessage,
  } = useChatOperations();

  const { checkRateLimits, validateModelAccess, validateSearchQuery } =
    useChatValidation();

  const {
    files,
    addFiles,
    removeFile,
    clearFiles,
    processFiles,
    createOptimisticFiles,
    hasFiles,
  } = useFileHandling();

  // Local state
  const [hasDialogAuth, setHasDialogAuth] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<
    'low' | 'medium' | 'high'
  >('low');
  const [tempPersonaId, setTempPersonaId] = useState<string | undefined>();
  const [tempSelectedModel, setTempSelectedModel] = useState<
    string | undefined
  >();
  const processedUrl = useRef(false);

  // Data queries
  const { data: messagesFromDB } = useTanStackQuery({
    ...convexQuery(
      api.messages.getMessagesForChat,
      chatId ? { chatId: chatId as Id<'chats'> } : 'skip'
    ),
    enabled: Boolean(chatId),
  });

  const { data: currentChat } = useTanStackQuery({
    ...convexQuery(
      api.chats.getChat,
      chatId ? { chatId: chatId as Id<'chats'> } : 'skip'
    ),
    enabled: Boolean(chatId),
  });

  // Derived state
  const selectedModel = useMemo(() => {
    if (currentChat?.model) {
      return getValidModel(currentChat.model, user?.disabledModels);
    }
    const preferredModel =
      tempSelectedModel ?? user?.preferredModel ?? MODEL_DEFAULT;
    return getValidModel(preferredModel, user?.disabledModels);
  }, [
    currentChat?.model,
    tempSelectedModel,
    user?.preferredModel,
    user?.disabledModels,
    getValidModel,
  ]);

  const personaId = currentChat?.personaId ?? tempPersonaId;
  const isAuthenticated = isUserAuthenticated(user);

  // Enhanced useChat hook with AI SDK best practices
  const { messages, status, regenerate, stop, setMessages, sendMessage } =
    useChat({
      transport: new DefaultChatTransport({
        api: API_ROUTE_CHAT,
        // Global configuration
        headers: {
          'Content-Type': 'application/json',
        },
      }),
      // AI SDK error handling
      onError: createChatErrorHandler(),
    });

  // Message synchronization effect - optimized to prevent infinite re-renders
  useEffect(() => {
    if (
      (status !== 'ready' && status !== 'error') ||
      !messagesFromDB ||
      isDeleting
    ) {
      return;
    }

    const mappedDb = messagesFromDB.map(mapMessage);

    // Use functional update to access current messages without creating a dependency
    setMessages((currentMessages) => {
      // Early return if DB is empty
      if (mappedDb.length === 0) {
        return currentMessages;
      }

      // Check if we need to update at all by comparing lengths and IDs
      if (
        mappedDb.length === currentMessages.length &&
        mappedDb.every((dbMsg, idx) => dbMsg.id === currentMessages[idx]?.id)
      ) {
        return currentMessages; // No change needed - prevents unnecessary re-renders
      }

      if (mappedDb.length >= currentMessages.length) {
        // DB is up-to-date or ahead – merge to preserve streaming properties
        const merged = mappedDb.map((dbMsg: UIMessage, idx: number) => {
          const prev = currentMessages[idx];
          if (prev?.parts && !dbMsg.parts) {
            return { ...dbMsg, parts: prev.parts };
          }
          return dbMsg;
        });
        return merged;
      }
      if (mappedDb.length > 0) {
        // DB is behind: merge IDs for the portion we have without dropping optimistic messages
        const merged = currentMessages.map((msg, idx) => {
          if (idx < mappedDb.length) {
            const dbMsg = mappedDb[idx];
            return {
              ...msg,
              id: dbMsg.id,
              parts: msg.parts ?? dbMsg.parts,
            };
          }
          return msg;
        });
        return merged;
      }

      return currentMessages;
    });
  }, [messagesFromDB, status, setMessages, isDeleting]);

  // Reset state for new chats
  useEffect(() => {
    if ((status === 'ready' || status === 'error') && !chatId) {
      setMessages([]);
      setTempPersonaId(undefined);
      setTempSelectedModel(undefined);
    }
  }, [status, chatId, setMessages]);

  // Core message sending function
  const sendMessageHelper = useCallback(
    async (
      inputMessage: string,
      currentChatId?: string,
      options?: { enableSearch?: boolean }
    ) => {
      const chatIdToUse = currentChatId || chatId;
      if (!chatIdToUse) {
        return;
      }

      const isReasoningModel = supportsReasoningEffort(selectedModel);
      const timezone = getUserTimezone();

      const body: ChatBody = {
        chatId: chatIdToUse,
        model: selectedModel,
        personaId,
        ...(typeof options?.enableSearch !== 'undefined'
          ? { enableSearch: options.enableSearch }
          : {}),
        ...(isReasoningModel ? { reasoningEffort } : {}),
        ...(timezone ? { userInfo: { timezone } } : {}),
        ...(enabledToolSlugs.length > 0 ? { enabledToolSlugs } : {}),
      };

      // Handle files if present
      let attachments: FileUIPart[] | undefined;
      if (hasFiles) {
        const optimisticAttachments = createOptimisticFiles();
        const placeholderId = createPlaceholderId();

        // Add optimistic message
        setMessages((cur) => [
          ...cur,
          {
            id: placeholderId,
            role: 'user' as const,
            parts: [
              { type: 'text', text: inputMessage },
              ...optimisticAttachments,
            ],
          },
        ]);

        try {
          attachments = await processFiles(chatIdToUse as Id<'chats'>);
          // Remove placeholder
          setMessages((cur) => cur.filter((m) => m.id !== placeholderId));
        } catch {
          setMessages((cur) => cur.filter((m) => m.id !== placeholderId));
          toast({ title: 'Failed to upload files', status: 'error' });
          return;
        }
      }

      // Send message with AI SDK
      try {
        const messageParts = [
          { type: 'text' as const, text: inputMessage },
          ...(attachments || []),
        ];

        await sendMessage({ parts: messageParts, role: 'user' }, { body });
      } catch {
        toast({ title: 'Failed to send message', status: 'error' });
      }
    },
    [
      chatId,
      selectedModel,
      personaId,
      reasoningEffort,
      hasFiles,
      createOptimisticFiles,
      processFiles,
      sendMessage,
      setMessages,
      enabledToolSlugs,
    ]
  );

  // URL parameter processing
  useEffect(() => {
    if (isUserLoading || isApiKeysLoading || !user || processedUrl.current) {
      return;
    }

    const modelId = searchParams.get('model');
    const query = searchParams.get('q');

    if (modelId && query) {
      processedUrl.current = true;

      const trimmedQuery = validateSearchQuery(query);
      if (!trimmedQuery) {
        return;
      }

      if (!validateModelAccess(modelId, user, hasPremium, hasApiKey)) {
        return;
      }

      const startChat = async () => {
        try {
          const newChatId = await handleCreateChat(
            trimmedQuery,
            modelId,
            personaId
          );
          if (newChatId) {
            window.history.pushState(null, '', `/c/${newChatId}`);
            await sendMessageHelper(trimmedQuery, newChatId, {
              enableSearch: false,
            });
          }
        } catch {
          toast({ title: 'Failed to create chat', status: 'error' });
        }
      };

      startChat();
    }
  }, [
    isUserLoading,
    isApiKeysLoading,
    user,
    searchParams,
    hasPremium,
    hasApiKey,
    handleCreateChat,
    personaId,
    validateSearchQuery,
    validateModelAccess,
    sendMessageHelper,
  ]);

  // Main submit handler
  const submit = useCallback(
    async (
      inputMessage: string,
      opts?: { body?: { enableSearch?: boolean } }
    ) => {
      if (!validateInput(inputMessage, files.length, user?._id)) {
        return;
      }

      const allowed = checkRateLimits(isAuthenticated, setHasDialogAuth);
      if (!allowed) {
        return;
      }

      let currentChatId = chatId;

      // Create chat if needed
      if (!currentChatId && messages.length === 0 && inputMessage) {
        currentChatId = await handleCreateChat(
          inputMessage,
          selectedModel,
          personaId
        );
        if (!currentChatId) {
          return;
        }

        window.history.pushState(null, '', `/c/${currentChatId}`);
        setTempSelectedModel(undefined);
        setTempPersonaId(undefined);
      }

      clearFiles();
      await sendMessageHelper(
        inputMessage,
        currentChatId || undefined,
        opts?.body
      );
    },
    [
      files.length,
      user?._id,
      checkRateLimits,
      isAuthenticated,
      chatId,
      messages.length,
      handleCreateChat,
      selectedModel,
      personaId,
      clearFiles,
      sendMessageHelper,
    ]
  );

  // Model change handler
  const handleModelChange = useCallback(
    async (model: string) => {
      if (!user || user.isAnonymous) {
        return;
      }

      if (!chatId) {
        setTempSelectedModel(model);
        return;
      }

      await handleModelUpdate(chatId, model, user);
    },
    [chatId, user, handleModelUpdate]
  );

  // Message handlers
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  const handleDelete = useCallback(
    async (id: string) => {
      const currentMessages = messagesRef.current;
      const originalMessages = [...currentMessages];
      const idx = originalMessages.findIndex((m) => m.id === id);

      if (idx === -1) {
        return;
      }

      const filteredMessages = originalMessages.slice(0, idx);
      setMessages(filteredMessages);
      setIsDeleting(true);

      try {
        const result = await handleDeleteMessage(id);
        if (result?.chatDeleted) {
          router.push('/');
        } else {
          setIsDeleting(false);
        }
      } catch {
        setMessages(originalMessages);
        setIsDeleting(false);
      }
    },
    [handleDeleteMessage, router, setIsDeleting, setMessages]
  );

  const handleEdit = useCallback(
    (id: string, newText: string) => {
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

      const currentMessages = messagesRef.current;
      const originalMessages = [...currentMessages];
      const targetIdx = originalMessages.findIndex((m) => m.id === messageId);

      if (targetIdx === -1) {
        return;
      }

      const trimmedMessages = originalMessages.slice(0, targetIdx + 1);
      setMessages(trimmedMessages);

      const firstFollowing = originalMessages[targetIdx + 1];
      if (firstFollowing) {
        setIsDeleting(true);
        try {
          await handleDeleteMessage(firstFollowing.id);
        } catch {
          setMessages(originalMessages);
          toast({
            title: 'Failed to delete messages for reload',
            status: 'error',
          });
        } finally {
          setIsDeleting(false);
        }
      }

      const isReasoningModel = supportsReasoningEffort(selectedModel);
      const timezone = getUserTimezone();

      const options = {
        body: {
          chatId,
          model: selectedModel,
          personaId,
          reloadAssistantMessageId: messageId,
          ...(typeof opts?.enableSearch !== 'undefined'
            ? { enableSearch: opts.enableSearch }
            : {}),
          ...(isReasoningModel ? { reasoningEffort } : {}),
          ...(timezone ? { userInfo: { timezone } } : {}),
          ...(enabledToolSlugs.length > 0 ? { enabledToolSlugs } : {}),
        },
      };
      regenerate(options);
    },
    [
      user,
      chatId,
      selectedModel,
      personaId,
      reasoningEffort,
      setMessages,
      handleDeleteMessage,
      setIsDeleting,
      regenerate,
      enabledToolSlugs,
    ]
  );

  // Chat redirect effect
  useEffect(() => {
    if (!isUserLoading && chatId && currentChat === null && !isDeleting) {
      router.replace('/');
    }
  }, [chatId, currentChat, isUserLoading, router, isDeleting]);

  // Document title update
  useDocumentTitle(currentChat?.title, chatId || undefined);

  // Message scrolling
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

  // Early return for redirect
  if (currentChat === null && chatId) {
    return null;
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
            messages={messages as MessageWithExtras[]}
            onBranch={(messageId) =>
              chatId && handleBranch(chatId, messageId, user)
            }
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReload={handleReload}
            selectedModel={selectedModel}
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
        transition={{
          layout: {
            ...TRANSITION_LAYOUT,
            duration: messages.length === 1 ? 0.2 : 0,
          },
        }}
      >
        <ChatInput
          files={files}
          hasSuggestions={!chatId && messages.length === 0}
          isReasoningModel={supportsReasoningEffort(selectedModel)}
          isSubmitting={status === 'streaming'}
          isUserAuthenticated={isAuthenticated}
          onFileRemoveAction={removeFile}
          onFileUploadAction={addFiles}
          onSelectModelAction={handleModelChange}
          onSelectReasoningEffortAction={setReasoningEffort}
          onSelectSystemPromptAction={(id: string) => setTempPersonaId(id)}
          onSendAction={(
            message: string,
            { enableSearch }: { enableSearch: boolean }
          ) => submit(message, { body: { enableSearch } })}
          onSuggestionAction={(suggestion: string) =>
            sendMessage({ text: suggestion })
          }
          reasoningEffort={reasoningEffort}
          selectedModel={selectedModel}
          selectedPersonaId={personaId}
          status={status}
          stopAction={stop}
        />
      </motion.div>
    </div>
  );
}
