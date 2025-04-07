"use client"

import { ChatInput } from "@/app/components/chat-input/chat-input"
import { Conversation } from "@/app/components/chat/conversation"
import {
  checkRateLimits,
  createGuestUser,
  createNewChat,
  deleteChat, // Import deleteChat
  deleteMessage,
  updateChatModel,
  updateMessage,
} from "@/lib/api"
import {
  MESSAGE_MAX_LENGTH,
  REMAINING_QUERY_ALERT_THRESHOLD,
  SYSTEM_PROMPT_DEFAULT,
} from "@/lib/config"
import {
  Attachment,
  checkFileUploadLimit,
  processFiles,
} from "@/lib/file-handling"
import { API_ROUTE_CHAT } from "@/lib/routes"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"
import { fetchWithCsrf } from "@/lib/fetch" // Import the CSRF fetch wrapper
import { Message, useChat } from "@ai-sdk/react"
import { AnimatePresence, motion } from "motion/react"
import { useRouter } from "next/navigation" // Import useRouter
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DialogAuth } from "./dialog-auth"
import { JSONValue } from "ai" // Import JSONValue

type ChatProps = {
  initialMessages?: Message[]
  chatId?: string
  userId?: string
  preferredModel: string
  systemPrompt?: string
}

export default function Chat({
  initialMessages,
  chatId: propChatId,
  userId: propUserId,
  preferredModel,
  systemPrompt: propSystemPrompt,
}: ChatProps) {
  const router = useRouter() // Get router instance
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasDialogAuth, setHasDialogAuth] = useState(false)
  const [userId, setUserId] = useState<string | null>(propUserId || null)
  const [chatId, setChatId] = useState<string | null>(propChatId || null)
  const [files, setFiles] = useState<File[]>([])
  const [selectedModel, setSelectedModel] = useState(preferredModel)
  const [systemPrompt, setSystemPrompt] = useState(propSystemPrompt)
  // Ref to store mapping from temporary/incorrect IDs to permanent DB IDs
  const idMapRef = useRef<Record<string, string>>({});

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
    // data, // No longer need to destructure 'data' for reasoning
  } = useChat({
    api: API_ROUTE_CHAT,
    initialMessages,
    fetch: fetchWithCsrf, // Pass the custom fetch wrapper
    // Add onFinish callback to handle ID updates
    onFinish: (message) => {
      // Check if the finished message is from the assistant and has annotations
      if (message.role === 'assistant' && message.annotations) {
        // Find the annotation containing our IDs
        const idAnnotation = message.annotations.find(
          (anno): anno is { assistantId: string; userId?: string } =>
            anno != null &&
            typeof anno === 'object' &&
            'assistantId' in anno &&
            typeof anno.assistantId === 'string'
        );

        if (idAnnotation) {
          const assistantId = idAnnotation.assistantId;
          const userIdFromAnnotation = idAnnotation.userId; // Renamed to avoid conflict

          setMessages((currentMessages) => {
            let messagesChanged = false;
            const updatedMessages = [...currentMessages]; // Create a mutable copy
            // console.log("onFinish: Received annotation:", JSON.stringify(idAnnotation));
            // console.log("onFinish: Current messages count:", currentMessages.length);

            // --- Update Assistant Message ID ---
            const lastAssistantIndex = updatedMessages.findLastIndex(m => m.role === 'assistant');
            // console.log("onFinish: Found last assistant index:", lastAssistantIndex);

            if (lastAssistantIndex !== -1 && updatedMessages[lastAssistantIndex].id !== assistantId) {
              // console.log(`Updating ASSISTANT message ID from ${updatedMessages[lastAssistantIndex].id} to ${assistantId}`);
              updatedMessages[lastAssistantIndex] = {
                ...updatedMessages[lastAssistantIndex],
                id: assistantId, // Update the ID
                annotations: message.annotations, // Keep other annotations
              };
              messagesChanged = true;
            }

            // --- Update User Message ID (if provided in the same annotation) ---
            // Assumes the user message immediately precedes the assistant message in the array
            // when onFinish is called for the assistant message.
            if (userIdFromAnnotation && lastAssistantIndex > 0) {
              // console.log("onFinish: Attempting to find preceding user message for ID:", userIdFromAnnotation);
              const userMessageIndex = lastAssistantIndex - 1;
              const potentialUserMessage = updatedMessages[userMessageIndex];

              // console.log(`onFinish: Checking index ${userMessageIndex} for user message.`);

              // Check if it's indeed a user message and the ID needs updating
              if (potentialUserMessage && potentialUserMessage.role === 'user') {
                 // console.log(`onFinish: Found user message at index ${userMessageIndex} with current ID ${potentialUserMessage.id}`);
                 if (potentialUserMessage.id !== userIdFromAnnotation) {
                    // It's possible the ID was already updated by useChat, but let's ensure it matches the annotation
                    // console.log(`Updating USER message ID from ${potentialUserMessage.id} to ${userIdFromAnnotation}`);
                    // Store mapping instead of directly updating state here
                    idMapRef.current[potentialUserMessage.id] = userIdFromAnnotation;
                    // messagesChanged = true; // Don't mark as changed here
                 } else {
                    // console.log(`User ID already matches: ${updatedMessages[userMessageIndex].id}`);
                 }
              } else {
                 // console.log("onFinish: No user message with temporary ID found.");
              }
            } else {
               // console.log("onFinish: No userId found in annotation.");
            }

            // Return new array only if changes were made
            // console.log("onFinish: Messages changed?", messagesChanged);
            return messagesChanged ? updatedMessages : currentMessages;
          });
        }
      }
    },
  })

  // Removed the useEffect hook that watched `data`

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

  // Removed the useEffect hook that processed the 'data' stream for reasoning
  // Also removing the debug logging useEffect hook we added earlier
  /*
  useEffect(() => {
    if (!data || data.length === 0) {
      // setLiveReasoning("") // Clear if data stream is empty/reset
      return
    }

    // --- DEBUG LOGGING START ---
    // console.log("[Chat useEffect] Received data stream:", JSON.stringify(data, null, 2));
    // --- DEBUG LOGGING END ---

    // Filter for reasoning chunks and accumulate content
    const reasoningContent = data
      .filter(
        (item): item is { type: 'reasoning_chunk'; content: string } =>
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          item.type === 'reasoning_chunk' &&
          'content' in item &&
          typeof item.content === 'string'
      )
      .map(item => item.content)
      .join("\n\n") // Join chunks with newlines for readability

    // --- DEBUG LOGGING START ---
    // console.log("[Chat useEffect] Setting liveReasoning:", reasoningContent);
    // --- DEBUG LOGGING END ---
    // setLiveReasoning(reasoningContent)

  }, [data]) // Rerun whenever the data stream updates
  */

  useEffect(() => {
    const checkMessageLimits = async () => {
      if (!userId) return
      const rateData = await checkRateLimits(userId, !!propUserId)

      if (rateData.remaining === 0 && !propUserId) {
        setHasDialogAuth(true)
      }
    }
    checkMessageLimits()
  }, [userId])

  const isFirstMessage = useMemo(() => {
    return messages.length === 0
  }, [messages])

  useEffect(() => {
    const createGuestUserEffect = async () => {
      if (!propUserId) {
        const storedGuestId = localStorage.getItem("guestId")
        if (storedGuestId) {
          setUserId(storedGuestId)
        } else {
          const newGuestId = crypto.randomUUID()
          localStorage.setItem("guestId", newGuestId)
          await createGuestUser(newGuestId)
          setUserId(newGuestId)
        }
      }
    }
    createGuestUserEffect()
  }, [propUserId])

  const ensureChatExists = async () => {
    if (!userId) return null
    if (isFirstMessage) {
      try {
        const newChatId = await createNewChat(
          userId,
          input,
          selectedModel,
          Boolean(propUserId),
          systemPrompt
        )
        setChatId(newChatId)
        if (propUserId) {
          window.history.pushState(null, "", `/c/${newChatId}`)
        }
        return newChatId
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
      setSelectedModel(model)

      if (chatId) {
        try {
          await updateChatModel(chatId, model)
        } catch (err) {
          console.error("Failed to update chat model:", err)
          toast({
            title: "Failed to update chat model",
            status: "error",
          })
        }
      }
    },
    [chatId]
  )

  const submit = async () => {
    if (!userId) {
      return
    }
    setIsSubmitting(true)

    const currentChatId = await ensureChatExists()

    if (!currentChatId) {
      setIsSubmitting(false)
      return
    }

    if (input.length > MESSAGE_MAX_LENGTH) {
      toast({
        title: `The message you submitted was too long, please submit something shorter. (Max ${MESSAGE_MAX_LENGTH} characters)`,
        status: "error",
      })
      setIsSubmitting(false)
      return
    }

    try {
      const rateData = await checkRateLimits(userId, !!propUserId)

      if (rateData.remaining === REMAINING_QUERY_ALERT_THRESHOLD) {
        toast({
          title: `Only ${rateData.remaining} ${rateData.remaining === 1 ? 'query' : 'queries'} remaining today.`,
          status: "info",
        })
      }
    } catch (err) {
      setIsSubmitting(false)
      console.error("Rate limit check failed:", err)
    }

    let newAttachments: Attachment[] = []
    if (files.length > 0) {
      try {
        await checkFileUploadLimit(userId)
      } catch (error: any) {
        if (error.code === "DAILY_FILE_LIMIT_REACHED") {
          toast({ title: error.message, status: "error" })
          setIsSubmitting(false)
          return
        }
      }

      const processedAttachments = await processFiles(
        files,
        currentChatId,
        userId
      )

      newAttachments = processedAttachments
      setFiles([])
    }

    const options = {
      body: {
        chatId: currentChatId,
        userId,
        model: selectedModel,
        isAuthenticated: !!propUserId,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
      },
      experimental_attachments: newAttachments || undefined,
    }

    // No longer need to clear liveReasoning state here
    handleSubmit(undefined, options)
    setInput("")
    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    // Find the correct ID to use for the API call
    const idForApi = idMapRef.current[id] || id;
    // console.log(`handleDelete: Using ID ${idForApi} for API call (original ID was ${id})`);

    // Optimistic UI update: Remove message(s) immediately using the original ID from the UI state
    const originalMessages = [...messages]; // Keep a copy for potential rollback
    let uiMessagesToDeleteIds: string[] = [id]; // IDs currently in the UI state

    const messageIndex = messages.findIndex((message) => message.id === id); // Find based on UI ID
    if (messageIndex !== -1) {
      const deletedMessage = messages[messageIndex];
      if (deletedMessage.role === 'user' && messageIndex + 1 < messages.length && messages[messageIndex + 1].role === 'assistant') {
        // If deleting a user message, also mark the next assistant message (using its UI ID) for deletion
        uiMessagesToDeleteIds.push(messages[messageIndex + 1].id);
      }
    }

    const remainingMessagesCount = messages.length - uiMessagesToDeleteIds.length;
    setMessages(messages.filter((message) => !uiMessagesToDeleteIds.includes(message.id)));

    try {
      // Determine the actual API IDs to delete
      let apiIdsToDelete = uiMessagesToDeleteIds.map(uiId => idMapRef.current[uiId] || uiId);
      // console.log(`handleDelete: API IDs to delete: ${apiIdsToDelete.join(', ')}`);

      // Call the backend API for each message to delete using the potentially mapped permanent ID
      for (const messageIdForApi of apiIdsToDelete) {
         // Ensure userId is available and valid before calling API
         if (!userId) {
           throw new Error("User ID is not available.");
         }
         // Use the potentially mapped ID for the API call
         await deleteMessage(messageIdForApi, userId, !!propUserId);
      }
      toast({ title: "Message(s) deleted.", status: "success" });

      // Check if the chat is now empty and delete it if necessary
      if (remainingMessagesCount === 0 && chatId && userId) {
        // console.log(`Chat ${chatId} is now empty. Attempting to delete.`);
        try {
          await deleteChat(chatId, userId, !!propUserId);
          toast({ title: "Chat deleted.", status: "success" });
          router.push('/'); // Redirect to home page
        } catch (chatDeleteError: any) {
          console.error("Failed to delete empty chat:", chatDeleteError);
          toast({ title: `Error deleting empty chat: ${chatDeleteError.message}`, status: "error" });
          // Don't rollback message deletion, just log chat deletion error
        }
      }

    } catch (error: any) {
      console.error("Failed to delete message(s):", error);
      toast({ title: `Error deleting message(s): ${error.message}`, status: "error" });
      // Rollback UI on error
      setMessages(originalMessages);
    }
  }

  const handleEdit = async (id: string, newText: string) => {
    const originalUiId = id; // The ID passed from the component (might be temporary or permanent)
    const idForApi = idMapRef.current[originalUiId] || originalUiId; // Get potentially mapped permanent ID
    // console.log(`handleEdit: Editing message with UI ID ${originalUiId}, API ID ${idForApi}`);
    const originalMessages = [...messages]; // Keep a copy for potential rollback

    // --- Step 1: Update User Message in DB ---
    try {
      if (!userId) throw new Error("User ID is not available.");
      await updateMessage(idForApi, newText, userId, !!propUserId);
      toast({ title: "User message updated.", status: "success" });
    } catch (error: any) {
      console.error("Failed to update user message:", error);
      toast({ title: `Error updating message: ${error.message}`, status: "error" });
      // Don't proceed if the primary update failed
      return;
    }

    // --- Step 2: Identify and Delete ALL Subsequent Messages (User and Assistant) ---
    const editedMessageIndex = originalMessages.findIndex(m => m.id === originalUiId);
    if (editedMessageIndex === -1) {
       console.error("Edited message not found in state after update attempt.");
       // Rollback? For now, just log and return.
       setMessages(originalMessages);
       return;
    }

    const messagesToDelete = originalMessages.slice(editedMessageIndex + 1);
    const idsToDelete = messagesToDelete.map(m => idMapRef.current[m.id] || m.id);

    // --- Step 3: Update Local State (Optimistic UI) ---
    // Keep only messages up to and including the edited one, with updated content
    const truncatedMessages = originalMessages
        .slice(0, editedMessageIndex + 1)
        .map((msg, index) => index === editedMessageIndex ? { ...msg, content: newText, id: idForApi } : msg); // Use permanent ID here too

    setMessages(truncatedMessages);

    // --- Step 4: Delete Subsequent Messages from DB ---
    if (idsToDelete.length > 0) {
      // console.log(`handleEdit: Deleting subsequent messages with IDs: ${idsToDelete.join(', ')}`);
      try {
        // Perform deletions asynchronously in the background
        Promise.all(idsToDelete.map(deleteId => {
          if (!userId) throw new Error("User ID is not available for deletion.");
          return deleteMessage(deleteId, userId, !!propUserId);
        })).then(() => {
          // console.log("Successfully deleted subsequent messages from DB.");
          // toast({ title: "Chat history truncated.", status: "info" });
        }).catch(error => {
          console.error("Failed to delete subsequent messages:", error);
          toast({ title: `Error truncating history: ${error.message}`, status: "error" });
          // Potentially try to restore originalMessages here if deletion fails critically
        });
      } catch (error: any) {
         // Catch immediate errors like missing userId
         console.error("Error initiating deletion of subsequent messages:", error);
         toast({ title: `Error truncating history: ${error.message}`, status: "error" });
         // Restore UI?
         setMessages(originalMessages);
         return; // Stop regeneration if deletion setup fails
      }
    }

    // --- Step 5: Trigger Regeneration using reload ---
    // Prepare the context using the truncated list (which already has updated content and ID)
    const reloadContext = truncatedMessages;
    // console.log("handleEdit: Reloading with context:", JSON.stringify(reloadContext));

    const reloadOptions = {
      messages: reloadContext, // Use the state we just set
      body: { // Include necessary body parameters
        chatId,
        userId,
        model: selectedModel,
        isAuthenticated: !!propUserId,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
        isRegeneration: true // Add the flag here
      },
    };

    try {
       reload(reloadOptions); // Trigger regeneration
       toast({ title: "Generating new response...", status: "info" });
    } catch (error) {
       console.error("Error triggering reload:", error);
       toast({ title: "Failed to start regeneration.", status: "error" });
    }
  }


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
      const currentChatId = await ensureChatExists()

      const options = {
        body: {
          chatId: currentChatId,
          userId,
          model: selectedModel,
          isAuthenticated: !!propUserId,
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
    },
    [ensureChatExists, userId, selectedModel, propUserId, append]
  )

  const handleSelectSystemPrompt = useCallback((newSystemPrompt: string) => {
    setSystemPrompt(newSystemPrompt)
  }, [])

  // Updated handleReload to accept ID and implement truncation
  const handleReload = async (id: string) => {
    const originalUiId = id; // ID of the assistant message being reloaded
    const idForApi = idMapRef.current[originalUiId] || originalUiId;
    // console.log(`handleReload: Reloading message with UI ID ${originalUiId}, API ID ${idForApi}`);
    const originalMessages = [...messages]; // Keep a copy for potential rollback

    // --- Step 1: Identify Target and Subsequent Messages ---
    const reloadMessageIndex = originalMessages.findIndex(m => m.id === originalUiId);
    if (reloadMessageIndex === -1) {
       console.error("Reload target message not found in state.");
       toast({ title: "Error: Could not find message to reload.", status: "error" });
       return;
    }
    // Ensure we are reloading an assistant message
    if (originalMessages[reloadMessageIndex].role !== 'assistant') {
       console.error("Attempted to reload a non-assistant message.");
       toast({ title: "Error: Can only reload assistant messages.", status: "error" });
       return;
    }

    // Messages to delete: the target assistant message and everything after it
    const messagesToDelete = originalMessages.slice(reloadMessageIndex);
    const idsToDelete = messagesToDelete.map(m => idMapRef.current[m.id] || m.id);

    // --- Step 2: Update Local State (Optimistic UI) ---
    // Keep only messages *before* the one being reloaded
    const truncatedMessages = originalMessages.slice(0, reloadMessageIndex);
    setMessages(truncatedMessages);

    // --- Step 3: Delete Target & Subsequent Messages from DB ---
    if (idsToDelete.length > 0) {
      // console.log(`handleReload: Deleting messages with IDs: ${idsToDelete.join(', ')}`);
      try {
        // Perform deletions asynchronously
        Promise.all(idsToDelete.map(deleteId => {
          if (!userId) throw new Error("User ID is not available for deletion.");
          return deleteMessage(deleteId, userId, !!propUserId);
        })).then(() => {
          // console.log("Successfully deleted target/subsequent messages from DB for reload.");
          toast({ title: "Chat history truncated for reload.", status: "info" });
        }).catch(error => {
          console.error("Failed to delete messages for reload:", error);
          toast({ title: `Error truncating history for reload: ${error.message}`, status: "error" });
          // Potentially restore originalMessages here
        });
      } catch (error: any) {
         console.error("Error initiating deletion for reload:", error);
         toast({ title: `Error truncating history for reload: ${error.message}`, status: "error" });
         setMessages(originalMessages); // Restore UI on immediate error
         return; // Stop regeneration if deletion setup fails
      }
    }

    // --- Step 4: Trigger Regeneration using reload ---
    // Prepare the context using the truncated list
    const reloadContext = truncatedMessages;
    // console.log("handleReload: Reloading with context:", JSON.stringify(reloadContext));

    const options = {
      messages: reloadContext, // Use the truncated state
      body: {
        chatId, // Use the current chatId state
        userId,
        model: selectedModel,
        isAuthenticated: !!propUserId,
        systemPrompt: SYSTEM_PROMPT_DEFAULT,
      },
    }

    // Add the isRegeneration flag for standard reloads too
    const reloadOptionsWithFlag = {
      ...options,
      body: {
        ...options.body,
        isRegeneration: true
      }
    };

    reload(reloadOptionsWithFlag)
  }

  return (
    <div
      className={cn(
        "@container/main relative flex h-full flex-col items-center justify-end md:justify-center"
      )}
    >
      <DialogAuth open={hasDialogAuth} setOpen={setHasDialogAuth} />
      <AnimatePresence initial={false} mode="popLayout">
        {isFirstMessage ? (
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
          <Conversation
            key="conversation"
            messages={messages}
            status={status}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onReload={handleReload}
            isUserAuthenticated={!!propUserId} // Add this line
            // Remove liveReasoning prop
          />
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
          onSend={submit}
          isSubmitting={isSubmitting}
          files={files}
          onFileUpload={handleFileUpload}
          onFileRemove={handleFileRemove}
          hasSuggestions={isFirstMessage}
          onSelectModel={handleModelChange}
          onSelectSystemPrompt={handleSelectSystemPrompt}
          selectedModel={selectedModel}
          isUserAuthenticated={!!propUserId}
          systemPrompt={systemPrompt}
          stop={stop}
          status={status}
        />
      </motion.div>
    </div>
  )
}
