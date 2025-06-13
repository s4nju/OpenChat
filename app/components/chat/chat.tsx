"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { useUser } from "@/app/providers/user-provider"
import { toast } from "@/components/ui/toast"
import {
  MESSAGE_MAX_LENGTH,
  MODEL_DEFAULT,
  REMAINING_QUERY_ALERT_THRESHOLD,
  getSystemPromptDefault,
} from "@/lib/config"
import { API_ROUTE_CHAT } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useChat, type Message } from "@ai-sdk/react"
import { useAction, useMutation, useQuery, useConvex } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { AnimatePresence, motion } from "framer-motion"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useChatSession } from "@/app/providers/chat-session-provider"

const DialogAuth = dynamic(
  () => import("./dialog-auth").then((mod) => mod.DialogAuth),
  { ssr: false }
)

// Helper to map Convex message doc to AI SDK message type
const mapMessage = (msg: Doc<"messages">): Message & { reasoning_text?: string; model?: string } => ({
  id: msg._id,
  role: msg.role as "user" | "assistant",
  content: msg.content,
  createdAt: new Date(msg._creationTime),
  experimental_attachments: msg.experimentalAttachments,
  reasoning_text: msg.reasoningText,
  model: msg.model,
  // Optionally include model if stored in message doc in future
});

export default function Chat() {
  const { chatId, isDeleting, setIsDeleting } = useChatSession()
  const router = useRouter()
  const { user, isLoading: isUserLoading } = useUser()

  // --- Convex Data Hooks ---
  const messagesFromDB = useQuery(
    api.messages.getMessagesForChat,
    chatId ? { chatId: chatId as Id<"chats"> } : "skip"
  )
  const currentChat = useQuery(
    api.chats.getChat,
    chatId ? { chatId: chatId as Id<"chats"> } : "skip"
  )
  const createChat = useMutation(api.chats.createChat)
  const updateChatModel = useMutation(api.chats.updateChatModel)
  const deleteMessage = useMutation(api.messages.deleteMessageAndDescendants)
  const generateUploadUrl = useAction(api.files.generateUploadUrl)
  const saveFileAttachment = useAction(api.files.saveFileAttachment)
  const convex = useConvex()

  // --- Local State ---
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [selectedModel, setSelectedModel] = useState(user?.preferredModel || MODEL_DEFAULT)
  const [systemPrompt, setSystemPrompt] = useState(getSystemPromptDefault())
  const [hydrated, setHydrated] = useState(false)

  const isAuthenticated = !!user && !user.isAnonymous

  // --- Vercel AI SDK useChat Hook ---
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
  } = useChat({
    api: API_ROUTE_CHAT,
    // initialMessages are now set via useEffect
    onResponse: response => {
      // console.log("onResponse", response)
    },
    onFinish: message => {
      // console.log("onFinish", message)
    },
  })

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

  useEffect(() => {
    setHydrated(true)
  }, [])

  // Sync messages from DB to AI SDK state, but only when chat is ready
  useEffect(() => {
    if (status === 'ready' && messagesFromDB) {
      // console.log("Syncing from DB because chat is ready.")
      setMessages(messagesFromDB.map(mapMessage))
    } else if (status === 'ready' && !chatId) {
      // console.log("Setting messages empty")
      setMessages([])
    }
  }, [messagesFromDB, chatId, setMessages, status])

  // Sync chat settings from DB to local state
  useEffect(() => {
    if (currentChat) {
      setSelectedModel(currentChat.model || MODEL_DEFAULT)
      setSystemPrompt(currentChat.systemPrompt || getSystemPromptDefault())
    }
  }, [currentChat])

  // --- Error Handling ---
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

  // --- Core Logic Handlers ---

  const checkLimitsAndNotify = async (): Promise<boolean> => {
    try {
      const rateData = await convex.query(api.users.getRateLimitStatus, {})
      const remaining = rateData.effectiveRemaining
      const plural = remaining === 1 ? "query" : "queries"

      if (remaining === 0 && !isAuthenticated) {
        setHasDialogAuth(true)
        return false
      }

      if (remaining === REMAINING_QUERY_ALERT_THRESHOLD) {
        toast({
          title: `Only ${remaining} ${plural} remaining today.`,
          status: "info",
        })
      }

      return true
    } catch (err) {
      console.error("Rate limit check failed:", err)
      return false
    }
  }

  const ensureChatExists = async () => {
    if (messages.length === 0 && input) {
      try {
        const result = await createChat({
          title: input.substring(0, 50), // Create a title from the first message
          model: selectedModel,
          systemPrompt: systemPrompt || getSystemPromptDefault(),
        })
        const newChatId = result.chatId
        window.history.pushState(null, "", `/c/${newChatId}`)
        return newChatId
      } catch (err: any) {
        toast({ title: "Failed to create new chat.", status: "error" })
        return null
      }
    }
    return chatId
  }

  const handleModelChange = useCallback(
    async (model: string) => {
      if (!user || user.isAnonymous) return
      if (!chatId) {
        setSelectedModel(model)
        return
      }
      const oldModel = selectedModel
      setSelectedModel(model)
      try {
        await updateChatModel({ chatId: chatId as Id<"chats">, model })
      } catch (err) {
        setSelectedModel(oldModel)
        toast({ title: "Failed to update chat model", status: "error" })
      }
    },
    [chatId, user, updateChatModel]
  )

  const uploadAndSaveFile = async (file: File, chatIdForUpload: Id<"chats">) => {
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
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
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({ title: "Error uploading file", status: "error" });
      return null;
    }
  };

  const submit = async (_?: unknown, opts?: { body?: { enableSearch?: boolean } }) => {
    if (!input.trim() && files.length === 0) return
    setIsSubmitting(true)

    if (!user?._id) {
      toast({ title: "User not found. Please sign in.", status: "error" })
      setIsSubmitting(false)
      return
    }

    const allowed = await checkLimitsAndNotify()
    if (!allowed) {
      setIsSubmitting(false)
      return
    }

    const currentChatId = await ensureChatExists()
    if (!currentChatId) {
      setIsSubmitting(false)
      return
    }

    if (input.length > MESSAGE_MAX_LENGTH) {
      toast({ title: `Message is too long (max ${MESSAGE_MAX_LENGTH} chars).`, status: "error" })
      setIsSubmitting(false)
      return
    }

    const vercelAiAttachments = []
    if (files.length > 0) {
      for (const file of files) {
        const newAttachment = await uploadAndSaveFile(file, currentChatId as Id<"chats">)
        if (newAttachment) {
          vercelAiAttachments.push({
            name: newAttachment.fileName,
            contentType: newAttachment.fileType,
            url: newAttachment.url!,
          })
        }
      }
      setFiles([])
    }

    const options = {
      body: {
        chatId: currentChatId,
        model: selectedModel,
        systemPrompt: systemPrompt || getSystemPromptDefault(),
        ...(opts?.body && typeof opts.body.enableSearch !== 'undefined' ? { enableSearch: opts.body.enableSearch } : {})
      },
      experimental_attachments: vercelAiAttachments.length > 0 ? vercelAiAttachments : undefined,
    }

    try {
      handleSubmit(undefined, options)
    } catch (error) {
      toast({ title: "Failed to send message", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = useCallback(
    async (id: string) => {
      const originalMessages = [...messages]
      const filteredMessages = originalMessages.filter((m) => m.id !== id)
      setMessages(filteredMessages) // Optimistic update
      setIsDeleting(true)

      try {
        const result = await deleteMessage({ messageId: id as Id<"messages"> })
        if (result.chatDeleted) {
          router.push("/")
        }
        // No need to reset isDeleting here, the provider will handle it on navigation
      } catch {
        setMessages(originalMessages) // Rollback
        toast({ title: "Failed to delete message", status: "error" })
        setIsDeleting(false) // Reset on error
      }
    },
    [messages, setMessages, deleteMessage, router, setIsDeleting]
  )

  const handleEdit = useCallback((id: string, newText: string) => {
    // This is a client-side only edit for now, as there's no backend mutation for it yet.
    setMessages(
      messages.map((message) =>
        message.id === id ? { ...message, content: newText } : message
      )
    )
  }, [messages, setMessages]);

  const handleReload = useCallback(async (messageId: string, opts?: { enableSearch?: boolean }) => {
    if (!user?._id || !chatId) return

    const options = {
      body: {
        chatId,
        model: selectedModel,
        systemPrompt: systemPrompt || getSystemPromptDefault(),
        reloadAssistantMessageId: messageId,
        ...(opts && typeof opts.enableSearch !== 'undefined' ? { enableSearch: opts.enableSearch } : {})
      },
    }
    reload(options)
  }, [user?._id, chatId, selectedModel, systemPrompt, reload]);

  // Redirect if chat is not found or user is not authorized
  useEffect(() => {
    if (
      !isUserLoading &&
      chatId &&
      currentChat === null &&
      messagesFromDB !== undefined &&
      !isDeleting
    ) {
      toast({
        title: "Chat not found or you don't have permission to view it.",
        status: "error",
      })
      router.replace("/")
    }
  }, [
    chatId,
    currentChat,
    messagesFromDB,
    isUserLoading,
    router,
    isDeleting,
  ])

  // Use user's preferred model when starting a brand-new chat
  useEffect(() => {
    if (!chatId && user?.preferredModel) {
      setSelectedModel(user.preferredModel)
    }
  }, [user?.preferredModel, chatId])

  if (currentChat === null && chatId) {
    return null // Render nothing while redirecting
  }

  return (
    <div className={cn("@container/main relative flex h-full flex-col items-center justify-end md:justify-center")}>
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
            transition={{ layout: { duration: 0 } }}
          >
            <h1 className="mb-6 text-3xl font-medium tracking-tight">
              What's on your mind?
            </h1>
          </motion.div>
        ) : (
          <Conversation
            key="conversation"
            messages={messages}
            status={status === "streaming" ? "streaming" : "idle"}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReload={handleReload}
          />
        )}
      </AnimatePresence>
      <motion.div
        className={cn("relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl")}
        layout="position"
        layoutId="chat-input-container"
        transition={{ layout: { duration: messages.length === 1 ? 0.3 : 0 } }}
      >
        <ChatInput
          value={input}
          onSuggestion={(suggestion) => append({ role: "user", content: suggestion })}
          onValueChange={setInput}
          onSend={({ enableSearch }) => submit(undefined, { body: { enableSearch } })}
          isSubmitting={isSubmitting || status === "streaming"}
          files={files}
          onFileUpload={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
          onFileRemove={(file) => setFiles((prev) => prev.filter((f) => f !== file))}
          hasSuggestions={!chatId && messages.length === 0}
          onSelectModel={handleModelChange}
          onSelectSystemPrompt={setSystemPrompt}
          selectedModel={selectedModel}
          isUserAuthenticated={isAuthenticated}
          systemPrompt={systemPrompt}
          stop={stop}
          status={status}
        />
      </motion.div>
    </div>
  )
}
