import { v } from 'convex/values';

export const Purchase = v.object({
  amount: v.number(),
  status: v.string(),
  stripePaymentId: v.string(),
  userId: v.id('users'),
  createdAt: v.optional(v.number()),
});
