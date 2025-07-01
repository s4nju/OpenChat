import { getAuthUserId } from '@convex-dev/auth/server';
import {
  calculateRateLimit,
  type RateLimitConfig,
} from '@convex-dev/rate-limiter';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { RATE_LIMITS } from './lib/rateLimitConstants';
import { rateLimiter } from './rateLimiter';
import { User } from './schema/user';

const MODEL_DEFAULT = 'gemini-2.0-flash';

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('users'),
      _creationTime: v.number(),
      ...User.fields,
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    return await ctx.db.get(userId);
  },
});

// Helper function to initialize user fields
const initializeUserFields = () => ({
  preferredModel: MODEL_DEFAULT,
});

// Helper function to get updates for existing user
const getExistingUserUpdates = (existing: Record<string, unknown>) => {
  const updates: Record<string, unknown> = {};

  if (existing.preferredModel === undefined) {
    updates.preferredModel = MODEL_DEFAULT;
  }

  return updates;
};

export const storeCurrentUser = mutation({
  args: { isAnonymous: v.optional(v.boolean()) },
  returns: v.object({ isNew: v.boolean() }),
  handler: async (ctx, { isAnonymous }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isNew: false };
    }

    const existing = await ctx.db.get(userId);
    if (existing) {
      const wasInitialized = existing.isAnonymous !== undefined;
      const updates = getExistingUserUpdates(existing);

      if (existing.isAnonymous !== isAnonymous) {
        updates.isAnonymous = isAnonymous;
      }

      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(userId, updates);
      }

      // Initialize rate limits for existing users who weren't previously initialized
      if (!wasInitialized) {
        try {
          const userIsPremium = existing.isPremium ?? false;
          const userIsAnonymous = isAnonymous ?? existing.isAnonymous ?? false;

          // Initialize daily limits for non-premium users
          if (!userIsPremium) {
            const dailyLimitName = userIsAnonymous
              ? 'anonymousDaily'
              : 'authenticatedDaily';
            await rateLimiter.reset(ctx, dailyLimitName, { key: userId });
          }

          // Initialize monthly limits for all users
          await rateLimiter.reset(ctx, 'standardMonthly', { key: userId });
        } catch {
          // Don't fail user updates if rate limit initialization fails
        }
      }

      return { isNew: !wasInitialized };
    }

    const newUserId = await ctx.db.insert('users', {
      isAnonymous,
      ...initializeUserFields(),
    });

    // Initialize rate limits immediately when account is created
    // This starts the rate limit windows at account creation time, not first usage
    try {
      const isPremium = false; // New users are not premium by default

      // Initialize daily limits for non-premium users
      if (!isPremium) {
        const dailyLimitName = isAnonymous
          ? 'anonymousDaily'
          : 'authenticatedDaily';
        await rateLimiter.reset(ctx, dailyLimitName, { key: newUserId });
      }

      // Initialize monthly limits for all users
      await rateLimiter.reset(ctx, 'standardMonthly', { key: newUserId });
    } catch {
      // Don't fail user creation if rate limit initialization fails
      // This is an optimization, not critical functionality
    }

    return { isNew: true };
  },
});

export const updateUserProfile = mutation({
  args: {
    updates: v.object({
      preferredModel: v.optional(v.string()),
      isPremium: v.optional(v.boolean()),
      preferredName: v.optional(v.string()),
      occupation: v.optional(v.string()),
      traits: v.optional(v.string()),
      about: v.optional(v.string()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, { updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    // Check if premium status is changing
    const wasPremium = user.isPremium ?? false;
    const willBePremium = updates.isPremium ?? wasPremium;

    // Apply the updates
    await ctx.db.patch(userId, { ...updates });

    // Reset daily limits if premium status changed
    if (wasPremium !== willBePremium && updates.isPremium !== undefined) {
      try {
        const isAnonymous = user.isAnonymous ?? false;
        const dailyLimitName = isAnonymous
          ? 'anonymousDaily'
          : 'authenticatedDaily';
        await rateLimiter.reset(ctx, dailyLimitName, { key: userId });
      } catch {
        // Don't fail the entire operation if rate limit reset fails
        // This is an optimization, not critical functionality
      }
    }

    return null;
  },
});

export const incrementMessageCount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isPremium = user.isPremium ?? false;
    const isAnonymous = user.isAnonymous ?? false;

    // CONSUME daily limits for non-premium users
    if (!isPremium) {
      const dailyLimitName = isAnonymous
        ? 'anonymousDaily'
        : 'authenticatedDaily';
      await rateLimiter.limit(ctx, dailyLimitName, {
        key: userId,
        throws: true,
      });
    }

    // CONSUME monthly limits for all users
    await rateLimiter.limit(ctx, 'standardMonthly', {
      key: userId,
      throws: true,
    });

    return null;
  },
});

export const assertNotOverLimit = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isPremium = user.isPremium ?? false;
    const isAnonymous = user.isAnonymous ?? false;

    // CHECK daily limits for non-premium users (don't consume yet)
    if (!isPremium) {
      const dailyLimitName = isAnonymous
        ? 'anonymousDaily'
        : 'authenticatedDaily';
      const dailyStatus = await rateLimiter.check(ctx, dailyLimitName, {
        key: userId,
      });
      if (!dailyStatus.ok) {
        throw new Error('DAILY_LIMIT_REACHED');
      }
    }

    // CHECK monthly limits for all users (don't consume yet)
    const monthlyStatus = await rateLimiter.check(ctx, 'standardMonthly', {
      key: userId,
    });
    if (!monthlyStatus.ok) {
      throw new Error('MONTHLY_LIMIT_REACHED');
    }
  },
});

export const getRateLimitStatus = query({
  args: {},
  returns: v.object({
    isPremium: v.boolean(),
    dailyCount: v.number(),
    dailyLimit: v.number(),
    dailyRemaining: v.number(),
    monthlyCount: v.number(),
    monthlyLimit: v.number(),
    monthlyRemaining: v.number(),
    effectiveRemaining: v.number(),
    dailyReset: v.optional(v.number()),
    monthlyReset: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const isPremium = user.isPremium ?? false;
    const isAnonymous = user.isAnonymous ?? false;
    const now = Date.now();

    // Get daily limits and current values
    let dailyLimit = 0;
    let dailyCount = 0;
    let dailyRemaining = 0;
    let dailyReset: number | undefined;

    if (!isPremium) {
      const dailyLimitName = isAnonymous
        ? 'anonymousDaily'
        : 'authenticatedDaily';
      const dailyStatus = await rateLimiter.check(ctx, dailyLimitName, {
        key: userId,
      });
      const dailyConfig = await rateLimiter.getValue(ctx, dailyLimitName, {
        key: userId,
      });

      dailyLimit = isAnonymous
        ? RATE_LIMITS.ANONYMOUS_DAILY
        : RATE_LIMITS.AUTHENTICATED_DAILY;
      dailyCount = dailyLimit - (dailyStatus.ok ? dailyConfig.value : 0);
      dailyRemaining = dailyStatus.ok ? dailyConfig.value : 0;

      // Use the rate limiter component's own logic for accurate reset time
      const dailyRateLimit = calculateRateLimit(
        { value: dailyConfig.value, ts: dailyConfig.ts },
        dailyConfig.config,
        now,
        0 // Don't consume tokens, just calculate
      );

      // For fixed windows, the next reset is the end of the current window
      if (dailyRateLimit.windowStart !== undefined) {
        const config = dailyConfig.config as RateLimitConfig;
        dailyReset = dailyRateLimit.windowStart + config.period;
      }
    }

    // Get monthly limits (standard for all users)
    const monthlyStatus = await rateLimiter.check(ctx, 'standardMonthly', {
      key: userId,
    });
    const monthlyConfig = await rateLimiter.getValue(ctx, 'standardMonthly', {
      key: userId,
    });

    const monthlyLimit = RATE_LIMITS.STANDARD_MONTHLY;
    const monthlyCount =
      monthlyLimit - (monthlyStatus.ok ? monthlyConfig.value : 0);
    const monthlyRemaining = monthlyStatus.ok ? monthlyConfig.value : 0;

    // Use the rate limiter component's own logic for accurate reset time
    const monthlyRateLimit = calculateRateLimit(
      { value: monthlyConfig.value, ts: monthlyConfig.ts },
      monthlyConfig.config,
      now,
      0 // Don't consume tokens, just calculate
    );

    // For fixed windows, the next reset is the end of the current window
    let monthlyReset: number | undefined;
    if (monthlyRateLimit.windowStart !== undefined) {
      const config = monthlyConfig.config as RateLimitConfig;
      monthlyReset = monthlyRateLimit.windowStart + config.period;
    }

    const effectiveRemaining = isPremium
      ? monthlyRemaining
      : Math.min(dailyRemaining, monthlyRemaining);

    return {
      isPremium,
      dailyCount,
      dailyLimit,
      dailyRemaining,
      monthlyCount,
      monthlyLimit,
      monthlyRemaining,
      effectiveRemaining,
      dailyReset,
      monthlyReset,
    };
  },
});

export const mergeAnonymousToGoogleAccount = mutation({
  args: { previousAnonymousUserId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, { previousAnonymousUserId }) => {
    const currentId = await getAuthUserId(ctx);
    if (!currentId) {
      return null;
    }
    if (currentId === previousAnonymousUserId) {
      return null;
    }
    const anon = await ctx.db.get(previousAnonymousUserId);
    const user = await ctx.db.get(currentId);
    if (!(anon && user)) {
      return null;
    }

    // --- Step 1: Reassign Chats ---
    const anonChats = await ctx.db
      .query('chats')
      .withIndex('by_user', (q) => q.eq('userId', previousAnonymousUserId))
      .collect();
    await Promise.all(
      anonChats.map((chat) => ctx.db.patch(chat._id, { userId: currentId }))
    );

    // --- Step 2: Reassign Messages ---
    const anonMessages = await ctx.db
      .query('messages')
      .withIndex('by_user', (q) => q.eq('userId', previousAnonymousUserId))
      .collect();
    await Promise.all(
      anonMessages.map((message) =>
        ctx.db.patch(message._id, { userId: currentId })
      )
    );

    // --- Step 3: Reassign Chat Attachments ---
    const anonAttachments = await ctx.db
      .query('chat_attachments')
      .withIndex('by_userId', (q) => q.eq('userId', previousAnonymousUserId))
      .collect();
    await Promise.all(
      anonAttachments.map((attachment) =>
        ctx.db.patch(attachment._id, { userId: currentId })
      )
    );

    // --- Step 4: Mark as non-anonymous (rate limits are managed automatically) ---
    await ctx.db.patch(currentId, {
      isAnonymous: false,
    });

    // --- Step 5: Delete anonymous user record ---
    await ctx.db.delete(previousAnonymousUserId);
    return null;
  },
});

// Delete account and all associated data
export const deleteAccount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    // Delete attachments and files
    const attachments = await ctx.db
      .query('chat_attachments')
      .withIndex('by_userId', (q) => q.eq('userId', userId))
      .collect();
    await Promise.all(
      attachments.map(async (att) => {
        try {
          await ctx.storage.delete(att.fileId as Id<'_storage'>);
        } catch {
          // Silently handle storage deletion errors
        }
        try {
          await ctx.db.delete(att._id);
        } catch {
          // Silently handle database deletion errors
        }
      })
    );

    // Delete messages authored by user
    const messages = await ctx.db
      .query('messages')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    await Promise.all(messages.map((msg) => ctx.db.delete(msg._id)));

    // Delete chats
    const chats = await ctx.db
      .query('chats')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    await Promise.all(chats.map((chat) => ctx.db.delete(chat._id)));

    // Delete feedback
    const feedback = await ctx.db
      .query('feedback')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    await Promise.all(feedback.map((f) => ctx.db.delete(f._id)));

    // Delete purchases
    const purchases = await ctx.db
      .query('purchases')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    await Promise.all(purchases.map((p) => ctx.db.delete(p._id)));

    // Delete usage history
    const usage = await ctx.db
      .query('usage_history')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect();
    await Promise.all(usage.map((u) => ctx.db.delete(u._id)));

    // --- Delete auth-related records (accounts, sessions, verificationTokens) ---
    // These tables are provided by `@convex-dev/auth` via `authTables` in schema.ts.
    // They store OAuth linkage and session data that still reference the `users` document.
    // If we remove the user without removing these, future logins with the same provider
    // will fail because the auth library will try to update a non-existent user.

    // Delete accounts that reference this user
    // Use index for better performance instead of filter
    // See: https://docs.convex.dev/database/indexes/
    const authAccounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
      .collect();
    await Promise.all(
      authAccounts.map((acc) => ctx.db.delete(acc._id as Id<'authAccounts'>))
    );

    // Delete sessions associated with this user
    // Use index for better performance instead of filter
    // See: https://docs.convex.dev/database/indexes/
    const authSessions = await ctx.db
      .query('authSessions')
      .withIndex('userId', (q) => q.eq('userId', userId))
      .collect();
    await Promise.all(
      authSessions.map((sess) => ctx.db.delete(sess._id as Id<'authSessions'>))
    );

    // Finally delete user record
    await ctx.db.delete(userId);
    return null;
  },
});

// React hook API functions for rate limiting
export const { getRateLimit: getRateLimitHook, getServerTime } =
  rateLimiter.hookAPI(
    'authenticatedDaily', // Default rate limit
    {
      key: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        return userId || 'anonymous';
      },
    }
  );
