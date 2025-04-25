"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { useUser } from "@/app/providers/user-provider"
import { toast } from "@/components/ui/toast"
import { checkRateLimits, createGuestUser } from "@/lib/api"
import { useChats } from "@/lib/chat-store/chats/provider"
import { updateChatTimestamp } from "@/lib/chat-store/chats/api"
import { useMessages } from "@/lib/chat-store/messages/provider"
import {
  MESSAGE_MAX_LENGTH,
  MODEL_DEFAULT,
  REMAINING_QUERY_ALERT_THRESHOLD,
  SYSTEM_PROMPT_DEFAULT,
} from "@/lib/config"
import {
  Attachment,
  checkFileUploadLimit,
  processFiles,
} from "@/lib/file-handling"
import { API_ROUTE_CHAT } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { redirect } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createIdGenerator } from 'ai';
import { useChatSession } from "@/app/providers/chat-session-provider"

const FeedbackWidget = dynamic(
  () => import("./feedback-widget").then((mod) => mod.FeedbackWidget),
  { ssr: false }
)

const DialogAuth = dynamic(
  () => import("./dialog-auth").then((mod) => mod.DialogAuth),
  { ssr: false }
)

const generateCustomId = createIdGenerator({
  prefix: 'user',
  separator: '-',
});

export default function Chat() {
  const { chatId } = useChatSession()
  const {
    createNewChat,
    getChatById,
    updateChatModel,
    isLoading: isChatsLoading,
  } = useChats()
  const currentChat = chatId ? getChatById(chatId) : null
  const { messages: initialMessages, cacheAndAddMessage, deleteMessage, truncateMessages } = useMessages()
  const { user } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [selectedModel, setSelectedModel] = useState(
    currentChat?.model || user?.preferred_model || MODEL_DEFAULT
  )
  const [systemPrompt, setSystemPrompt] = useState(
    currentChat?.system_prompt || SYSTEM_PROMPT_DEFAULT
  )
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])
  const isAuthenticated = !!user?.id

  const {
    messages,
    input,
    handleSubmit,
    status,
    error,
    reload,
    stop,
    setMessages,
    setInput,
    append,
    data
  } = useChat({
    api: API_ROUTE_CHAT,
    initialMessages,
    generateId: () => generateCustomId()
  })

  // when chatId is null, set messages to an empty array
  useEffect(() => {
    if (chatId === null) {
      setMessages([])
    }
  }, [chatId])

  useEffect(() => {
    if (currentChat?.system_prompt) {
      setSystemPrompt(currentChat?.system_prompt)
    }
  }, [currentChat])


  // Use a ref to track processed data items to avoid infinite loops
  const processedDataRef = useRef<Set<string>>(new Set());

  // Process streamed message IDs from backend
  useEffect(() => {
    if (!chatId || !data || data.length === 0) return

    // Get the latest data item
    const streamData = data[data.length - 1]

    // Generate a signature for this data item to track if we've processed it
    const dataSignature = JSON.stringify(streamData);

    // Skip if we've already processed this exact data
    if (processedDataRef.current.has(dataSignature)) {
      return;
    }

    //console.log("Processing new streamed data:", streamData)

    // Extract the message IDs if they exist - handle JSON values correctly
    let userMsgId: string | undefined;
    let assistantMsgId: string | undefined;

    // Type guard to check if streamData is an object with potential ID properties
    if (streamData && typeof streamData === 'object' && streamData !== null) {
      // Safe type assertion for message IDs
      userMsgId = 'userMsgId' in streamData ? String(streamData.userMsgId) : undefined;
      assistantMsgId = 'assistantMsgId' in streamData ? String(streamData.assistantMsgId) : undefined;
    }

    // Skip if no IDs are present
    if (!userMsgId && !assistantMsgId) {
      return;
    }

    // Mark this data as processed to prevent infinite loops
    processedDataRef.current.add(dataSignature);

    const updateMessage = async () => {
      // Take a snapshot of current messages to work with
      const currentMessages = [...messages];
      //console.log("Current messages:", currentMessages)

      // If we received a user message ID from the backend
      if (userMsgId) {
        // Find the optimistic user message and update its ID
        const optimisticIdx = currentMessages.findIndex(
          (m) => m.role === 'user' && m.id.toString().startsWith('user-')
        )

        if (optimisticIdx !== -1) {
          const optimisticMsg = currentMessages[optimisticIdx]
          //console.log(`Updating optimistic user message ${optimisticMsg.id} to real ID ${userMsgId}`)
          // Create updated message with real backend ID
          const updatedMsg = {
            ...optimisticMsg,
            id: userMsgId,
            model: selectedModel,
          }
          // Persist to IndexedDB and state
          setMessages((prev) =>
            prev.map((m) =>
              m.id === optimisticMsg.id ? updatedMsg : m
            )
          )
          await cacheAndAddMessage(updatedMsg)
        }
      }

      // If we received an assistant message ID
      if (assistantMsgId) {
        // Find the most recent assistant message
        const assistantIdx = [...currentMessages].reverse().findIndex(
          (m) => m.role === 'assistant'
        )

        if (assistantIdx !== -1) {
          // This is messages.length - 1 - assistantIdx due to the reversed search
          const actualIdx = currentMessages.length - 1 - assistantIdx
          const assistantMsg = currentMessages[actualIdx] as any;
          // Always update assistant message if it immediately follows a deleted user message
          // or if its parent_message_id matches the user message ID
          if (assistantMsg.id !== assistantMsgId ||
            (assistantMsg.parent_message_id && assistantMsg.parent_message_id === userMsgId) ||
            (assistantIdx === 0 && currentMessages.length > 1 && (currentMessages[1] as any).role === 'user')) {
            // Always set parent_message_id for assistant messages
            const updatedMsg = {
              ...assistantMsg,
              id: assistantMsgId,
              parent_message_id: userMsgId, // Ensure parent_message_id is always set
              model: selectedModel,
            }
            // Persist to IndexedDB and state
            setMessages((prev) =>
              prev.map((m: any) =>
                m.id === assistantMsg.id ? updatedMsg : m
              )
            )
            await cacheAndAddMessage(updatedMsg)
          }
        }
      }
    }

    updateMessage().catch(err => console.error("Error updating message IDs:", err))
  }, [data, chatId, cacheAndAddMessage, selectedModel]) // Removed messages from deps to avoid infinite loop

  const isFirstMessage = useMemo(() => {
    return messages.length === 0
  }, [messages])

  useEffect(() => {
    if (error) {
      let errorMsg = "Something went wrong."
      try {
        const parsed = JSON.parse(error.message)
        errorMsg = parsed.error || errorMsg
      } catch {
        errorMsg = error.message || errorMsg
      }
      toast({
        title: errorMsg,
        status: "error",
      })
    }
  }, [error])

  const getOrCreateGuestUserId = async (): Promise<string | null> => {
    if (user?.id) {
      return user.id
    }

    const storedGuestId = localStorage.getItem("guestId")
    if (storedGuestId) {
      try {
        await createGuestUser(storedGuestId)
        return storedGuestId
      } catch (validationError) {
        // console.warn(
        //   `[Chat] Stored guestId ${storedGuestId} failed validation or API call failed. Removing it. Error:`,
        //   validationError
        // )
        localStorage.removeItem("guestId")
      }
    }

    try {
      const newGuestId = crypto.randomUUID()
      await createGuestUser(newGuestId)
      localStorage.setItem("guestId", newGuestId)
      return newGuestId
    } catch (creationError) {
      // console.error(
      //   "[Chat] Error during new guest ID generation or creation API call:",
      //   creationError
      // )
      localStorage.removeItem("guestId")
      return null
    }
  }

  const checkLimitsAndNotify = async (uid: string): Promise<boolean> => {
    try {
      const rateData = await checkRateLimits(uid, isAuthenticated)

      if (rateData.remaining === 0 && !isAuthenticated) {
        setHasDialogAuth(true)
        return false
      }

      if (rateData.remaining === REMAINING_QUERY_ALERT_THRESHOLD) {
        toast({
          title: `Only ${rateData.remaining} ${rateData.remaining === 1 ? "query" : "queries"} remaining today.`,
          status: "info",
        })
      }

      return true
    } catch (err) {
      // console.error("Rate limit check failed:", err)
      return false
    }
  }

  const ensureChatExists = async (userId: string) => {
    if (isFirstMessage) {
      try {
        const newChat = await createNewChat(
          userId,
          input,
          selectedModel,
          isAuthenticated,
          systemPrompt
        )
        if (!newChat) return null
        // if (isAuthenticated) {
        window.history.pushState(null, "", `/c/${newChat.id}`)
        // }
        return newChat.id
      } catch (err: any) {
        let errorMessage = "Something went wrong."
        try {
          const parsed = JSON.parse(err.message)
          errorMessage = parsed.error || errorMessage
        } catch {
          errorMessage = err.message || errorMessage
        }
        toast({
          title: errorMessage,
          status: "error",
        })
        return null
      }
    }
    return chatId
  }

  const handleModelChange = useCallback(
    async (model: string) => {
      if (!user?.id) {
        return
      }

      if (!chatId && user?.id) {
        setSelectedModel(model)
        return
      }

      const oldModel = selectedModel

      setSelectedModel(model)

      try {
        await updateChatModel(chatId!, model)
      } catch (err) {
        // console.error("Failed to update chat model:", err)
        setSelectedModel(oldModel)
        toast({
          title: "Failed to update chat model",
          status: "error",
        })
      }
    },
    [chatId]
  )

  const handleFileUploads = async (
    uid: string,
    chatId: string
  ): Promise<Attachment[] | null> => {
    if (files.length === 0) return []

    try {
      await checkFileUploadLimit(uid)
    } catch (err: any) {
      if (err.code === "DAILY_FILE_LIMIT_REACHED") {
        toast({ title: err.message, status: "error" })
        return null
      }
    }

    try {
      const processed = await processFiles(files, chatId, uid)
      setFiles([])
      return processed
    } catch (err) {
      toast({ title: "Failed to process files", status: "error" })
      return null
    }
  }

  const createOptimisticAttachments = (files: File[]) => {
    return files.map((file) => ({
      name: file.name,
      contentType: file.type,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    }))
  }

  const cleanupOptimisticAttachments = (attachments?: any[]) => {
    if (!attachments) return
    attachments.forEach((attachment) => {
      if (attachment.url?.startsWith("blob:")) {
        URL.revokeObjectURL(attachment.url)
      }
    })
  }

  const submit = async (_?: unknown, opts?: { body?: { enableSearch?: boolean } }) => {
    setIsSubmitting(true)

    const uid = await getOrCreateGuestUserId()
    if (!uid) return

    const optimisticId = `optimistic-${Date.now().toString()}`
    const optimisticAttachments =
      files.length > 0 ? createOptimisticAttachments(files) : []

    const optimisticMessage = {
      id: optimisticId,
      content: input,
      role: "user" as const,
      createdAt: new Date(),
      experimental_attachments:
        optimisticAttachments.length > 0 ? optimisticAttachments : undefined,
    }
    //console.log("Adding optimistic message:", optimisticMessage)
    setMessages((prev) => [...prev, optimisticMessage])
    //console.log("Current messages:", messages)
    setInput("")

    const submittedFiles = [...files]
    setFiles([])

    const allowed = await checkLimitsAndNotify(uid)
    if (!allowed) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      setIsSubmitting(false)
      return
    }

    const currentChatId = await ensureChatExists(uid)

    if (!currentChatId) {
      //console.log("No chat ID found for user:", uid)
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      setIsSubmitting(false)
      return
    }

    if (input.length > MESSAGE_MAX_LENGTH) {
      toast({
        title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
        status: "error",
      })
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      setIsSubmitting(false)
      return
    }

    let attachments: Attachment[] | null = []
    if (submittedFiles.length > 0) {
      attachments = await handleFileUploads(uid, currentChatId)
      if (attachments === null) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
        setIsSubmitting(false)
        return
      }
    }

    const options = {
      body: {
        chatId: currentChatId,
        userId: uid,
        model: selectedModel,
        isAuthenticated,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
        ...(opts?.body && typeof opts.body.enableSearch !== 'undefined' ? { enableSearch: opts.body.enableSearch } : {})
      },
      experimental_attachments: attachments || undefined,
    }

    try {
      handleSubmit(undefined, options)
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      //console.log("Optimistic message sent:", optimisticMessage)
      // cacheAndAddMessage(optimisticMessage)

      // Update the chat timestamp in IndexedDB only (skip database update)
      if (currentChatId) {
        updateChatTimestamp(currentChatId, true).catch(err =>
          console.error("Error updating chat timestamp in IndexedDB:", err)
        );
      }
    } catch (error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
      cleanupOptimisticAttachments(optimisticMessage.experimental_attachments)
      toast({ title: "Failed to send message", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Use all hooks at the top level for context/state
  const { setChats, chats } = useChats();

  /**
   * Optimistically delete a message and, if it's the last, the chat as well.
   * Rolls back all state if backend fails. Redirects to '/' if chat deleted.
   */
  const handleDelete = useCallback(async (id: string) => {
    // Save previous state for rollback
    const prevMessages = messages;
    const prevChats = chats;
    const prevChatId = chatId;

    const isLastMessage = messages.length === 1 && messages[0].id === id;
    // Optimistically update state
    setMessages((curr) => {
      // Remove the user message and any assistant reply with parent_message_id === id.
      // As a fallback, if an assistant message immediately follows the deleted user message, remove it as well.
      // Use 'any' to access parent_message_id for quick type error workaround
      let filtered = curr.filter(
        (m: any, idx: number, arr: any[]) => {
          // Remove the user message
          if (m.id === id) return false;
          // Remove assistant reply if parent_message_id matches
          if (m.parent_message_id === id) return false;
          // Fallback: Remove assistant message immediately after the deleted user message
          if (
            idx > 0 &&
            arr[idx - 1].id === id &&
            m.role === 'assistant'
          ) {
            return false;
          }
          return true;
        }
      );
      return filtered.length === 0 ? [] : filtered;
    });

    if (isLastMessage && chatId) {
      setChats((curr) => curr.filter((c) => c.id !== chatId));
      // No setChatId; just redirect to '/' to clear session context
      redirect('/'); // Immediately redirect user
      return;
    }

    try {
      // Call deleteMessage, which may return void or { chatDeleted: boolean }
      const result = await deleteMessage(id);
      // Type guard for chatDeleted result
      function isChatDeletedResult(val: unknown): val is { chatDeleted: boolean } {
        return (
          typeof val === 'object' &&
          val !== null &&
          'chatDeleted' in val &&
          typeof (val as any).chatDeleted === 'boolean'
        );
      }

      // Update the chat timestamp in IndexedDB only (skip database update)
      if (chatId && (!isChatDeletedResult(result) || (isChatDeletedResult(result) && !result.chatDeleted))) {
        updateChatTimestamp(chatId, true).catch(err =>
          console.error("Error updating chat timestamp in IndexedDB during message deletion:", err)
        );
      }

      if (
        isChatDeletedResult(result) &&
        result.chatDeleted &&
        chatId
      ) {
        // No setChatId; just redirect to '/' to clear session context
        redirect('/');
        return;
      }
      // Optionally show undo toast (UX placeholder)
      // toast({ title: "Message deleted", status: "info", action: { label: "Undo", onClick: () => { setMessages(prevMessages); setChats(prevChats); setChatId(prevChatId); } } });
    } catch {
      // Rollback all state
      setMessages(prevMessages);
      setChats(prevChats);
      // No setChatId on rollback; just restore messages and chats
      toast({ title: isLastMessage ? "Failed to delete chat" : "Failed to delete message", status: "error" });
    }
  }, [messages, chats, chatId, setMessages, setChats, deleteMessage, redirect, toast]);

  const handleEdit = useCallback((id: string, newText: string) => {
    setMessages(
      messages.map((message) =>
        message.id === id ? { ...message, content: newText } : message
      )
    )
  }
    , [messages, setMessages]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value)
    },
    [setInput]
  )

  const handleFileUpload = useCallback((newFiles: File[]) => {
    setFiles((prev) => [...prev, ...newFiles])
  }, [])

  const handleFileRemove = useCallback((file: File) => {
    setFiles((prev) => prev.filter((f) => f !== file))
  }, [])

  const handleSuggestion = useCallback(
    async (suggestion: string) => {
      setIsSubmitting(true)
      const optimisticId = `optimistic-${Date.now().toString()}`
      const optimisticMessage = {
        id: optimisticId,
        content: suggestion,
        role: "user" as const,
        createdAt: new Date(),
      }

      setMessages((prev) => [...prev, optimisticMessage])

      const uid = await getOrCreateGuestUserId()

      if (!uid) {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
        setIsSubmitting(false)
        return
      }

      const allowed = await checkLimitsAndNotify(uid)
      if (!allowed) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        setIsSubmitting(false)
        return
      }

      const currentChatId = await ensureChatExists(uid)

      if (!currentChatId) {
        setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))
        setIsSubmitting(false)
        return
      }

      const options = {
        body: {
          chatId: currentChatId,
          userId: uid,
          model: selectedModel,
          isAuthenticated,
          systemPrompt: SYSTEM_PROMPT_DEFAULT,
        },
      }

      append(
        {
          role: "user",
          content: suggestion,
        },
        options
      )
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticId))

      // Update the chat timestamp in IndexedDB only (skip database update)
      if (currentChatId) {
        updateChatTimestamp(currentChatId, true).catch(err =>
          console.error("Error updating chat timestamp in IndexedDB:", err)
        );
      }

      setIsSubmitting(false)
    },
    [ensureChatExists, selectedModel, user?.id, append, checkLimitsAndNotify, getOrCreateGuestUserId, isAuthenticated, setMessages]
  )

  const handleSelectSystemPrompt = useCallback((newSystemPrompt: string) => {
    setSystemPrompt(newSystemPrompt)
  }, [])

  const handleReload = useCallback(async (messageId: string, opts?: { enableSearch?: boolean }) => {
    const uid = await getOrCreateGuestUserId()
    if (!uid) {
      return
    }

    // Truncate IndexedDB cache for messages beyond this point
    await truncateMessages(messageId)
    // Truncate UI messages in the hook to this point
    setMessages((prev) => {
      const idx = prev.findIndex((m) => String(m.id) === String(messageId))
      return idx >= 0 ? prev.slice(0, idx + 1) : prev
    })

    const options = {
      body: {
        chatId,
        userId: uid,
        model: selectedModel,
        isAuthenticated,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
        reloadAssistantMessageId: messageId,
        ...(opts && typeof opts.enableSearch !== 'undefined' ? { enableSearch: opts.enableSearch } : {})
      },
    }

    reload(options)

    // Update the chat timestamp in IndexedDB only (skip database update)
    if (chatId) {
      updateChatTimestamp(chatId, true).catch(err =>
        console.error("Error updating chat timestamp in IndexedDB during reload:", err)
      );
    }
  }, [getOrCreateGuestUserId, chatId, selectedModel, isAuthenticated, systemPrompt, reload, truncateMessages]);

  if (
    hydrated &&
    chatId &&
    !isChatsLoading &&
    !currentChat &&
    messages.length === 0 &&
    !user?.id
  ) {
    return redirect("/")
  }

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col items-center justify-end md:justify-center"
      )}
    >
      <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} />
      <AnimatePresence initial={false} mode="popLayout">
        {!chatId && messages.length === 0 ? (
          <motion.div
            key="onboarding"
            className="absolute bottom-[60%] mx-auto max-w-[50rem] md:relative md:bottom-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            layout="position"
            layoutId="onboarding"
            transition={{
              layout: {
                duration: 0,
              },
            }}
          >
            <h1 className="mb-6 text-3xl font-medium tracking-tight">
              What's on your mind?
            </h1>
          </motion.div>
        ) : (
          (() => {
            const conversationStatus =
              status === "ready" ? "idle" : status;
            return (
              <Conversation
                key="conversation"
                messages={messages}
                status={conversationStatus}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onReload={handleReload}
              />
            );
          })()
        )}
      </AnimatePresence>
      <motion.div
        className={cn(
          "relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl"
        )}
        layout="position"
        layoutId="chat-input-container"
        transition={{
          layout: {
            duration: messages.length === 1 ? 0.3 : 0,
          },
        }}
      >
        <ChatInput
          value={input}
          onSuggestion={handleSuggestion}
          onValueChange={handleInputChange}
          onSend={({ enableSearch }) => submit(undefined, { body: { enableSearch } })}
          isSubmitting={isSubmitting}
          files={files}
          onFileUpload={handleFileUpload}
          onFileRemove={handleFileRemove}
          hasSuggestions={!chatId && messages.length === 0}
          onSelectModel={handleModelChange}
          onSelectSystemPrompt={handleSelectSystemPrompt}
          selectedModel={selectedModel}
          isUserAuthenticated={isAuthenticated}
          systemPrompt={systemPrompt}
          stop={stop}
          status={status}
        />
      </motion.div>
      {/* <FeedbackWidget authUserId={user?.id} /> */}
    </div>
  )
}
