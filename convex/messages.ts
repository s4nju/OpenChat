import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const sendUserMessageToChat = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.string(),
    content: v.string(),
    parentMessageId: v.optional(v.id("messages")),
    reasoningText: v.optional(v.string()),
    experimentalAttachments: v.optional(v.any()),
    model: v.optional(v.string()),
  },
  returns: v.object({ messageId: v.id("messages") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // Verify that the authenticated user owns the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found or unauthorized");
    }
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      userId,
      role: args.role,
      content: args.content,
      parentMessageId: args.parentMessageId,
      reasoningText: args.reasoningText,
      experimentalAttachments: args.experimentalAttachments,
      model: args.model,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.chatId, { updatedAt: Date.now() });
    return { messageId };
  },
});

export const saveAssistantMessage = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.string(),
    content: v.string(),
    parentMessageId: v.optional(v.id("messages")),
    reasoningText: v.optional(v.string()),
    experimentalAttachments: v.optional(v.any()),
    model: v.optional(v.string()),
  },
  returns: v.object({ messageId: v.id("messages") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    // Verify that the authenticated user owns the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error("Chat not found or unauthorized");
    }
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      userId,
      role: args.role,
      content: args.content,
      parentMessageId: args.parentMessageId,
      reasoningText: args.reasoningText,
      experimentalAttachments: args.experimentalAttachments,
      model: args.model,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.chatId, { updatedAt: Date.now() });
    return { messageId };
  },
});

export const getMessagesForChat = query({
  args: { chatId: v.id("chats") },
  returns: v.array(
    v.object({
      _id: v.id("messages"),
      _creationTime: v.number(),
      chatId: v.id("chats"),
      userId: v.optional(v.id("users")),
      role: v.string(),
      content: v.string(),
      createdAt: v.optional(v.number()),
      experimentalAttachments: v.optional(v.any()),
      parentMessageId: v.optional(v.id("messages")),
      reasoningText: v.optional(v.string()),
      model: v.optional(v.string()),
    })
  ),
  handler: async (ctx, { chatId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) return [];
    return await ctx.db
      .query("messages")
      .withIndex("by_chat_and_created", (q) => q.eq("chatId", chatId))
      .order("asc")
      .collect();
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const message = await ctx.db.get(messageId);
    if (!message) return null;
    const chat = await ctx.db.get(message.chatId);
    if (!chat || chat.userId !== userId) return null;
    await ctx.db.delete(messageId);
    return null;
  },
});

export const getMessageDetails = query({
  args: { messageId: v.id("messages") },
  returns: v.union(
    v.null(),
    v.object({
      parentMessageId: v.optional(v.id("messages")),
      role: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const message = await ctx.db.get(args.messageId);
    if (!message) return null;

    const chat = await ctx.db.get(message.chatId);
    if (!chat || chat.userId !== userId) return null;

    return {
      parentMessageId: message.parentMessageId,
      role: message.role,
    };
  },
});

export const deleteMessageAndDescendants = mutation({
  args: { messageId: v.id("messages") },
  returns: v.object({ chatDeleted: v.boolean() }),
  handler: async (ctx, { messageId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { chatDeleted: false };
    const message = await ctx.db.get(messageId);
    if (!message) return { chatDeleted: false };
    const chat = await ctx.db.get(message.chatId);
    if (!chat || chat.userId !== userId) return { chatDeleted: false };
    const threshold = message.createdAt ?? message._creationTime;
    const ids: Array<Id<"messages">> = [];
    for await (const m of ctx.db
      .query("messages")
      .withIndex("by_chat_and_created", q => q.eq("chatId", message.chatId))
      .order("asc")) {
      const created = m.createdAt ?? m._creationTime;
      if (created >= threshold) ids.push(m._id);
    }
    for (const id of ids) {
      await ctx.db.delete(id);
    }
    // update chat timestamp
    await ctx.db.patch(chat._id, { updatedAt: Date.now() });
    const remaining = await ctx.db
      .query("messages")
      .withIndex("by_chat_and_created", q => q.eq("chatId", message.chatId))
      .first();
    if (!remaining) {
      for await (const a of ctx.db
        .query("chat_attachments")
        .withIndex("by_chatId", q => q.eq("chatId", chat._id))) {
        await ctx.db.delete(a._id);
      }
      await ctx.db.delete(chat._id);
      return { chatDeleted: true };
    }
    return { chatDeleted: false };
  },
});
