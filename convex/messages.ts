import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { type MutationCtx, mutation, query } from './_generated/server';
// Import helper functions
import { ensureChatAccess, ensureMessageAccess } from './lib/auth_helper';
import { MessagePart } from './schema/parts';

/**
 * Regex to detect Convex storage IDs (32-character hex strings)
 */
const CONVEX_STORAGE_ID_REGEX = /^[a-z0-9]{32}$/;

/**
 * Helper to detect if a string is a Convex storage ID
 */
function isConvexStorageId(value: string): boolean {
  return (
    CONVEX_STORAGE_ID_REGEX.test(value) &&
    !value.startsWith('http') &&
    !value.startsWith('data:') &&
    !value.startsWith('blob:')
  );
}

/**
 * Helper function to clean up attachments for messages
 */
async function cleanupMessageAttachments(
  ctx: MutationCtx,
  messagesToDelete: Doc<'messages'>[],
  userId: Id<'users'>
) {
  const attachmentCleanupPromises: Promise<void>[] = [];

  for (const msgToDelete of messagesToDelete) {
    if (msgToDelete.parts) {
      for (const part of msgToDelete.parts) {
        if (part.type === 'file' && part.data && isConvexStorageId(part.data)) {
          attachmentCleanupPromises.push(
            cleanupSingleAttachment(ctx, msgToDelete.chatId, part.data, userId)
          );
        }
      }
    }
  }

  await Promise.allSettled(attachmentCleanupPromises);
}

/**
 * Helper function to clean up a single attachment
 */
async function cleanupSingleAttachment(
  ctx: MutationCtx,
  chatId: Id<'chats'>,
  fileId: string,
  userId: Id<'users'>
) {
  try {
    // This uses .filter() correctly - first narrows by index (by_chatId), then filters by fileId
    // See: https://docs.convex.dev/database/indexes/ - "For all other filtering you can use the .filter method"
    const attachment = await ctx.db
      .query('chat_attachments')
      .withIndex('by_chatId', (q) => q.eq('chatId', chatId))
      .filter((q) => q.eq(q.field('fileId'), fileId))
      .first();

    if (attachment && attachment.userId === userId) {
      await ctx.storage.delete(attachment.fileId as Id<'_storage'>);
      await ctx.db.delete(attachment._id);
    }
  } catch (_error) {
    // Silently continue with other cleanup if one attachment fails
  }
}

/**
 * Helper function to clean up branched chats
 */
async function cleanupBranchedChats(
  ctx: MutationCtx,
  chatId: Id<'chats'>,
  userId: Id<'users'>
) {
  // This uses .filter() correctly - first narrows by index (by_user), then filters by originalChatId
  // See: https://docs.convex.dev/database/indexes/ - "For all other filtering you can use the .filter method"
  const branchedChats = await ctx.db
    .query('chats')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .filter((q) => q.eq(q.field('originalChatId'), chatId))
    .collect();

  const updatePromises = branchedChats.map((branchedChat: Doc<'chats'>) =>
    ctx.db.patch(branchedChat._id, {
      originalChatId: undefined,
      updatedAt: Date.now(),
    })
  );

  await Promise.all(updatePromises);
}

/**
 * Helper function to clean up orphaned attachments
 */
async function cleanupOrphanedAttachments(
  ctx: MutationCtx,
  chatId: Id<'chats'>
) {
  const orphanedAttachments = await ctx.db
    .query('chat_attachments')
    .withIndex('by_chatId', (q) => q.eq('chatId', chatId))
    .collect();

  const cleanupPromises = orphanedAttachments.map(
    async (attachment: Doc<'chat_attachments'>) => {
      try {
        await ctx.storage.delete(attachment.fileId as Id<'_storage'>);
        await ctx.db.delete(attachment._id);
      } catch (_error) {
        // Silently continue with other cleanup
      }
    }
  );

  await Promise.allSettled(cleanupPromises);
}

export const sendUserMessageToChat = mutation({
  args: {
    chatId: v.id('chats'),
    role: v.union(
      v.literal('user'),
      v.literal('assistant'),
      v.literal('system')
    ),
    content: v.string(),
    parentMessageId: v.optional(v.id('messages')),
    parts: v.optional(v.array(MessagePart)),
    metadata: v.optional(
      v.object({
        modelId: v.optional(v.string()),
        modelName: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        reasoningTokens: v.optional(v.number()),
        serverDurationMs: v.optional(v.number()),
        includeSearch: v.optional(v.boolean()),
        reasoningEffort: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({ messageId: v.id('messages') }),
  handler: async (ctx, args) => {
    // Verify that the authenticated user owns the chat
    const { userId } = await ensureChatAccess(ctx, args.chatId);

    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId,
      role: args.role,
      content: args.content,
      parentMessageId: args.parentMessageId,
      parts: args.parts,
      metadata: args.metadata || {},
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.chatId, { updatedAt: Date.now() });
    return { messageId };
  },
});

export const saveAssistantMessage = mutation({
  args: {
    chatId: v.id('chats'),
    role: v.union(
      v.literal('user'),
      v.literal('assistant'),
      v.literal('system')
    ),
    content: v.string(),
    parentMessageId: v.optional(v.id('messages')),
    parts: v.optional(v.array(MessagePart)),
    metadata: v.optional(
      v.object({
        modelId: v.optional(v.string()),
        modelName: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        reasoningTokens: v.optional(v.number()),
        serverDurationMs: v.optional(v.number()),
        includeSearch: v.optional(v.boolean()),
        reasoningEffort: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({ messageId: v.id('messages') }),
  handler: async (ctx, args) => {
    // Verify that the authenticated user owns the chat
    const { userId } = await ensureChatAccess(ctx, args.chatId);

    const messageId = await ctx.db.insert('messages', {
      chatId: args.chatId,
      userId,
      role: args.role,
      content: args.content,
      parentMessageId: args.parentMessageId,
      parts: args.parts,
      metadata: args.metadata || {},
      createdAt: Date.now(),
    });
    await ctx.db.patch(args.chatId, { updatedAt: Date.now() });
    return { messageId };
  },
});

export const getMessagesForChat = query({
  args: { chatId: v.id('chats') },
  returns: v.array(
    v.object({
      _id: v.id('messages'),
      _creationTime: v.number(),
      chatId: v.id('chats'),
      userId: v.optional(v.id('users')),
      role: v.union(
        v.literal('user'),
        v.literal('assistant'),
        v.literal('system')
      ),
      content: v.string(),
      createdAt: v.optional(v.number()),
      parts: v.optional(v.array(MessagePart)),
      parentMessageId: v.optional(v.id('messages')),
      metadata: v.object({
        modelId: v.optional(v.string()),
        modelName: v.optional(v.string()),
        promptTokens: v.optional(v.number()),
        completionTokens: v.optional(v.number()),
        reasoningTokens: v.optional(v.number()),
        serverDurationMs: v.optional(v.number()),
        includeSearch: v.optional(v.boolean()),
        reasoningEffort: v.optional(v.string()),
      }),
    })
  ),
  handler: async (ctx, { chatId }) => {
    // Verify user has access (but don't throw - return empty array)
    try {
      await ensureChatAccess(ctx, chatId);
    } catch {
      return [];
    }

    const messages = await ctx.db
      .query('messages')
      .withIndex('by_chat_and_created', (q) => q.eq('chatId', chatId))
      .order('asc')
      .collect();

    // Generate URLs on-the-fly for file parts containing storage IDs
    return Promise.all(
      messages.map(async (message) => {
        if (!message.parts) {
          return message;
        }

        const resolvedParts = await Promise.all(
          message.parts.map(async (part) => {
            if (
              part.type === 'file' &&
              part.data &&
              isConvexStorageId(part.data)
            ) {
              try {
                // Generate fresh URL from storage ID
                const url = await ctx.storage.getUrl(part.data);
                return { ...part, url: url || undefined }; // Use undefined instead of null for TypeScript compatibility
              } catch (_error) {
                return part; // Return part without URL if generation fails
              }
            }
            return part;
          })
        );

        return { ...message, parts: resolvedParts };
      })
    );
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id('messages') },
  returns: v.null(),
  handler: async (ctx, { messageId }) => {
    try {
      await ensureMessageAccess(ctx, messageId);
      await ctx.db.delete(messageId);
      return null;
    } catch {
      return null;
    }
  },
});

export const getMessageDetails = query({
  args: { messageId: v.id('messages') },
  returns: v.union(
    v.null(),
    v.object({
      parentMessageId: v.optional(v.id('messages')),
      role: v.union(
        v.literal('user'),
        v.literal('assistant'),
        v.literal('system')
      ),
    })
  ),
  handler: async (ctx, args) => {
    try {
      const { message } = await ensureMessageAccess(ctx, args.messageId);
      return {
        parentMessageId: message.parentMessageId,
        role: message.role,
      };
    } catch {
      return null;
    }
  },
});

export const deleteMessageAndDescendants = mutation({
  args: { messageId: v.id('messages') },
  returns: v.object({ chatDeleted: v.boolean() }),
  handler: async (ctx, { messageId }) => {
    // Try to get message access
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { chatDeleted: false };
    }
    const message = await ctx.db.get(messageId);
    if (!message) {
      return { chatDeleted: false };
    }
    const chat = await ctx.db.get(message.chatId);
    if (!chat || chat.userId !== userId) {
      return { chatDeleted: false };
    }

    const threshold = message.createdAt ?? message._creationTime;

    // Fix: Use .collect() directly instead of async iteration
    // See: https://docs.convex.dev/database/reading-data
    const messagesToDelete = await ctx.db
      .query('messages')
      .withIndex('by_chat_and_created', (q) => q.eq('chatId', message.chatId))
      .order('asc')
      .filter((q) => {
        // This uses .filter() correctly - filters by time after using index for chatId
        // Range queries can't be combined with .eq(), so .filter() is necessary here
        // See: https://docs.convex.dev/database/indexes/
        return q.gte(
          q.field('createdAt') ?? q.field('_creationTime'),
          threshold
        );
      })
      .collect();

    const ids = messagesToDelete.map((m) => m._id);

    // Clean up attachments
    await cleanupMessageAttachments(ctx, messagesToDelete, userId);

    // Delete messages in batch
    const deletePromises = ids.map((id) => ctx.db.delete(id));
    await Promise.all(deletePromises);

    // Update chat timestamp
    await ctx.db.patch(chat._id, { updatedAt: Date.now() });

    const remaining = await ctx.db
      .query('messages')
      .withIndex('by_chat_and_created', (q) => q.eq('chatId', message.chatId))
      .first();

    if (!remaining) {
      // Clean up branched chats
      await cleanupBranchedChats(ctx, chat._id, userId);

      // Clean up any remaining orphaned attachments for this chat
      await cleanupOrphanedAttachments(ctx, chat._id);

      await ctx.db.delete(chat._id);
      return { chatDeleted: true };
    }
    return { chatDeleted: false };
  },
});

export const searchMessages = query({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: v.array(
    v.object({
      _id: v.id('messages'),
      chatId: v.id('chats'),
      content: v.string(),
      createdAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, { query: search, limit = 20 }) => {
    const safeLimit = Math.min(Math.max(1, limit), 100); // Cap between 1-100
    const userId = await getAuthUserId(ctx);
    if (!userId || search.trim() === '') {
      return [];
    }

    const results = await ctx.db
      .query('messages')
      .withSearchIndex('by_user_content', (q) =>
        q.search('content', search).eq('userId', userId)
      )
      .take(safeLimit);

    return results.map((msg) => ({
      _id: msg._id,
      chatId: msg.chatId,
      content: msg.content,
      createdAt: msg.createdAt,
    }));
  },
});
