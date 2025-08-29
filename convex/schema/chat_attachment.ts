import { v } from 'convex/values';

export const ChatAttachment = v.object({
  userId: v.id('users'),
  chatId: v.id('chats'),
  key: v.string(), // R2 object key
  fileName: v.string(), // display name
  fileType: v.string(),
  fileSize: v.number(),
  isGenerated: v.optional(v.boolean()), // Indicates if this is an AI-generated image
  url: v.optional(v.string()), // Permanent public storage URL
});
