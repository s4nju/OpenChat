import { v } from 'convex/values';

export const Connector = v.object({
  userId: v.id('users'),
  type: v.union(
    v.literal('gmail'),
    v.literal('googlecalendar'),
    v.literal('googledrive'),
    v.literal('notion')
  ),
  connectionId: v.string(),
  isConnected: v.boolean(),
  displayName: v.optional(v.string()),
});
