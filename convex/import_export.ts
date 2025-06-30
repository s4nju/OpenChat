import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation } from './_generated/server';
import { MessagePart } from './schema/parts';

export const bulkImportChat = mutation({
  args: {
    chat: v.object({
      title: v.optional(v.string()),
      model: v.optional(v.string()),
      systemPrompt: v.optional(v.string()),
    }),
    messages: v.array(
      v.object({
        role: v.union(
          v.literal('user'),
          v.literal('assistant'),
          v.literal('system')
        ),
        content: v.string(),
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
        createdAt: v.optional(v.number()),
        parentMessageId: v.optional(v.id('messages')),
        originalId: v.optional(v.string()),
        parentOriginalId: v.optional(v.string()),
      })
    ),
  },
  returns: v.object({
    chatId: v.id('chats'),
    messageCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Create chat
    const now = Date.now();
    const chatId = await ctx.db.insert('chats', {
      userId,
      title: args.chat.title ?? 'Imported Chat',
      model: args.chat.model,
      systemPrompt: args.chat.systemPrompt,
      createdAt: now,
      updatedAt: now,
    });

    // Create ID mapping for threading
    const idMap = new Map<string, Id<'messages'>>();

    // Insert all messages in order (preserving threading)
    for (const msg of args.messages) {
      const parentMessageId = msg.parentOriginalId
        ? idMap.get(msg.parentOriginalId)
        : undefined;

      // biome-ignore lint/nursery/noAwaitInLoop: <need sequential processing to preserve threading>
      const messageId = await ctx.db.insert('messages', {
        chatId,
        userId, // Always attribute imported messages to the importing user for consistency
        role: msg.role,
        content: msg.content,
        parts: msg.parts,
        metadata: msg.metadata ?? {},
        parentMessageId,
        createdAt: msg.createdAt ?? now,
      });

      if (msg.originalId) {
        idMap.set(msg.originalId, messageId);
      }
    }

    // Update chat timestamp to reflect last message
    await ctx.db.patch(chatId, { updatedAt: now });

    return { chatId, messageCount: args.messages.length };
  },
});
