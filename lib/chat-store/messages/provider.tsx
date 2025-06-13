"use client"
import { toast } from "@/components/ui/toast"
import type { Message as MessageAISDK } from "ai"
import { createContext, useContext, useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { writeToIndexedDB } from "../persist";
import { clearMessagesForChat } from "./api";
type ExtendedMessage = MessageAISDK & { parent_message_id?: number | null };

// Create a truly persistent module-level cache that exists outside the React component lifecycle
// This will survive component unmounts/remounts, unlike useRef
const GLOBAL_CHAT_MESSAGES_CACHE: Record<string, MessageAISDK[]> = {};

interface MessagesContextType {
  messages: MessageAISDK[]
  setMessages: React.Dispatch<React.SetStateAction<MessageAISDK[]>>
  refresh: () => Promise<void>
  reset: () => Promise<void>
  cacheAndAddMessage: (message: MessageAISDK) => Promise<void>
  resetMessages: () => Promise<void>
  deleteMessage: (messageId: string | number) => Promise<void>
  truncateMessages: (messageId: string | number) => Promise<void>
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
  // In-memory cache per chat for literal instant loads - now kept in sync with global cache
  const chatMessagesCacheRef = useRef<Record<string, MessageAISDK[]>>(GLOBAL_CHAT_MESSAGES_CACHE);
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
  const [messages, setMessages] = useState<MessageAISDK[]>([]);
  const chatsContext = useChats();
  const router = useRouter();

  // Fetch messages from Convex using useQuery
  const convexMessages = useQuery(
    api.messages.getMessagesForChat,
    chatId ? { chatId: chatId as Id<"chats"> } : "skip"
  );

  useEffect(() => {
    if (convexMessages) {
      // When Convex data is available, update the local state and caches
      const newMessages = convexMessages.map(
        (m) =>
          ({
            ...m,
            id: m._id,
            createdAt: new Date(m._creationTime),
            role: m.role as "user" | "assistant" | "system",
          } as MessageAISDK)
      );
      setMessages(newMessages);
      messagesMapRef.current = new Map(newMessages.map((m) => [m.id, m]));
      if (chatId) {
        GLOBAL_CHAT_MESSAGES_CACHE[chatId] = newMessages;
        writeToIndexedDB("messages", { id: chatId, messages: newMessages });
      }
    } else if (chatId === null) {
      // Clear messages if no chat is selected
      setMessages([]);
      messagesMapRef.current = new Map();
    }
  }, [convexMessages, chatId]);

  const refresh = async () => {
    // useQuery handles refreshing automatically, but a manual refresh
    // could be forced if needed, though it's often not necessary with Convex.
    // For now, this can be a no-op or log a message.
    console.log("useQuery handles data refreshing automatically.");
  };

  const deleteMessages = async () => {
    if (!chatId) return

    setMessages([])
    // Clear both caches
    GLOBAL_CHAT_MESSAGES_CACHE[chatId] = []
    await clearMessagesForChat(chatId)
  }


  const cacheAndAddMessage = async (message: MessageAISDK) => {
    if (!chatId) return;
    try {
      // Efficient O(1) update using Map
      messagesMapRef.current.set(message.id, message)
      const arr = syncMessages(messagesMapRef.current)
      // Update both global cache and ref
      GLOBAL_CHAT_MESSAGES_CACHE[chatId] = arr;
      await writeToIndexedDB("messages", { id: chatId, messages: arr })
      setMessages(() => arr)
    } catch (e) {
      toast({ title: "Failed to save message", status: "error" })
    }
  }

  const deleteSingleMessage = async (messageId: string | number) => {
    try {
      const mod = await import("./api")
      // //console.log("Deleting message:", messageId, "chatId:", chatId)
      // Pass chatId directly to avoid redundant fetch
      const result = await mod.deleteMessageAndAssistantReplies(messageId, chatId ?? undefined)
      // Remove from Map efficiently
      messagesMapRef.current.forEach((m: MessageAISDK, id: string | number) => {
        if (String(id) === String(messageId) || String((m as ExtendedMessage).parent_message_id) === String(messageId)) {
          messagesMapRef.current.delete(id)
        }
      })
      const updatedMessages = syncMessages(messagesMapRef.current)
      // Update both caches
      if (chatId) GLOBAL_CHAT_MESSAGES_CACHE[chatId] = updatedMessages;
      setMessages(updatedMessages)
      if (chatId) {
        await writeToIndexedDB("messages", { id: chatId, messages: updatedMessages })
      }
      if (chatId) {
        // Update the chat's updated_at in IndexedDB only
        const { updateChatTimestamp } = await import("../chats/api");
        await updateChatTimestamp(chatId, true);
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

  const truncateMessages = async (messageId: string | number) => {
    if (!chatId) return;
    // Build sorted array
    const arr = syncMessages(messagesMapRef.current);
    const idx = arr.findIndex((m) => String(m.id) === String(messageId));
    if (idx < 0) return;
    const newArr = arr.slice(0, idx + 1);
    // Reset map and state
    messagesMapRef.current = new Map(newArr.map((m) => [m.id, m]));
    setMessages(newArr)
    // Update both caches
    GLOBAL_CHAT_MESSAGES_CACHE[chatId] = newArr;
    // Persist to IndexedDB
    await writeToIndexedDB("messages", { id: chatId, messages: newArr });
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
    truncateMessages,
  }), [messages, setMessages, refresh, deleteMessages, cacheAndAddMessage, deleteSingleMessage, resetMessages]);

  return (
    <MessagesContext.Provider value={contextValue}>
      {children}
    </MessagesContext.Provider>
  )
}
