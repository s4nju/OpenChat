import { v } from 'convex/values';

export const ChatAttachment = v.object({
  userId: v.id('users'),
  chatId: v.id('chats'),
  fileId: v.id('_storage'), // Reference to Convex File Storage
  fileName: v.string(),
  fileType: v.string(),
  fileSize: v.number(),
  isGenerated: v.optional(v.boolean()), // Indicates if this is an AI-generated image
});
