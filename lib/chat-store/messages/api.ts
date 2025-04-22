import { createClient } from "@/lib/supabase/client"
import type { Message as MessageAISDK } from "ai"
import { readFromIndexedDB, writeToIndexedDB } from "../persist"
import type { Message } from "../types"

type ChatMessageEntry = {
  id: string
  messages: MessageAISDK[]
}

export async function getCachedMessages(
  chatId: string
): Promise<MessageAISDK[]> {
  const entry = await readFromIndexedDB<ChatMessageEntry>("messages", chatId)

  if (!entry || Array.isArray(entry)) return []

  return (entry.messages || []).sort(
    (a, b) => +new Date(a.createdAt || 0) - +new Date(b.createdAt || 0)
  )
}

export async function fetchAndCacheMessages(
  chatId: string
): Promise<MessageAISDK[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("messages")
    .select("id, content, role, experimental_attachments, created_at, parent_message_id, reasoning_text,model")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true })

  if (!data || error) {
    console.error("Failed to fetch messages:", error)
    return []
  }

  const formattedMessages = data
    .filter((message) => typeof message === "object" && message !== null && "id" in message)
    .map((message: any) => ({
      ...message,
      id: String(message.id),
      createdAt: new Date(message.created_at || ""),
      reasoning_text: message.reasoning_text ?? null,
      parent_message_id: message.parent_message_id ?? null, // Ensure always present
    }))

  return formattedMessages
}

export async function cacheMessages(
  chatId: string,
  messages: MessageAISDK[]
): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages })
}


export async function clearMessagesCache(chatId: string): Promise<void> {
  await writeToIndexedDB("messages", { id: chatId, messages: [] })
}

export async function clearMessagesForChat(chatId: string): Promise<void> {
  const supabase = createClient()

  // Delete messages from the database
  const { error } = await supabase
    .from("messages")
    .delete()
    .eq("chat_id", chatId)

  if (error) {
    console.error("Failed to clear messages from database:", error)
  }

  // Clear the cache
  await clearMessagesCache(chatId)
}
export async function deleteMessage(messageId: string | number): Promise<void> {
  const supabase = createClient()
  const idNum = typeof messageId === 'string' ? parseInt(messageId, 10) : messageId
  if (isNaN(idNum)) throw new Error('Invalid message ID')

  const { error } = await supabase
    .from('messages')
    .delete()
    .eq('id', idNum)

  if (error) throw error
}
import { deleteChat } from '../chats/api';

export async function deleteMessageAndAssistantReplies(messageId: string | number, chatIdFromCaller?: string): Promise<{ chatDeleted: boolean }> {
  const supabase = createClient();
  let chatId = chatIdFromCaller;
  let idNum = typeof messageId === 'string' ? parseInt(messageId, 10) : messageId;
  if (isNaN(idNum)) throw new Error('Invalid message ID');

  // Only fetch chat_id if not provided
  if (!chatId) {
    console.log("Fetching chat_id for message:", idNum);
    const { data: messageData, error: fetchError } = await supabase
      .from('messages')
      .select('chat_id')
      .eq('id', idNum)
      .single();
    if (fetchError) {
      console.error('Failed to fetch message chat_id:', fetchError);
      throw fetchError;
    }
    chatId = messageData?.chat_id;
    if (!chatId) {
      console.error('Message does not have a chat_id');
      throw new Error('Message does not have a chat_id');
    }
  }

  // Use the new RPC to delete the message and its children in one call
  const { error: rpcError } = await (supabase.rpc as any)('delete_message_and_children', { msg_id: messageId });
  if (rpcError) {
    console.error('Failed to delete message and children via RPC:', rpcError);
    throw rpcError;
  }

  // Update the chat's updated_at timestamp
  const { error: updateChatError } = await supabase
    .from("chats")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", chatId);

  if (updateChatError) {
    console.error("Error updating chat timestamp during message deletion:", updateChatError);
  }

  // Check if any messages remain in the chat
  const { count, error: countError } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('chat_id', chatId);

  if (countError) {
    console.error('Failed to count remaining messages:', countError);
    throw countError;
  }

  if ((count ?? 0) === 0) {
    try {
      await deleteChat(chatId);
      return { chatDeleted: true };
    } catch (deleteChatError) {
      // console.error('Failed to delete empty chat:', deleteChatError);
      throw deleteChatError;
    }
  } else {
    return { chatDeleted: false };
  }
}


