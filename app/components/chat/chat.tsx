"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import { useChatSession } from "@/app/providers/chat-session-provider"
import { useUser } from "@/app/providers/user-provider"
import { toast } from "@/components/ui/toast"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { convertConvexToAISDK } from "@/lib/ai-sdk-utils"
import {
  buildSystemPrompt,
  MESSAGE_MAX_LENGTH,
  MODEL_DEFAULT,
  REMAINING_QUERY_ALERT_THRESHOLD,
  MODELS,
} from "@/lib/config"
import { API_ROUTE_CHAT } from "@/lib/routes"
import { cn } from "@/lib/utils"
import { useChat, type Message } from "@ai-sdk/react"
import { useAction, useConvex, useMutation, useQuery } from "convex/react"
import { AnimatePresence, motion } from "framer-motion"
import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

const DialogAuth = dynamic(
  () => import("./dialog-auth").then((mod) => mod.DialogAuth),
  { ssr: false }
)

// Helper to map Convex message doc to AI SDK message type
const mapMessage = (msg: Doc<"messages">): Message => 
  convertConvexToAISDK(msg)

// Map backend error codes to user-friendly messages
function humaniseUploadError(err: unknown): string {
  if (!(err instanceof Error)) return "Error uploading file";
  const msg = err.message;
  if (msg.includes("ERR_UNSUPPORTED_MODEL")) {
    return "File uploads are not supported for the selected model.";
  }
  if (msg.includes("ERR_BAD_MIME")) {
    return "Only images (JPEG, PNG, GIF, WebP) and PDFs are allowed.";
  }
  if (msg.includes("ERR_FILE_TOO_LARGE")) {
    return "Files can be at most 10 MB.";
  }
  return "Error uploading file";
}

// Helper to check if a model supports reasoning
function supportsReasoning(modelId: string): boolean {
  const model = MODELS.find((m) => m.id === modelId);
  if (!model || !model.features) {
    return false;
  }
  return model.features.some((f) => f.id === "reasoning" && f.enabled);
}

export default function Chat() {
  const { chatId, isDeleting, setIsDeleting } = useChatSession()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const branchChat = useMutation(api.chats.branchChat)
  const deleteMessage = useMutation(api.messages.deleteMessageAndDescendants)
  const generateUploadUrl = useAction(api.files.generateUploadUrl)
  const saveFileAttachment = useAction(api.files.saveFileAttachment)
  const convex = useConvex()

  // --- Local State ---
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isBranching, setIsBranching] = useState(false)
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [selectedModel, setSelectedModel] = useState(
    user?.preferredModel || MODEL_DEFAULT
  )
  const [reasoningEffort, setReasoningEffort] = useState<"low" | "medium" | "high">("low");
  const [personaPrompt, setPersonaPrompt] = useState<string | undefined>()
  const [systemPrompt, setSystemPrompt] = useState(() =>
    buildSystemPrompt(user)
  )

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
    onResponse: () => {
      // console.log("onResponse", response)
    },
    onFinish: () => {
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

  // Sync messages from DB to AI SDK state ensuring IDs from Convex are merged
  // into the client state. We avoid the flash by:
  // 1. Replacing the entire list only when DB has >= messages.length
  // 2. When DB has fewer messages (likely because the latest user message
  //    hasn't persisted yet), we merge IDs/metadata for the overlap without
  //    dropping optimistic messages.
  // 3. While a delete operation is in flight (isDeleting), we skip syncing to
  //    prevent the just-deleted message from reappearing.
  useEffect(() => {
    if (status !== "ready" || !messagesFromDB || isDeleting) return

    const mappedDb = messagesFromDB.map(mapMessage)

    if (mappedDb.length >= messages.length) {
      // DB is up-to-date or ahead – merge to ensure we keep streaming-only
      // properties (e.g. `parts`) that are not yet persisted in the DB.
      const merged = mappedDb.map((dbMsg, idx) => {
        const prev = messages[idx]
        if (prev && prev.parts && !dbMsg.parts) {
          return { ...dbMsg, parts: prev.parts }
        }
        return dbMsg
      })
      setMessages(merged)
    } else if (mappedDb.length > 0) {
      // DB is behind: merge IDs for the portion we have *without* dropping
      // recent optimistic messages (e.g., the just-streamed assistant reply).
      // We still update canonical IDs/metadata for the overlapping range so
      // that once the DB catches up the local state is already aligned.
      const merged = messages.map((msg, idx) => {
        if (idx < mappedDb.length) {
          const dbMsg = mappedDb[idx]
          return {
            ...msg,
            id: dbMsg.id,
            experimental_attachments: dbMsg.experimental_attachments,
            parts: msg.parts ?? dbMsg.parts,
          }
        }
        // Keep optimistic messages beyond the DB length untouched to avoid
        // momentary disappearance in the UI.
        return msg
      })
      setMessages(merged)
    }
  }, [messagesFromDB, status, messages, setMessages, isDeleting])

  // If we're in a brand-new chat (no chatId yet) ensure local state stays empty.
  useEffect(() => {
    if (status === "ready" && !chatId) {
      setMessages([])
    }
  }, [status, chatId, setMessages])

  // Sync chat settings from DB to local state
  useEffect(() => {
    if (currentChat) {
      setSelectedModel(currentChat.model || MODEL_DEFAULT)
      setSystemPrompt(currentChat.systemPrompt || buildSystemPrompt(user))
      setPersonaPrompt(undefined)
    }
  }, [currentChat, user])

  useEffect(() => {
    if (!chatId) {
      setSystemPrompt(buildSystemPrompt(user, personaPrompt))
    }
  }, [
    chatId,
    user,
    user?.preferredName,
    user?.occupation,
    user?.traits,
    user?.about,
    personaPrompt,
  ])

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
          systemPrompt: systemPrompt || buildSystemPrompt(user),
        })
        const newChatId = result.chatId
        window.history.pushState(null, "", `/c/${newChatId}`)
        return newChatId
      } catch {
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
      } catch {
        setSelectedModel(oldModel)
        toast({ title: "Failed to update chat model", status: "error" })
      }
    },
    [chatId, selectedModel, user, updateChatModel]
  )

  const handlePersonaSelect = useCallback(
    (prompt: string) => {
      const base = prompt || undefined
      setPersonaPrompt(base)
      setSystemPrompt(buildSystemPrompt(user, base))
    },
    [user]
  )

  const uploadAndSaveFile = async (
    file: File,
    chatIdForUpload: Id<"chats">
  ) => {
    try {
      const uploadUrl = await generateUploadUrl()
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })
      const { storageId } = await response.json()
      return await saveFileAttachment({
        storageId,
        chatId: chatIdForUpload,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      })
    } catch (error) {
      const friendly = humaniseUploadError(error)
      toast({ title: friendly, status: "error" })
      return null
    }
  }

  const submit = async (
    _?: unknown,
    opts?: { body?: { enableSearch?: boolean } }
  ) => {
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
      toast({
        title: `Message is too long (max ${MESSAGE_MAX_LENGTH} chars).`,
        status: "error",
      })
      setIsSubmitting(false)
      return
    }

    const vercelAiAttachments = []
    if (files.length > 0) {
      for (const file of files) {
        const newAttachment = await uploadAndSaveFile(
          file,
          currentChatId as Id<"chats">
        )
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

    const isReasoningModel = supportsReasoning(selectedModel);

    const options = {
      body: {
        chatId: currentChatId,
        model: selectedModel,
        systemPrompt: systemPrompt || buildSystemPrompt(user),
        ...(opts?.body && typeof opts.body.enableSearch !== "undefined"
          ? { enableSearch: opts.body.enableSearch }
          : {}),
        ...(isReasoningModel ? { reasoningEffort } : {}),
      },
      experimental_attachments:
        vercelAiAttachments.length > 0 ? vercelAiAttachments : undefined,
    }

    try {
      handleSubmit(undefined, options)
    } catch {
      toast({ title: "Failed to send message", status: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBranch = useCallback(
    async (messageId: string) => {
      if (!chatId || !user?._id) {
        toast({
          title: "Unable to branch chat. Please try again.",
          status: "error",
        })
        return
      }

      if (isBranching) return

      setIsBranching(true)

      try {
        const result = await branchChat({
          originalChatId: chatId as Id<"chats">,
          branchFromMessageId: messageId as Id<"messages">,
        })

        // Navigate to the new branched chat
        router.push(`/c/${result.chatId}`)

        toast({
          title: "Chat branched successfully",
          status: "success",
        })
      } catch (error: unknown) {
        console.error("Branch chat error:", error)

        let errorMessage = "Failed to branch chat"
        const errorMsg = error instanceof Error ? error.message : String(error)
        if (errorMsg.includes("Can only branch from assistant messages")) {
          errorMessage = "You can only branch from assistant messages"
        } else if (errorMsg.includes("not found")) {
          errorMessage = "Message not found or chat unavailable"
        } else if (errorMsg.includes("unauthorized")) {
          errorMessage = "You don&apos;t have permission to branch this chat"
        }

        toast({
          title: errorMessage,
          status: "error",
        })
      } finally {
        setIsBranching(false)
      }
    },
    [chatId, user, branchChat, router, isBranching]
  )

  const handleDelete = useCallback(
    async (id: string) => {
      // Build an optimistically updated list that mimics server deletion of the
      // target message *and* its descendants (assistant replies, tools, etc.).
      const buildOptimisticList = (
        msgList: typeof messages,
        targetId: string
      ) => {
        const idx = msgList.findIndex((m) => m.id === targetId)
        if (idx === -1) return msgList // fallback – shouldn't happen

        const targetRole = msgList[idx].role
        let endIdx = idx + 1

        // If deleting a user message, also remove subsequent assistant (and
        // related) messages until the next user message or end-of-list.
        if (targetRole === "user") {
          while (endIdx < msgList.length && msgList[endIdx].role !== "user") {
            endIdx++
          }
        }

        return [...msgList.slice(0, idx), ...msgList.slice(endIdx)]
      }

      const originalMessages = [...messages]
      const filteredMessages = buildOptimisticList(originalMessages, id)
      setMessages(filteredMessages) // Optimistic update (user + assistant)
      setIsDeleting(true)

      try {
        const result = await deleteMessage({ messageId: id as Id<"messages"> })
        if (result.chatDeleted) {
          router.push("/")
        } else {
          setIsDeleting(false)
        }
      } catch {
        setMessages(originalMessages) // Rollback on error
        toast({ title: "Failed to delete message", status: "error" })
        setIsDeleting(false)
      }
    },
    [messages, setMessages, deleteMessage, router, setIsDeleting]
  )

  const handleEdit = useCallback(
    (id: string, newText: string) => {
      // This is a client-side only edit for now, as there's no backend mutation for it yet.
      setMessages(
        messages.map((message) =>
          message.id === id ? { ...message, content: newText } : message
        )
      )
    },
    [messages, setMessages]
  )

  const handleReload = useCallback(
    async (messageId: string, opts?: { enableSearch?: boolean }) => {
      if (!user?._id || !chatId) return

      // 1. Optimistically remove all messages that come *after* the one being reloaded so
      //    they disappear from the UI immediately.
      const originalMessages = [...messages]
      const targetIdx = originalMessages.findIndex((m) => m.id === messageId)
      if (targetIdx === -1) {
        return
      }
      const trimmedMessages = originalMessages.slice(0, targetIdx + 1)
      setMessages(trimmedMessages)

      // 2. Persist the deletion of the following messages in the DB by invoking the existing
      //    deleteMessageAndDescendants mutation on the first message *after* the target (if any).
      const firstFollowing = originalMessages[targetIdx + 1]
      if (firstFollowing) {
        setIsDeleting(true)
        try {
          await deleteMessage({
            messageId: firstFollowing.id as Id<"messages">,
          })
        } catch {
          // Roll back optimistic update if the deletion fails
          setMessages(originalMessages)
          toast({
            title: "Failed to delete messages for reload",
            status: "error",
          })
        } finally {
          setIsDeleting(false)
        }
      }

      // 3. Trigger the assistant reload once the slate after the target message is clean.
      const options = {
        body: {
          chatId,
          model: selectedModel,
          systemPrompt: systemPrompt || buildSystemPrompt(user),
          reloadAssistantMessageId: messageId,
          ...(opts && typeof opts.enableSearch !== "undefined"
            ? { enableSearch: opts.enableSearch }
            : {}),
        },
      }
      reload(options)
    },
    [
      user,
      chatId,
      messages,
      setMessages,
      deleteMessage,
      selectedModel,
      systemPrompt,
      reload,
      setIsDeleting,
    ]
  )

  // Silent fallback redirect if chat somehow becomes inaccessible after initial
  // server validation (e.g., the chat is deleted in another tab).
  useEffect(() => {
    if (!isUserLoading && chatId && currentChat === null && !isDeleting) {
      router.replace("/")
    }
  }, [chatId, currentChat, isUserLoading, router, isDeleting])

  // Use user's preferred model when starting a brand-new chat
  useEffect(() => {
    if (!chatId && user?.preferredModel) {
      setSelectedModel(user.preferredModel)
    }
  }, [user?.preferredModel, chatId])

  const targetMessageId = searchParams.get("m")
  const hasScrolledRef = useRef(false)

  useEffect(() => {
    if (targetMessageId) {
      hasScrolledRef.current = false
    }
  }, [targetMessageId])

  useEffect(() => {
    if (!targetMessageId || hasScrolledRef.current || messages.length === 0)
      return
    const el = document.getElementById(targetMessageId)
    if (el) {
      el.scrollIntoView({ block: "center", behavior: "smooth" })
      hasScrolledRef.current = true
    }
  }, [targetMessageId, messages])

  if (currentChat === null && chatId) {
    return null // Render nothing while redirecting
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
            transition={{ layout: { duration: 0 } }}
          >
            <h1 className="mb-6 text-3xl font-medium tracking-tight">
              What&apos;s on your mind?
            </h1>
          </motion.div>
        ) : (
          <Conversation
            key="conversation"
            messages={messages}
            status={status}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReload={handleReload}
            onBranch={handleBranch}
            autoScroll={!targetMessageId}
          />
        )}
      </AnimatePresence>
      <motion.div
        className={cn(
          "relative inset-x-0 bottom-0 z-50 mx-auto w-full max-w-3xl"
        )}
        layout="position"
        layoutId="chat-input-container"
        transition={{ layout: { duration: messages.length === 1 ? 0.3 : 0 } }}
      >
        <ChatInput
          value={input}
          onSuggestion={(suggestion) =>
            append({ role: "user", content: suggestion })
          }
          onValueChange={setInput}
          onSend={({ enableSearch }) =>
            submit(undefined, { body: { enableSearch } })
          }
          isSubmitting={isSubmitting || status === "streaming"}
          files={files}
          onFileUpload={(newFiles) =>
            setFiles((prev) => [...prev, ...newFiles])
          }
          onFileRemove={(file) =>
            setFiles((prev) => prev.filter((f) => f !== file))
          }
          hasSuggestions={!chatId && messages.length === 0}
          onSelectModel={handleModelChange}
          onSelectSystemPrompt={handlePersonaSelect}
          selectedModel={selectedModel}
          isUserAuthenticated={isAuthenticated}
          systemPrompt={personaPrompt}
          stop={stop}
          status={status}
          isReasoningModel={supportsReasoning(selectedModel)}
          reasoningEffort={reasoningEffort}
          onSelectReasoningEffort={setReasoningEffort}
        />
      </motion.div>
    </div>
  )
}
