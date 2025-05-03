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
  const [messages, setMessages] = useState<MessageAISDK[]>([])
  const chatsContext = useChats()
  const router = useRouter()
  const loadingChatIdRef = useRef<string | null>(null); // Ref to track loading state

  useEffect(() => {
    if (chatId === null) {
      setMessages([])
      messagesMapRef.current = new Map();
    }
  }, [chatId])

  useEffect(() => {
    if (!chatId) {
      //console.log("[MessagesProvider] No chatId, returning.");
      return;
    }

    // Prevent starting a new load if one is already in progress for the same chatId
    if (loadingChatIdRef.current === chatId) {
      //console.log(`[MessagesProvider] Load already in progress for chatId: ${chatId}. Skipping duplicate.`);
      return;
    }

    //console.log(`[MessagesProvider] useEffect triggered for chatId: ${chatId}`);

    // Serve instantly from in-memory cache - now using GLOBAL cache
    const inMem = GLOBAL_CHAT_MESSAGES_CACHE[chatId];
    if (inMem && inMem.length > 0) {
      //console.log(`[MessagesProvider] Found messages in IN-MEMORY cache for chatId: ${chatId}. Count: ${inMem.length}`);
      setMessages(inMem);
      messagesMapRef.current = new Map(inMem.map(m => [m.id, m]));
      return; // Important: Return early if found in memory
    }

    //console.log(`[MessagesProvider] Messages NOT in IN-MEMORY cache for chatId: ${chatId}. Loading...`);
    // Fallback: load from IndexedDB or network
    const load = async () => {
      // Mark this chatId as loading
      loadingChatIdRef.current = chatId;
      //console.log(`[MessagesProvider] Checking IndexedDB (Dexie) for chatId: ${chatId}`);
      try { // Wrap async logic in try...finally
        const cached = await getCachedMessages(chatId);
        // Check if the chatId changed *while* we were loading
        if (loadingChatIdRef.current !== chatId) {
          //console.log(`[MessagesProvider] ChatId changed during load (${loadingChatIdRef.current} -> current: ${chatId}). Aborting state update.`);
          return; // Don't update state if the relevant chat changed
        }

        if (cached && cached.length > 0) {
          //console.log(`[MessagesProvider] Found messages in IndexedDB for chatId: ${chatId}. Count: ${cached.length}`);
          // Update both the global cache and the ref
          GLOBAL_CHAT_MESSAGES_CACHE[chatId] = cached;
          setMessages(cached);
          messagesMapRef.current = new Map(cached.map(m => [m.id, m]));
        } else {
          //console.log(`[MessagesProvider] Messages NOT in IndexedDB for chatId: ${chatId}. Fetching from network...`);
          try {
            const fresh = await fetchAndCacheMessages(chatId);
             // Check again if chatId changed during network fetch
            if (loadingChatIdRef.current !== chatId) {
               //console.log(`[MessagesProvider] ChatId changed during network fetch (${loadingChatIdRef.current} -> current: ${chatId}). Aborting state update.`);
               return;
            }
            //console.log(`[MessagesProvider] Fetched ${fresh.length} messages from network for chatId: ${chatId}`);
            // Update both the global cache and the ref
            GLOBAL_CHAT_MESSAGES_CACHE[chatId] = fresh;
            setMessages(fresh);
            messagesMapRef.current = new Map(fresh.map(m => [m.id, m]));
            // Assuming fetchAndCacheMessages handles caching internally on success
          } catch (error) {
            console.error(`[MessagesProvider] Failed to fetch messages for chatId: ${chatId}:`, error);
            // Handle error state?
          }
        }
      } finally {
         // Ensure we reset loading state only if this load operation was for the *currently* marked loading chatId
         if (loadingChatIdRef.current === chatId) {
            loadingChatIdRef.current = null;
            //console.log(`[MessagesProvider] Load finished for chatId: ${chatId}. Resetting loading state.`);
         }
      }
    };
    load();
  }, [chatId]); // Dependency array is just chatId, which seems correct.

  const refresh = async () => {
    if (!chatId) return

    try {
      const fresh = await fetchAndCacheMessages(chatId)
      chatMessagesCacheRef.current[chatId] = fresh
      setMessages(fresh)
    } catch (e) {
      toast({ title: "Failed to refresh messages", status: "error" })
    }
  }

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
