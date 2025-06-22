import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { mutation, query } from "./_generated/server"
import { MessagePart } from "./schema/parts"

export const sendUserMessageToChat = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    parentMessageId: v.optional(v.id("messages")),
    parts: v.optional(v.array(MessagePart)),
    metadata: v.optional(v.object({
      modelId: v.optional(v.string()),
      modelName: v.optional(v.string()),
      promptTokens: v.optional(v.number()),
      completionTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      serverDurationMs: v.optional(v.number())
    })),
  },
  returns: v.object({ messageId: v.id("messages") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Not authenticated")
    }
    // Verify that the authenticated user owns the chat
    const chat = await ctx.db.get(args.chatId)
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found or unauthorized")
    }
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      userId,
      role: args.role,
      content: args.content,
      parentMessageId: args.parentMessageId,
      parts: args.parts,
      metadata: args.metadata || {},
      createdAt: Date.now(),
    })
    await ctx.db.patch(args.chatId, { updatedAt: Date.now() })
    return { messageId }
  },
})

export const saveAssistantMessage = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.union(
      v.literal("user"),
      v.literal("assistant"),
      v.literal("system")
    ),
    content: v.string(),
    parentMessageId: v.optional(v.id("messages")),
    parts: v.optional(v.array(MessagePart)),
    metadata: v.optional(v.object({
      modelId: v.optional(v.string()),
      modelName: v.optional(v.string()),
      promptTokens: v.optional(v.number()),
      completionTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      serverDurationMs: v.optional(v.number())
    })),
  },
  returns: v.object({ messageId: v.id("messages") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Not authenticated")
    }
    // Verify that the authenticated user owns the chat
    const chat = await ctx.db.get(args.chatId)
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found or unauthorized")
    }
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      userId,
      role: args.role,
      content: args.content,
      parentMessageId: args.parentMessageId,
      parts: args.parts,
      metadata: args.metadata || {},
      createdAt: Date.now(),
    })
    await ctx.db.patch(args.chatId, { updatedAt: Date.now() })
    return { messageId }
  },
})

export const getMessagesForChat = query({
  args: { chatId: v.id("chats") },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      chatId: v.id("chats"),
      userId: v.optional(v.id("users")),
      role: v.union(
        v.literal("user"),
        v.literal("assistant"),
        v.literal("system")
      ),
      content: v.string(),
      createdAt: v.optional(v.number()),
      parts: v.optional(v.array(MessagePart)),
      parentMessageId: v.optional(v.id("messages")),
      metadata: v.object({
        modelId: v.optional(v.string()),
        modelName: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        reasoningTokens: v.optional(v.number()),
        serverDurationMs: v.optional(v.number())
      }),
    })
  ),
  handler: async (ctx, { chatId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    const chat = await ctx.db.get(chatId)
    if (!chat || chat.userId !== userId) return []
    return await ctx.db
      .query("messages")
      .withIndex("by_chat_and_created", (q) => q.eq("chatId", chatId))
      .order("asc")
      .collect()
  },
})

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const message = await ctx.db.get(messageId)
    if (!message) return null
    const chat = await ctx.db.get(message.chatId)
    if (!chat || chat.userId !== userId) return null
    await ctx.db.delete(messageId)
    return null
  },
})

export const getMessageDetails = query({
  args: { messageId: v.id("messages") },
  returns: v.union(
    v.null(),
    v.object({
      parentMessageId: v.optional(v.id("messages")),
      role: v.union(
        v.literal("user"),
        v.literal("assistant"),
        v.literal("system")
      ),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const message = await ctx.db.get(args.messageId)
    if (!message) return null

    const chat = await ctx.db.get(message.chatId)
    if (!chat || chat.userId !== userId) return null

    return {
      parentMessageId: message.parentMessageId,
      role: message.role,
    }
  },
})

export const deleteMessageAndDescendants = mutation({
  args: { messageId: v.id("messages") },
  returns: v.object({ chatDeleted: v.boolean() }),
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return { chatDeleted: false }
    const message = await ctx.db.get(messageId)
    if (!message) return { chatDeleted: false }
    const chat = await ctx.db.get(message.chatId)
    if (!chat || chat.userId !== userId) return { chatDeleted: false }
    const threshold = message.createdAt ?? message._creationTime
    const ids: Array<Id<"messages">> = []
    for await (const m of ctx.db
      .query("messages")
      .withIndex("by_chat_and_created", (q) => q.eq("chatId", message.chatId))
      .order("asc")) {
      const created = m.createdAt ?? m._creationTime
      if (created >= threshold) ids.push(m._id)
    }
    for (const id of ids) {
      await ctx.db.delete(id)
    }
    // update chat timestamp
    await ctx.db.patch(chat._id, { updatedAt: Date.now() })
    const remaining = await ctx.db
      .query("messages")
      .withIndex("by_chat_and_created", (q) => q.eq("chatId", message.chatId))
      .first()
    if (!remaining) {
      // Branch cleanup: Find all chats that are branched from this chat
      const branchedChats = await ctx.db
        .query("chats")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .filter((q) => q.eq(q.field("originalChatId"), chat._id))
        .collect()

      // Remove the branch reference from all branched chats
      for (const branchedChat of branchedChats) {
        await ctx.db.patch(branchedChat._id, {
          originalChatId: undefined,
          updatedAt: Date.now(),
        })
      }

      for await (const a of ctx.db
        .query("chat_attachments")
        .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))) {
        await ctx.db.delete(a._id)
      }
      await ctx.db.delete(chat._id)
      return { chatDeleted: true }
    }
    return { chatDeleted: false }
  },
})

export const searchMessages = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      chatId: v.id("chats"),
      content: v.string(),
      createdAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, { query: search, limit = 20 }) => {
    const safeLimit = Math.min(Math.max(1, limit), 100) // Cap between 1-100
    const userId = await getAuthUserId(ctx)
    if (!userId || search.trim() === "") return []

    const results = await ctx.db
      .query("messages")
      .withSearchIndex("by_user_content", (q) =>
        q.search("content", search).eq("userId", userId)
      )
      .take(safeLimit)

    return results.map((msg) => ({
      _id: msg._id,
      chatId: msg.chatId,
      content: msg.content,
      createdAt: msg.createdAt,
    }))
  },
})
