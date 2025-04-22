import { readFromIndexedDB, writeToIndexedDB } from "@/lib/chat-store/persist"
import type { Chat, Chats } from "@/lib/chat-store/types"
import { createClient } from "@/lib/supabase/client"
import { deleteFromIndexedDB } from "../persist"
import { MODEL_DEFAULT, SYSTEM_PROMPT_DEFAULT } from "../../config"
import { fetchClient } from "../../fetch"
import {
  API_ROUTE_CREATE_CHAT,
  API_ROUTE_UPDATE_CHAT_MODEL,
} from "../../routes"

export async function getCachedChats(): Promise<Chats[]> {
  const all = await readFromIndexedDB<Chats>("chats")
  return (all as Chats[]).sort(
    (a, b) => +new Date(b.updated_at || b.created_at || "") - +new Date(a.updated_at || a.created_at || "")
  )
}

export async function fetchAndCacheChats(userId: string): Promise<Chats[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("chats")
    .select("id, title, created_at, updated_at, model, system_prompt")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (!data || error) {
    console.error("Failed to fetch chats:", error)
    return []
  }

  await writeToIndexedDB("chats", data)
  return data
}

export async function updateChatTitle(
  id: string,
  title: string
): Promise<void> {
  const now = new Date().toISOString();
  const supabase = createClient()
  const { error } = await supabase
    .from("chats")
    .update({ title, updated_at: now })
    .eq("id", id)
  if (error) throw error

  const all = await getCachedChats()
  const updated = (all as Chats[]).map((c) =>
    c.id === id ? { ...c, title, updated_at: now } : c
  )
  await writeToIndexedDB("chats", updated)
}

export async function updateChatTimestamp(id: string, skipDatabaseUpdate: boolean = false): Promise<void> {
  const now = new Date().toISOString();

  // Update in database only if not skipped
  if (!skipDatabaseUpdate) {
    const supabase = createClient()
    const { error } = await supabase
      .from("chats")
      .update({ updated_at: now })
      .eq("id", id)

    if (error) {
      console.error("Error updating chat timestamp in database:", error);
      return;
    }
  }

  // Always update in IndexedDB
  try {
    const all = await getCachedChats()
    const updated = (all as Chats[]).map((c) =>
      c.id === id ? { ...c, updated_at: now } : c
    )
    await writeToIndexedDB("chats", updated)
  } catch (error) {
    console.error("Error updating chat timestamp in IndexedDB:", error);
  }
}

export async function deleteChat(id: string): Promise<void> {
  // console.log("[deleteChat] Deleting chat from Supabase:", id);
  const supabase = createClient()
  const { error } = await supabase.from("chats").delete().eq("id", id)
  if (error) {
    console.error("[deleteChat] Supabase delete error:", error);
    throw error;
  }

  try {
    // Remove chat key from "chats" store
    await deleteFromIndexedDB("chats", id);
    // console.log("[deleteChat] Deleted chat key from IndexedDB:", id);

    // Remove chat's messages key from "messages" store
    await deleteFromIndexedDB("messages", id);
    // console.log("[deleteChat] Deleted chat messages key from IndexedDB:", id);
  } catch (e) {
    console.error("[deleteChat] Error deleting keys from IndexedDB after chat delete:", e);
    throw e;
  }
}

export async function getChat(chatId: string): Promise<Chat | null> {
  const all = await readFromIndexedDB<Chat>("chats")
  return (all as Chat[]).find((c) => c.id === chatId) || null
}

export async function getUserChats(userId: string): Promise<Chat[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("chats")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (!data || error) return []
  await writeToIndexedDB("chats", data)
  return data
}

export async function createChat(
  userId: string,
  title: string,
  model: string,
  systemPrompt: string
): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("chats")
    .insert({ user_id: userId, title, model, system_prompt: systemPrompt })
    .select("id")
    .single()

  if (error || !data?.id) throw error

  const now = new Date().toISOString();
  await writeToIndexedDB("chats", {
    id: data.id,
    title,
    model,
    user_id: userId,
    system_prompt: systemPrompt,
    created_at: now,
    updated_at: now,
  })

  return data.id
}

export async function updateChatModel(chatId: string, model: string) {
  try {
    const res = await fetchClient(API_ROUTE_UPDATE_CHAT_MODEL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, model }),
    })
    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
        `Failed to update chat model: ${res.status} ${res.statusText}`
      )
    }

    const now = new Date().toISOString();
    const all = await getCachedChats()
    const updated = (all as Chats[]).map((c) =>
      c.id === chatId ? { ...c, model, updated_at: now } : c
    )
    await writeToIndexedDB("chats", updated)

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}

export async function createNewChat(
  userId: string,
  title?: string,
  model?: string,
  isAuthenticated?: boolean,
  systemPrompt?: string
): Promise<Chats> {
  try {
    const res = await fetchClient(API_ROUTE_CREATE_CHAT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        title,
        model: model || MODEL_DEFAULT,
        isAuthenticated,
        systemPrompt: systemPrompt || SYSTEM_PROMPT_DEFAULT,
      }),
    })

    const responseData = await res.json()

    if (!res.ok) {
      // Throw an error object that includes the code if available
      const error: any = new Error(
        responseData.error || `Failed to create chat: ${res.statusText}`
      )
      if (responseData.code) {
        error.code = responseData.code
      }
      throw error
    }
    if (!responseData.chat) {
      // Handle case where response is ok but chat data is missing
      throw new Error("Failed to create chat: Invalid response data")
    }

    const chat: Chats = {
      id: responseData.chat.id,
      title: responseData.chat.title,
      created_at: responseData.chat.created_at,
      updated_at: responseData.chat.updated_at || responseData.chat.created_at,
      model: responseData.chat.model,
      system_prompt: responseData.chat.system_prompt,
    }
    await writeToIndexedDB("chats", chat)

    return chat
  } catch (error) {
    // console.error("Error creating new chat:", error)
    throw error
  }
}
