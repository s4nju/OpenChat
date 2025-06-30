import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
// Import helper functions
import {
  ensureAuthenticated,
  ensureChatAccess,
  tryEnsureChatAccess,
  validateChatOwnership,
} from './lib/auth_helper';
import {
  deleteChatCompletely,
  deleteMultipleChats,
} from './lib/cleanup_helper';
import { Chat } from './schema/chat';

export const createChat = mutation({
  args: {
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  returns: v.object({ chatId: v.id('chats') }),
  handler: async (ctx, args) => {
    const userId = await ensureAuthenticated(ctx);
    const now = Date.now();
    const chatId = await ctx.db.insert('chats', {
      userId,
      title: args.title ?? 'New Chat',
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
      _id: v.id('chats'),
      _creationTime: v.number(),
      ...Chat.fields,
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    return await ctx.db
      .query('chats')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect();
  },
});

export const getChat = query({
  args: { chatId: v.id('chats') },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('chats'),
      _creationTime: v.number(),
      ...Chat.fields,
    })
  ),
  handler: async (ctx, { chatId }) => {
    const result = await tryEnsureChatAccess(ctx, chatId);
    return result?.chat ?? null;
  },
});

export const updateChatModel = mutation({
  args: { chatId: v.id('chats'), model: v.string() },
  returns: v.null(),
  handler: async (ctx, { chatId, model }) => {
    const result = await tryEnsureChatAccess(ctx, chatId);
    if (!result) {
      return null;
    }
    await ctx.db.patch(chatId, { model, updatedAt: Date.now() });
    return null;
  },
});

export const updateChatTitle = mutation({
  args: { chatId: v.id('chats'), title: v.string() },
  returns: v.null(),
  handler: async (ctx, { chatId, title }) => {
    const result = await tryEnsureChatAccess(ctx, chatId);
    if (!result) {
      return null;
    }
    await ctx.db.patch(chatId, { title, updatedAt: Date.now() });
    return null;
  },
});

export const deleteChat = mutation({
  args: { chatId: v.id('chats') },
  returns: v.null(),
  handler: async (ctx, { chatId }) => {
    const result = await tryEnsureChatAccess(ctx, chatId);
    if (!result) {
      return null;
    }
    const { userId } = result;
    await deleteChatCompletely(ctx, chatId, userId);
    return null;
  },
});

export const deleteAllChatsForUser = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const chats = await ctx.db
      .query('chats')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();

    await deleteMultipleChats(ctx, chats, userId);
    return null;
  },
});

export const deleteBulkChats = mutation({
  args: { chatIds: v.array(v.id('chats')) },
  returns: v.null(),
  handler: async (ctx, { chatIds }) => {
    if (chatIds.length === 0) {
      return null;
    }

    // Validate all chats belong to the user
    const validChats = await validateChatOwnership(ctx, chatIds);
    if (validChats.length === 0) {
      return null;
    }

    // Get userId from the first valid chat (all have same owner)
    const userId = validChats[0].userId;
    await deleteMultipleChats(ctx, validChats, userId);
    return null;
  },
});

export const branchChat = mutation({
  args: {
    originalChatId: v.id('chats'),
    branchFromMessageId: v.id('messages'),
  },
  returns: v.object({ chatId: v.id('chats') }),
  handler: async (ctx, args) => {
    // Verify user owns the original chat
    const { chat: originalChat, userId } = await ensureChatAccess(
      ctx,
      args.originalChatId
    );

    // Verify the branch message exists and belongs to the chat
    const branchMessage = await ctx.db.get(args.branchFromMessageId);
    if (!branchMessage || branchMessage.chatId !== args.originalChatId) {
      throw new Error("Branch message not found or doesn't belong to the chat");
    }

    // Only allow branching from assistant messages
    if (branchMessage.role !== 'assistant') {
      throw new Error('Can only branch from assistant messages');
    }

    // Get the branch message creation time for filtering
    const branchTimestamp =
      branchMessage.createdAt ?? branchMessage._creationTime;

    // Create new chat with same properties as original but mark as branched
    const now = Date.now();
    const newChatId = await ctx.db.insert('chats', {
      userId,
      title: originalChat.title || 'New Chat',
      model: originalChat.model,
      systemPrompt: originalChat.systemPrompt,
      originalChatId: args.originalChatId,
      createdAt: now,
      updatedAt: now,
    });

    // Get all messages up to and including the branch point
    const messagesToCopy = await ctx.db
      .query('messages')
      .withIndex('by_chat_and_created', (q) =>
        q.eq('chatId', args.originalChatId)
      )
      .order('asc')
      .collect();

    // Copy messages up to and including the branch message in parallel
    const messageInsertPromises: Promise<Id<'messages'>>[] = [];
    for (const message of messagesToCopy) {
      const messageTimestamp = message.createdAt ?? message._creationTime;

      // Include messages up to and including the branch message
      if (messageTimestamp <= branchTimestamp) {
        messageInsertPromises.push(
          ctx.db.insert('messages', {
            chatId: newChatId,
            userId: message.userId,
            role: message.role,
            content: message.content,
            createdAt: message.createdAt,
            parentMessageId: message.parentMessageId,
            parts: message.parts,
            metadata: message.metadata,
          })
        );
      }

      // Stop after we've processed the branch message
      if (message._id === args.branchFromMessageId) {
        break;
      }
    }

    // Execute all message insertions in parallel
    await Promise.all(messageInsertPromises);

    return { chatId: newChatId };
  },
});

export const pinChatToggle = mutation({
  args: { chatId: v.id('chats') },
  returns: v.null(),
  handler: async (ctx, { chatId }) => {
    const result = await tryEnsureChatAccess(ctx, chatId);
    if (!result) {
      return null;
    }

    const { chat } = result;

    // Toggle the isPinned status
    const newPinnedStatus = !chat.isPinned;

    await ctx.db.patch(chatId, {
      isPinned: newPinnedStatus,
    });

    return null;
  },
});
