"use client"
import { toast } from "@/components/ui/toast"
import type { Message as MessageAISDK } from "ai"
import { createContext, useContext, useEffect, useState, useRef, useMemo } from "react"
import { useRouter } from 'next/navigation';
import { writeToIndexedDB } from "../persist"
import {
  cacheMessages,
  clearMessagesForChat,
  fetchAndCacheMessages,
  getCachedMessages,
} from "./api"
type ExtendedMessage = MessageAISDK & { parent_message_id?: number | null }

interface MessagesContextType {
  messages: MessageAISDK[]
  setMessages: React.Dispatch<React.SetStateAction<MessageAISDK[]>>
  refresh: () => Promise<void>
  reset: () => Promise<void>
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
  // Efficient O(1) lookup/update for messages
  const messagesMapRef = useRef<Map<string | number, MessageAISDK>>(new Map());
  // Helper: convert Map to array, sorted by timestamp or id
  function syncMessages(map: Map<string | number, MessageAISDK>): MessageAISDK[] {
    // You can sort by createdAt or id as needed
    return Array.from(map.values()).sort((a, b) => {
      // If messages have a timestamp, sort by it, else fallback to id
      if (a.createdAt && b.createdAt) {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      // fallback: string compare on id
      return String(a.id).localeCompare(String(b.id));
    });
  }
  const { chatId } = useChatSession()
  const [messages, setMessages] = useState<MessageAISDK[]>([])
  const chatsContext = useChats()
  const router = useRouter()

  useEffect(() => {
    if (chatId === null) {
      setMessages([])
      messagesMapRef.current = new Map();
    }
  }, [chatId])

  useEffect(() => {
    if (!chatId) return

    const load = async () => {
      const cached = await getCachedMessages(chatId)
      setMessages(cached)
      messagesMapRef.current = new Map(cached.map(m => [m.id, m]))
      try {
        const fresh = await fetchAndCacheMessages(chatId)
        setMessages(fresh)
        messagesMapRef.current = new Map(fresh.map(m => [m.id, m]))
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


  const cacheAndAddMessage = async (message: MessageAISDK) => {
    if (!chatId) return;
    try {
      // Efficient O(1) update using Map
      messagesMapRef.current.set(message.id, message)
      const arr = syncMessages(messagesMapRef.current)
      await writeToIndexedDB("messages", { id: chatId, messages: arr })
      // console.log("[Provider] cacheAndAddMessage called with:", message);
      setMessages(() => {
        // console.log("[Provider] setMessages called with:", arr);
        return arr;
      })
    } catch (e) {
      toast({ title: "Failed to save message", status: "error" })
    }
  }

  const deleteSingleMessage = async (messageId: string | number) => {
    try {
      const mod = await import("./api")
      // console.log("Deleting message:", messageId, "chatId:", chatId)
      // Pass chatId directly to avoid redundant fetch
      const result = await mod.deleteMessageAndAssistantReplies(messageId, chatId ?? undefined)
      // Remove from Map efficiently
      messagesMapRef.current.forEach((m: MessageAISDK, id: string | number) => {
        if (String(id) === String(messageId) || String((m as ExtendedMessage).parent_message_id) === String(messageId)) {
          messagesMapRef.current.delete(id)
        }
      })
      const updatedMessages = syncMessages(messagesMapRef.current)
      setMessages(updatedMessages)
      if (chatId) {
        await writeToIndexedDB("messages", { id: chatId, messages: updatedMessages })
      }
      if (updatedMessages.length === 0 && chatId) {
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

  const contextValue = useMemo(() => ({
    messages,
    setMessages,
    refresh,
    reset: deleteMessages,
    cacheAndAddMessage,
    deleteMessage: deleteSingleMessage,
    resetMessages,
  }), [messages, setMessages, refresh, deleteMessages, cacheAndAddMessage, deleteSingleMessage, resetMessages]);

  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  )
}
