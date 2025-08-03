import { v } from 'convex/values';

export const ScheduledTask = v.object({
  userId: v.id('users'),
  title: v.string(),
  prompt: v.string(),
  scheduleType: v.union(
    v.literal('onetime'),
    v.literal('daily'),
    v.literal('weekly')
  ),
  scheduledTime: v.string(), // "HH:MM" for daily, "day:HH:MM" for weekly, ISO string for onetime
  timezone: v.string(),
  isActive: v.boolean(),
  enableSearch: v.optional(v.boolean()),
  enabledToolSlugs: v.optional(v.array(v.string())),
  lastExecuted: v.optional(v.number()),
  nextExecution: v.optional(v.number()),
  scheduledFunctionId: v.optional(v.string()), // Convex scheduled function ID
  createdAt: v.number(),
  chatId: v.optional(v.id('chats')), // Optional: link to specific chat
});
