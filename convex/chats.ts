import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const createChat = mutation({
  args: {
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  returns: v.object({ chatId: v.id("chats") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const now = Date.now();
    const chatId = await ctx.db.insert("chats", {
      userId,
      title: args.title ?? "New Chat",
      model: args.model,
      systemPrompt: args.systemPrompt,
      createdAt: now,
      updatedAt: now,
    });
    return { chatId };
  },
});

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
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const updateChatModel = mutation({
  args: { chatId: v.id("chats"), model: v.string() },
  returns: v.null(),
  handler: async (ctx, { chatId, model }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) return null;
    await ctx.db.patch(chatId, { model, updatedAt: Date.now() });
    return null;
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id("chats") },
  returns: v.null(),
  handler: async (ctx, { chatId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const chat = await ctx.db.get(chatId);
    if (!chat || chat.userId !== userId) return null;
    for await (const m of ctx.db
      .query("messages")
      .withIndex("by_chat_and_created", (q) => q.eq("chatId", chatId))) {
      await ctx.db.delete(m._id);
    }
    for await (const a of ctx.db
      .query("chat_attachments")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))) {
      await ctx.db.delete(a._id);
    }
    await ctx.db.delete(chatId);
    return null;
  },
});
