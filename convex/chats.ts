import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

export const createChat = mutation({
  args: {
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  returns: v.object({ chatId: v.id("chats") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Not authenticated")
    }
    const now = Date.now()
    const chatId = await ctx.db.insert("chats", {
      userId,
      title: args.title ?? "New Chat",
      model: args.model,
      systemPrompt: args.systemPrompt,
      createdAt: now,
      updatedAt: now,
    })
    return { chatId }
  },
})

export const listChatsForUser = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("chats"),
      _creationTime: v.number(),
      userId: v.id("users"),
      title: v.optional(v.string()),
      model: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
      originalChatId: v.optional(v.id("chats")),
      isPinned: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return []
    return await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()
  },
})

export const getChat = query({
  args: { chatId: v.id("chats") },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("chats"),
      _creationTime: v.number(),
      userId: v.id("users"),
      title: v.optional(v.string()),
      model: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
      originalChatId: v.optional(v.id("chats")),
      isPinned: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx, { chatId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const chat = await ctx.db.get(chatId)
    if (!chat || chat.userId !== userId) return null
    return chat
  },
})

export const updateChatModel = mutation({
  args: { chatId: v.id("chats"), model: v.string() },
  returns: v.null(),
  handler: async (ctx, { chatId, model }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const chat = await ctx.db.get(chatId)
    if (!chat || chat.userId !== userId) return null
    await ctx.db.patch(chatId, { model, updatedAt: Date.now() })
    return null
  },
})

export const updateChatTitle = mutation({
  args: { chatId: v.id("chats"), title: v.string() },
  returns: v.null(),
  handler: async (ctx, { chatId, title }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const chat = await ctx.db.get(chatId)
    if (!chat || chat.userId !== userId) return null
    await ctx.db.patch(chatId, { title, updatedAt: Date.now() })
    return null
  },
})

export const deleteChat = mutation({
  args: { chatId: v.id("chats") },
  returns: v.null(),
  handler: async (ctx, { chatId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null
    const chat = await ctx.db.get(chatId)
    if (!chat || chat.userId !== userId) return null

    // Branch cleanup: Find all chats that are branched from this chat
    const branchedChats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("originalChatId"), chatId))
      .collect()

    // Remove the branch reference from all branched chats
    for (const branchedChat of branchedChats) {
      await ctx.db.patch(branchedChat._id, {
        originalChatId: undefined,
        updatedAt: Date.now(),
      })
    }

    for await (const m of ctx.db
      .query("messages")
      .withIndex("by_chat_and_created", (q) => q.eq("chatId", chatId))) {
      await ctx.db.delete(m._id)
    }
    for await (const a of ctx.db
      .query("chat_attachments")
      .withIndex("by_chatId", (q) => q.eq("chatId", chatId))) {
      await ctx.db.delete(a._id)
    }
    await ctx.db.delete(chatId)
    return null
  },
})

export const deleteAllChatsForUser = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const chats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect()

    for (const chat of chats) {
      for await (const m of ctx.db
        .query("messages")
        .withIndex("by_chat_and_created", (q) => q.eq("chatId", chat._id))) {
        await ctx.db.delete(m._id)
      }
      for await (const a of ctx.db
        .query("chat_attachments")
        .withIndex("by_chatId", (q) => q.eq("chatId", chat._id))) {
        await ctx.db.delete(a._id)
      }
      await ctx.db.delete(chat._id)
    }
    return null
  },
})

export const branchChat = mutation({
  args: {
    originalChatId: v.id("chats"),
    branchFromMessageId: v.id("messages"),
  },
  returns: v.object({ chatId: v.id("chats") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      throw new Error("Not authenticated")
    }

    // Verify user owns the original chat
    const originalChat = await ctx.db.get(args.originalChatId)
    if (!originalChat || originalChat.userId !== userId) {
      throw new Error("Original chat not found or unauthorized")
    }

    // Verify the branch message exists and belongs to the chat
    const branchMessage = await ctx.db.get(args.branchFromMessageId)
    if (!branchMessage || branchMessage.chatId !== args.originalChatId) {
      throw new Error("Branch message not found or doesn't belong to the chat")
    }

    // Only allow branching from assistant messages
    if (branchMessage.role !== "assistant") {
      throw new Error("Can only branch from assistant messages")
    }

    // Get the branch message creation time for filtering
    const branchTimestamp =
      branchMessage.createdAt ?? branchMessage._creationTime

    // Create new chat with same properties as original but mark as branched
    const now = Date.now()
    const newChatId = await ctx.db.insert("chats", {
      userId,
      title: originalChat.title || "New Chat",
      model: originalChat.model,
      systemPrompt: originalChat.systemPrompt,
      originalChatId: args.originalChatId,
      createdAt: now,
      updatedAt: now,
    })

    // Get all messages up to and including the branch point
    const messagesToCopy = await ctx.db
      .query("messages")
      .withIndex("by_chat_and_created", (q) =>
        q.eq("chatId", args.originalChatId)
      )
      .order("asc")
      .collect()

    // Copy messages up to and including the branch message
    for (const message of messagesToCopy) {
      const messageTimestamp = message.createdAt ?? message._creationTime

      // Include messages up to and including the branch message
      if (messageTimestamp <= branchTimestamp) {
        await ctx.db.insert("messages", {
          chatId: newChatId,
          userId: message.userId,
          role: message.role,
          content: message.content,
          createdAt: message.createdAt,
          experimentalAttachments: message.experimentalAttachments,
          parentMessageId: message.parentMessageId,
          reasoningText: message.reasoningText,
          model: message.model,
        })
      }

      // Stop after we've processed the branch message
      if (message._id === args.branchFromMessageId) {
        break
      }
    }

    return { chatId: newChatId }
  },
})

export const pinChatToggle = mutation({
  args: { chatId: v.id("chats") },
  returns: v.null(),
  handler: async (ctx, { chatId }) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) return null

    const chat = await ctx.db.get(chatId)
    if (!chat || chat.userId !== userId) return null

    // Toggle the isPinned status
    const newPinnedStatus = !chat.isPinned

    await ctx.db.patch(chatId, {
      isPinned: newPinnedStatus,
    })

    return null
  },
})
