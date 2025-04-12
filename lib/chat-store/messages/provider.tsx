"use client"
import { toast } from "@/components/ui/toast"
import type { Message as MessageAISDK } from "ai"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter } from 'next/navigation';
import { writeToIndexedDB } from "../persist"
import {
  addMessage,
  cacheMessages,
  clearMessagesForChat,
  fetchAndCacheMessages,
  getCachedMessages,
  setMessages as saveMessages,
} from "./api"
type ExtendedMessage = MessageAISDK & { parent_message_id?: number | null }

interface MessagesContextType {
  messages: MessageAISDK[]
  setMessages: React.Dispatch<React.SetStateAction<MessageAISDK[]>>
  refresh: () => Promise<void>
  reset: () => Promise<void>
  addMessage: (message: MessageAISDK, parentMessageId?: number | null) => Promise<void>
  saveAllMessages: (messages: MessageAISDK[]) => Promise<void>
  cacheAndAddMessage: (message: MessageAISDK) => Promise<void>
  resetMessages: () => Promise<void>
  deleteMessage: (messageId: string | number) => Promise<void>
}

const MessagesContext = createContext<MessagesContextType | null>(null)

export function useMessages() {
  const context = useContext(MessagesContext)
  if (!context)
    throw new Error("useMessages must be used within MessagesProvider")
  return context
}

import { useChats } from '../chats/provider';

import { useChatSession } from "@/app/providers/chat-session-provider"

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const { chatId } = useChatSession()
  const [messages, setMessages] = useState<MessageAISDK[]>([])
  const chatsContext = useChats()
  const router = useRouter()

  useEffect(() => {
    if (chatId === null) {
      setMessages([])
    }
  }, [chatId])

  useEffect(() => {
    if (!chatId) return

    const load = async () => {
      const cached = await getCachedMessages(chatId)
      setMessages(cached)

      try {
        const fresh = await fetchAndCacheMessages(chatId)
        setMessages(fresh)
        cacheMessages(chatId, fresh)
      } catch (error) {
        console.error("Failed to fetch messages:", error)
      }
    }

    load()
  }, [chatId])

  const refresh = async () => {
    if (!chatId) return

    try {
      const fresh = await fetchAndCacheMessages(chatId)
      setMessages(fresh)
    } catch (e) {
      toast({ title: "Failed to refresh messages", status: "error" })
    }
  }

  const deleteMessages = async () => {
    if (!chatId) return

    setMessages([])
    await clearMessagesForChat(chatId)
  }

  const addSingleMessage = async (message: MessageAISDK, parentMessageId?: number | null) => {
    if (!chatId) return

    try {
      await addMessage(chatId, message, parentMessageId)
      setMessages((prev) => [...prev, message])
    } catch (e) {
      toast({ title: "Failed to add message", status: "error" })
    }
  }

  const cacheAndAddMessage = async (message: MessageAISDK) => {
    if (!chatId) return;
    try {
      // Replace if exists, else append
      const idx = messages.findIndex((m) => m.id === message.id);
      let updated;
      if (idx !== -1) {
        updated = [...messages];
        updated[idx] = message;
      } else {
        updated = [...messages, message];
      }
      await writeToIndexedDB("messages", { id: chatId, messages: updated });
      setMessages(updated);
    } catch (e) {
      toast({ title: "Failed to save message", status: "error" });
    }
  }

  const saveAllMessages = async (newMessages: MessageAISDK[]) => {
    if (!chatId) return

    try {
      await saveMessages(chatId, newMessages)
      setMessages(newMessages)
    } catch (e) {
      toast({ title: "Failed to save messages", status: "error" })
    }
  }

  const deleteSingleMessage = async (messageId: string | number) => {
    try {
      const mod = await import("./api")
      const result = await mod.deleteMessageAndAssistantReplies(messageId)
      const updatedMessages = (messages =>
        (messages as ExtendedMessage[]).filter(
          m =>
            String(m.id) !== String(messageId) &&
            String(m.parent_message_id) !== String(messageId)
        )
      )(await (async () => {
        return new Promise<ExtendedMessage[]>((resolve) => {
          setMessages(prev => {
            resolve(prev as ExtendedMessage[]);
            return prev;
          });
        });
      })())

      setMessages(updatedMessages)

      if (chatId) {
        await writeToIndexedDB("messages", { id: chatId, messages: updatedMessages })
      }

      if (result.chatDeleted && chatId) {
        try {
          chatsContext.deleteChat(chatId, chatId, () => router.push("/"))
        } catch (e) {
          console.error("Failed to update chat context after chat deletion:", e)
          router.push("/")
        }
      }
    } catch (e) {
      toast({ title: "Failed to delete message", status: "error" })
    }
  }

  const resetMessages = async () => {
    setMessages([])
  }

  return (
    <MessagesContext.Provider
      value={{
        messages,
        setMessages,
        refresh,
        reset: deleteMessages,
        addMessage: addSingleMessage,
        saveAllMessages,
        cacheAndAddMessage,
        deleteMessage: deleteSingleMessage,
        resetMessages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}
