import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { action, mutation, query } from './_generated/server';

/**
 * Generates a secure URL for uploading a file to Convex storage.
 */
export const generateUploadUrl = action({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// Allowed MIME types and file size limit (10 MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MiB
const ALLOWED_FILE_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // PDF
  'application/pdf',
] as const;

// Only these models currently support file inputs. Update as new ones roll out.
const FILE_UPLOAD_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'Llama-4-Maverick-17B-128E-Instruct-FP8',
  'Llama-4-Scout-17B-16E-Instruct',
  'pixtral-large-latest',
  // Upcoming / temporarily unavailable models still supporting file uploads
  'claude-3-5-sonnet',
  'claude-3.7-sonnet',
  'grok-3',
] as const;

type AllowedMimeType = (typeof ALLOWED_FILE_MIME_TYPES)[number];
type FileUploadModel = (typeof FILE_UPLOAD_MODELS)[number];

type SavedAttachment = {
  _id: Id<'chat_attachments'>;
  _creationTime: number;
  userId: Id<'users'>;
  chatId: Id<'chats'>;
  fileId: Id<'_storage'>;
  fileName: string;
  fileType: string;
  fileSize: number;
  storageId: Id<'_storage'>;
};

/**
 * Saves the metadata of a successfully uploaded file to the database.
 * Returns storage ID instead of temporary URL for permanent reference.
 */
export const saveFileAttachment = action({
  args: {
    storageId: v.id('_storage'),
    chatId: v.id('chats'),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args): Promise<SavedAttachment> => {
    const attachmentId = await ctx.runMutation(api.files.internalSave, args);
    const attachment = await ctx.runQuery(api.files.getAttachment, {
      attachmentId,
    });
    if (!attachment) {
      throw new Error('Attachment not found');
    }
    // Return storage ID instead of temporary URL - URLs will be generated on-demand
    return { ...attachment, storageId: attachment.fileId };
  },
});

/**
 * Saves a generated image to the attachments table with isGenerated flag
 */
export const saveGeneratedImage = action({
  args: {
    storageId: v.id('_storage'),
    chatId: v.id('chats'),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args): Promise<SavedAttachment> => {
    const attachmentId = await ctx.runMutation(
      api.files.internalSaveGenerated,
      args
    );
    const attachment = await ctx.runQuery(api.files.getAttachment, {
      attachmentId,
    });
    if (!attachment) {
      throw new Error('Attachment not found');
    }
    // Return storage ID instead of temporary URL - URLs will be generated on-demand
    return { ...attachment, storageId: attachment.fileId };
  },
});

export const internalSave = mutation({
  args: {
    storageId: v.id('_storage'),
    chatId: v.id('chats'),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify ownership of the chat before attaching the file
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      // Clean up orphaned file if chat not found
      await ctx.storage.delete(args.storageId);
      throw new Error('Chat not found or unauthorized');
    }

    // Check that the chat's model can accept file uploads
    const modelName = chat.model ?? undefined;
    if (
      !(modelName && FILE_UPLOAD_MODELS.includes(modelName as FileUploadModel))
    ) {
      await ctx.storage.delete(args.storageId);
      throw new Error('ERR_UNSUPPORTED_MODEL');
    }

    // Enforce MIME type allow-list
    if (!ALLOWED_FILE_MIME_TYPES.includes(args.fileType as AllowedMimeType)) {
      await ctx.storage.delete(args.storageId);
      throw new Error('ERR_BAD_MIME');
    }

    // Enforce maximum size
    if (args.fileSize > MAX_FILE_SIZE) {
      await ctx.storage.delete(args.storageId);
      throw new Error('ERR_FILE_TOO_LARGE');
    }

    return await ctx.db.insert('chat_attachments', {
      userId,
      chatId: args.chatId,
      fileId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
    });
  },
});

export const internalSaveGenerated = mutation({
  args: {
    storageId: v.id('_storage'),
    chatId: v.id('chats'),
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify ownership of the chat before attaching the file
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      // Clean up orphaned file if chat not found
      await ctx.storage.delete(args.storageId);
      throw new Error('Chat not found or unauthorized');
    }

    // Generated images don't need model validation since they're created by our system
    // Also don't need MIME type validation since we control the generation

    return await ctx.db.insert('chat_attachments', {
      userId,
      chatId: args.chatId,
      fileId: args.storageId,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      isGenerated: true, // Mark as AI-generated
    });
  },
});

export const getAttachment = query({
  args: { attachmentId: v.id('chat_attachments') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const attachment = await ctx.db.get(args.attachmentId);
    if (!attachment || attachment.userId !== userId) {
      throw new Error('Attachment not found or unauthorized');
    }
    return attachment;
  },
});

/**
 * Generates a fresh URL for a storage ID
 */
export const getStorageUrl = query({
  args: { storageId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    try {
      // Generate URL from storage ID
      return await ctx.storage.getUrl(args.storageId as Id<'_storage'>);
    } catch {
      // Silently handle URL generation errors
      return null;
    }
  },
});

/**
 * Fetches all attachments for a given chat, including their download URLs.
 */
export const getAttachmentsForUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const attachments = await ctx.db
      .query('chat_attachments')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();

    return Promise.all(
      attachments.map(async (attachment) => ({
        ...attachment,
        url: await ctx.storage.getUrl(attachment.fileId),
      }))
    );
  },
});

export const deleteAttachments = mutation({
  args: { attachmentIds: v.array(v.id('chat_attachments')) },
  handler: async (ctx, { attachmentIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const validAttachments: Array<{
      _id: Id<'chat_attachments'>;
      userId: Id<'users'>;
      chatId: Id<'chats'>;
      fileId: Id<'_storage'>;
      fileName: string;
      fileType: string;
      fileSize: number;
      _creationTime: number;
    }> = [];

    const attachments = await Promise.all(
      attachmentIds.map((id) => ctx.db.get(id))
    );

    for (const attachment of attachments) {
      if (attachment && attachment.userId === userId) {
        validAttachments.push(attachment);
      }
      // Silently skip invalid attachments
    }

    const fileIdsToDelete = validAttachments.map(
      (a) => a.fileId as Id<'_storage'>
    );
    await Promise.all(fileIdsToDelete.map((id) => ctx.storage.delete(id)));

    const docIdsToDelete = validAttachments.map((a) => a._id);
    await Promise.all(docIdsToDelete.map((id) => ctx.db.delete(id)));
  },
});

export const getAttachmentsForChat = query({
  args: { chatId: v.id('chats') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Verify ownership of the chat
    const chat = await ctx.db.get(args.chatId);
    if (!chat || chat.userId !== userId) {
      throw new Error('Chat not found or unauthorized');
    }

    const attachments = await ctx.db
      .query('chat_attachments')
      .withIndex('by_chatId', (q) => q.eq('chatId', args.chatId))
      .collect();

    return Promise.all(
      attachments.map(async (attachment) => ({
        ...attachment,
        url: await ctx.storage.getUrl(attachment.fileId),
      }))
    );
  },
});
