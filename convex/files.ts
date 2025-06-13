import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

/**
 * Generates a secure URL for uploading a file to Convex storage.
 */
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

/**
 * Saves the metadata of a successfully uploaded file to the database.
 */
export const saveFileAttachment = action({
  args: {
    storageId: v.id("_storage"),
    chatId: v.id("chats"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args): Promise<any> => {
    const attachmentId = await ctx.runMutation(api.files.internalSave, args);
    const attachment = await ctx.runQuery(api.files.getAttachment, { attachmentId });
    if (!attachment) {
      throw new Error("Attachment not found");
    }
    const url = await ctx.storage.getUrl(attachment.fileId);
    return { ...attachment, url };
  },
});

export const internalSave = mutation({
  args: {
    storageId: v.id("_storage"),
    chatId: v.id("chats"),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.db.insert("chat_attachments", {
      userId: userId,
      chatId: args.chatId,
      fileId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
    });
  },
});

export const getAttachment = query({
  args: { attachmentId: v.id("chat_attachments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.attachmentId);
  },
});

/**
 * Fetches all attachments for a given chat, including their download URLs.
 */
export const getAttachmentsForChat = query({
    args: { chatId: v.id("chats") },
    handler: async (ctx, args) => {
        const attachments = await ctx.db
            .query("chat_attachments")
            .withIndex("by_chatId", q => q.eq("chatId", args.chatId))
            .collect();
        
        return Promise.all(
            attachments.map(async (attachment) => ({
                ...attachment,
                url: await ctx.storage.getUrl(attachment.fileId),
            }))
        );
    }
});
