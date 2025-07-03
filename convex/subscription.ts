import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { internalMutation, type MutationCtx } from './_generated/server';
import { rateLimiter } from './rateLimiter';

/**
 * Handle subscription updated webhook event from Polar
 */
export const onSubscriptionUpdated = internalMutation({
  args: {
    directUserId: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, { directUserId }) => {
    // Use direct user ID if available
    if (directUserId) {
      const user = await ctx.db.get(directUserId as Id<'users'>);
      if (user) {
        await resetUserRateLimits(ctx, user._id, user.isAnonymous ?? false);
        return null;
      }
    }

    return null;
  },
});

/**
 * Helper function to reset all rate limits for a user
 */
async function resetUserRateLimits(
  ctx: MutationCtx,
  userId: Id<'users'>,
  isAnonymous: boolean
) {
  // Reset daily limits (for non-premium tracking)
  const dailyLimitName = isAnonymous ? 'anonymousDaily' : 'authenticatedDaily';

  try {
    await rateLimiter.reset(ctx, dailyLimitName, { key: userId });
    await rateLimiter.limit(ctx, dailyLimitName, { key: userId, count: 0 });
  } catch (_error) {
    // Ignore rate limit reset errors
  }

  // Reset monthly standard limits
  try {
    await rateLimiter.reset(ctx, 'standardMonthly', { key: userId });
    await rateLimiter.limit(ctx, 'standardMonthly', { key: userId, count: 0 });
  } catch (_error) {
    // Ignore rate limit reset errors
  }

  // Reset premium monthly limits
  try {
    await rateLimiter.reset(ctx, 'premiumMonthly', { key: userId });
    await rateLimiter.limit(ctx, 'premiumMonthly', { key: userId, count: 0 });
  } catch (_error) {
    // Ignore rate limit reset errors
  }
}
