import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

export const sendMessageToChat = mutation({
  args: {
    chatId: v.id("chats"),
    role: v.string(),
    content: v.string(),
    parentMessageId: v.optional(v.id("messages")),
    reasoningText: v.optional(v.string()),
    experimentalAttachments: v.optional(v.any()),
  },
  returns: v.object({ messageId: v.id("messages") }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }
    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      userId,
      role: args.role,
      content: args.content,
      parentMessageId: args.parentMessageId,
      reasoningText: args.reasoningText,
      experimentalAttachments: args.experimentalAttachments,
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.chatId, { updatedAt: Date.now() });
    await ctx.runMutation(api.users.checkAndIncrementUsage, {});
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
