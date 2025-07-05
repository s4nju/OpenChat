import { getAuthUserId } from '@convex-dev/auth/server';
import {
  calculateRateLimit,
  type RateLimitConfig,
} from '@convex-dev/rate-limiter';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { RATE_LIMITS } from './lib/rateLimitConstants';
import { polar } from './polar';
import { rateLimiter } from './rateLimiter';
import { User } from './schema/user';

const MODEL_DEFAULT = 'gemini-2.0-flash';
const ALL_MODEL_IDS = [
  'grok-3',
  'gpt-4o',
  'gpt-4o-mini',
  'o4-mini',
  'o3',
  'o3-pro',
  'gpt-4.1',
  'gpt-4.1-mini',
  'gpt-4.1-nano',
  'gpt-4.5',
  'claude-3-5-sonnet-20241022',
  'claude-3-7-sonnet-20250219',
  'claude-3-7-sonnet-reasoning',
  'claude-4-opus',
  'claude-4-sonnet',
  'claude-4-sonnet-reasoning',
  'gemini-2.0-flash',
  'gemini-2.5-pro',
  'Llama-4-Maverick-17B-128E-Instruct-FP8',
  'Llama-4-Scout-17B-16E-Instruct',
  'pixtral-large-latest',
  'mistral-large-latest',
  'deepseek-ai/DeepSeek-V3-0324',
  'deepseek-r1-0528',
];

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

export const userHasPremium = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    try {
      const subscription = await polar.getCurrentSubscription(ctx, { userId });
      return subscription?.status === 'active';
    } catch {
      return false;
    }
  },
});

// Helper function to initialize user fields
const initializeUserFields = () => ({
  preferredModel: MODEL_DEFAULT,
  enabledModels: [...ALL_MODEL_IDS],
});

// Helper function to get updates for existing user
const getExistingUserUpdates = (existing: Record<string, unknown>) => {
  const updates: Record<string, unknown> = {};

  if (existing.preferredModel === undefined) {
    updates.preferredModel = MODEL_DEFAULT;
  }

  if (existing.enabledModels === undefined) {
    updates.enabledModels = [...ALL_MODEL_IDS];
  }

  return updates;
};

/**
 * Ensure the authenticated user has a fully-initialised `users` document.
 *
 * Behaviour overview:
 * 1. If the user is returning (including converting an anonymous session into
 *    an authenticated one) we *patch* the existing document with any new
 *    default fields and update the `isAnonymous` flag when provided.
 * 2. If this is the first time we have seen this `userId`, insert a fresh
 *    record with sensible defaults.
 * 3. In both cases we *pre-seed* the relevant rate-limit windows (daily &
 *    monthly) so that the first real user action can be counted immediately
 *    without the overhead of on-the-fly initialisation.
 *
 * The function returns `{ isNew }` where `isNew === true` indicates that a
 * brand-new document was created (i.e. the user never existed before).
 */
export const storeCurrentUser = mutation({
  args: { isAnonymous: v.optional(v.boolean()) },
  returns: v.object({ isNew: v.boolean() }),
  handler: async (ctx, { isAnonymous }) => {
    // ---------------------------------------------------------------------
    // Step 1: Retrieve the authenticated Convex user ID.
    // If we cannot resolve an ID, exit early (nothing to store).
    // ---------------------------------------------------------------------
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { isNew: false };
    }

    // ---------------------------------------------------------------------
    // Step 2: Upsert the user document.
    // We keep track of whether this results in a *new* document so we can
    // report it back to the caller.
    // ---------------------------------------------------------------------
    let targetUserId: Id<'users'> | null = null;
    let isNew = false;

    const existing = await ctx.db.get(userId);
    if (existing) {
      // ---- Existing user: build and apply a minimal patch when needed ----
      const patch = {
        ...getExistingUserUpdates(existing),
        // Only add `isAnonymous` when the caller explicitly provided it and
        // it differs from the stored value.
        ...(isAnonymous !== undefined && isAnonymous !== existing.isAnonymous
          ? { isAnonymous }
          : {}),
      } as Record<string, unknown>;

      if (Object.keys(patch).length) {
        await ctx.db.patch(userId, patch);
      }

      targetUserId = userId as Id<'users'>;
      // If the record did *not* previously have `isAnonymous` set at all we
      // treat this as a first-time initialisation from the application's
      // perspective (e.g. an auto-created anonymous account).
      isNew = existing.isAnonymous === undefined;
    } else {
      // ---- New user: insert with defaults ----
      targetUserId = await ctx.db.insert('users', {
        isAnonymous,
        ...initializeUserFields(),
      });
      isNew = true;
    }

    // ---------------------------------------------------------------------
    // Step 3: Pro-actively seed rate-limit counters so that subsequent calls
    // to the rate-limiter do not incur the initialisation overhead.
    // ---------------------------------------------------------------------
    try {
      const isPremium = false; // Newly-created users are non-premium by default

      if (!isPremium) {
        const dailyLimitName = isAnonymous
          ? 'anonymousDaily'
          : 'authenticatedDaily';
        await rateLimiter.limit(ctx, dailyLimitName, {
          key: targetUserId,
          count: 0,
        });
      }

      await rateLimiter.limit(ctx, 'standardMonthly', {
        key: targetUserId,
        count: 0,
      });

      // Initialize premium credits counter for all users (will only be used by premium users)
      await rateLimiter.limit(ctx, 'premiumMonthly', {
        key: targetUserId,
        count: 0,
      });
    } catch {
      // Non-fatal: rate-limit initialisation failure should never block the
      // user flow. The rate-limiter will lazily create windows on first use.
    }

    return { isNew };
  },
});

export const updateUserProfile = mutation({
  args: {
    updates: v.object({
      preferredModel: v.optional(v.string()),
      preferredName: v.optional(v.string()),
      occupation: v.optional(v.string()),
      traits: v.optional(v.string()),
      about: v.optional(v.string()),
      enabledModels: v.optional(v.array(v.string())),
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

    // Apply the updates
    await ctx.db.patch(userId, { ...updates });

    return null;
  },
});

export const incrementMessageCount = mutation({
  args: {
    usesPremiumCredits: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { usesPremiumCredits }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user._id,
    });
    const isPremium = subscription?.status === 'active';
    const isAnonymous = user.isAnonymous ?? false;

    // For premium users using premium models, deduct from premium credits
    if (isPremium && usesPremiumCredits) {
      await rateLimiter.limit(ctx, 'premiumMonthly', {
        key: userId,
        throws: true,
      });
    } else {
      // For non-premium models or non-premium users, use standard credits

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
    }

    return null;
  },
});

export const assertNotOverLimit = mutation({
  args: {
    usesPremiumCredits: v.optional(v.boolean()),
  },
  handler: async (ctx, { usesPremiumCredits }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error('Not authenticated');
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user._id,
    });
    const isPremium = subscription?.status === 'active';
    const isAnonymous = user.isAnonymous ?? false;

    // For premium users using premium models, check premium credits
    if (isPremium && usesPremiumCredits) {
      const premiumStatus = await rateLimiter.check(ctx, 'premiumMonthly', {
        key: userId,
      });
      if (!premiumStatus.ok) {
        throw new Error('PREMIUM_LIMIT_REACHED');
      }
    } else {
      // For non-premium models or non-premium users, check standard credits

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
    premiumCount: v.number(),
    premiumLimit: v.number(),
    premiumRemaining: v.number(),
    effectiveRemaining: v.number(),
    dailyReset: v.optional(v.number()),
    monthlyReset: v.optional(v.number()),
    premiumReset: v.optional(v.number()),
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

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user._id,
    });
    const isPremium = subscription?.status === 'active';
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

    // Get premium credits (for premium users)
    let premiumLimit = 0;
    let premiumCount = 0;
    let premiumRemaining = 0;
    let premiumReset: number | undefined;

    if (isPremium) {
      const premiumStatus = await rateLimiter.check(ctx, 'premiumMonthly', {
        key: userId,
      });
      const premiumConfig = await rateLimiter.getValue(ctx, 'premiumMonthly', {
        key: userId,
      });

      premiumLimit = RATE_LIMITS.PREMIUM_MONTHLY;
      premiumCount =
        premiumLimit - (premiumStatus.ok ? premiumConfig.value : 0);
      premiumRemaining = premiumStatus.ok ? premiumConfig.value : 0;

      // Use the rate limiter component's own logic for accurate reset time
      const premiumRateLimit = calculateRateLimit(
        { value: premiumConfig.value, ts: premiumConfig.ts },
        premiumConfig.config,
        now,
        0 // Don't consume tokens, just calculate
      );

      // For fixed windows, the next reset is the end of the current window
      if (premiumRateLimit.windowStart !== undefined) {
        const config = premiumConfig.config as RateLimitConfig;
        premiumReset = premiumRateLimit.windowStart + config.period;
      }
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
      premiumCount,
      premiumLimit,
      premiumRemaining,
      effectiveRemaining,
      dailyReset,
      monthlyReset,
      premiumReset,
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
