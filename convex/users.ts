import { getAuthUserId } from '@convex-dev/auth/server';
import {
  calculateRateLimit,
  type RateLimitConfig,
} from '@convex-dev/rate-limiter';
import { ConvexError, v } from 'convex/values';
import { MODEL_DEFAULT, RECOMMENDED_MODELS } from '../lib/config';
import { ERROR_CODES } from '../lib/error-codes';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { RATE_LIMITS } from './lib/rateLimitConstants';
import { polar } from './polar';
import { rateLimiter } from './rateLimiter';
import { User } from './schema/user';

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
  // By default no models are disabled – an empty array means all are enabled
  disabledModels: [],
  // Initialize with recommended models as favorites
  favoriteModels: [...RECOMMENDED_MODELS],
});

// Helper function to get updates for existing user
const getExistingUserUpdates = (existing: Record<string, unknown>) => {
  const updates: Record<string, unknown> = {};

  if (existing.preferredModel === undefined) {
    updates.preferredModel = MODEL_DEFAULT;
  }

  if (existing.disabledModels === undefined) {
    updates.disabledModels = [];
  }

  if (existing.favoriteModels === undefined) {
    updates.favoriteModels = [...RECOMMENDED_MODELS];
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

      const rateLimitPromises: Promise<unknown>[] = [];

      if (!isPremium) {
        const dailyLimitName = isAnonymous
          ? 'anonymousDaily'
          : 'authenticatedDaily';
        rateLimitPromises.push(
          rateLimiter.limit(ctx, dailyLimitName, {
            key: targetUserId,
            count: 0,
          })
        );
      }

      rateLimitPromises.push(
        rateLimiter.limit(ctx, 'standardMonthly', {
          key: targetUserId,
          count: 0,
        })
      );

      // Initialize premium credits counter for all users (will only be used by premium users)
      rateLimitPromises.push(
        rateLimiter.limit(ctx, 'premiumMonthly', {
          key: targetUserId,
          count: 0,
        })
      );

      await Promise.all(rateLimitPromises);
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
      disabledModels: v.optional(v.array(v.string())),
      favoriteModels: v.optional(v.array(v.string())),
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

export const toggleFavoriteModel = mutation({
  args: { modelId: v.string() },
  returns: v.null(),
  handler: async (ctx, { modelId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError(ERROR_CODES.NOT_AUTHENTICATED);
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    const currentFavorites = user.favoriteModels ?? [];
    const currentDisabled = user.disabledModels ?? [];
    const isFavorite = currentFavorites.includes(modelId);

    let newFavorites: string[];
    let newDisabled: string[];

    if (isFavorite) {
      // Removing from favorites - ensure at least one remains
      if (currentFavorites.length <= 1) {
        return null; // Cannot remove last favorite
      }
      newFavorites = currentFavorites.filter((id) => id !== modelId);
      newDisabled = currentDisabled; // Don't auto-disable when unfavoriting
    } else {
      // Adding to favorites - remove from disabled if present (auto-enable)
      newFavorites = [...new Set([...currentFavorites, modelId])];
      newDisabled = currentDisabled.filter((id) => id !== modelId);
    }

    await ctx.db.patch(userId, {
      favoriteModels: newFavorites,
      disabledModels: newDisabled,
    });

    return null;
  },
});

export const setModelEnabled = mutation({
  args: { modelId: v.string(), enabled: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { modelId, enabled }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError(ERROR_CODES.NOT_AUTHENTICATED);
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    // Cannot disable MODEL_DEFAULT
    if (!enabled && modelId === MODEL_DEFAULT) {
      return null;
    }

    const currentFavorites = user.favoriteModels ?? [];
    const currentDisabled = user.disabledModels ?? [];
    const isCurrentlyDisabled = currentDisabled.includes(modelId);

    let newFavorites = currentFavorites;
    let newDisabled: string[];

    if (enabled) {
      // Enabling model - remove from disabled list
      newDisabled = currentDisabled.filter((id) => id !== modelId);
    } else {
      // Disabling model - add to disabled list and remove from favorites
      newDisabled = isCurrentlyDisabled
        ? currentDisabled
        : [...new Set([...currentDisabled, modelId])];
      newFavorites = currentFavorites.filter((id) => id !== modelId);

      // Ensure at least one favorite remains
      if (newFavorites.length === 0 && currentFavorites.length > 0) {
        // Keep the first favorite and remove it from disabled list
        const firstFavorite = currentFavorites[0];
        newFavorites = [firstFavorite];
        newDisabled = newDisabled.filter((id) => id !== firstFavorite);
      }
    }

    await ctx.db.patch(userId, {
      favoriteModels: newFavorites,
      disabledModels: newDisabled,
    });

    return null;
  },
});

export const bulkSetModelsDisabled = mutation({
  args: { modelIds: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { modelIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError(ERROR_CODES.NOT_AUTHENTICATED);
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    const currentFavorites = user.favoriteModels ?? [];
    const currentDisabled = user.disabledModels ?? [];

    // Filter out MODEL_DEFAULT from the models to disable
    const modelsToDisable = modelIds.filter((id) => id !== MODEL_DEFAULT);

    let newFavorites: string[];
    let newDisabled: string[];

    if (modelsToDisable.length === 0) {
      // Unselect all: enable all models
      newDisabled = [];
      newFavorites = currentFavorites;
    } else {
      // Remove disabled models from favorites
      newFavorites = currentFavorites.filter(
        (id) => !modelsToDisable.includes(id)
      );
      // Merge with existing disabled models (fix critical bug)
      newDisabled = [...new Set([...currentDisabled, ...modelsToDisable])];

      // Ensure at least one favorite remains
      if (newFavorites.length === 0 && currentFavorites.length > 0) {
        // Keep the first favorite and remove it from disabled list
        const firstFavorite = currentFavorites[0];
        newFavorites = [firstFavorite];
        newDisabled = newDisabled.filter((id) => id !== firstFavorite);
      }
    }

    await ctx.db.patch(userId, {
      favoriteModels: newFavorites,
      disabledModels: newDisabled,
    });

    return null;
  },
});

export const bulkSetFavoriteModels = mutation({
  args: { modelIds: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { modelIds }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError(ERROR_CODES.NOT_AUTHENTICATED);
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    // Ensure at least one favorite model is provided
    if (modelIds.length === 0) {
      throw new ConvexError(ERROR_CODES.MISSING_REQUIRED_FIELD);
    }

    const currentDisabled = user.disabledModels ?? [];

    // Set new favorites to the provided model IDs
    const newFavorites = [...new Set(modelIds)]; // Remove duplicates

    // Remove favorite models from disabled list (auto-enable favorites)
    const newDisabled = currentDisabled.filter(
      (id) => !newFavorites.includes(id)
    );

    await ctx.db.patch(userId, {
      favoriteModels: newFavorites,
      disabledModels: newDisabled,
    });

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
      throw new ConvexError(ERROR_CODES.NOT_AUTHENTICATED);
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
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
      throw new ConvexError(ERROR_CODES.NOT_AUTHENTICATED);
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
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
        throw new ConvexError(ERROR_CODES.PREMIUM_LIMIT_REACHED);
      }
    } else {
      // For non-premium models or non-premium users, check standard credits

      const checkPromises: Promise<unknown>[] = [];

      // CHECK daily limits for non-premium users (don't consume yet)
      if (!isPremium) {
        const dailyLimitName = isAnonymous
          ? 'anonymousDaily'
          : 'authenticatedDaily';
        checkPromises.push(
          rateLimiter.check(ctx, dailyLimitName, {
            key: userId,
          })
        );
      }

      // CHECK monthly limits for all users (don't consume yet)
      checkPromises.push(
        rateLimiter.check(ctx, 'standardMonthly', {
          key: userId,
        })
      );

      const results = await Promise.all(checkPromises);

      // Check daily limit result (if applicable)
      if (!isPremium && results.length > 1) {
        const dailyStatus = results[0] as { ok: boolean };
        if (!dailyStatus.ok) {
          throw new ConvexError(ERROR_CODES.DAILY_LIMIT_REACHED);
        }
      }

      // Check monthly limit result (always the last promise)
      const monthlyStatus = results.at(-1) as { ok: boolean };
      if (!monthlyStatus.ok) {
        throw new ConvexError(ERROR_CODES.MONTHLY_LIMIT_REACHED);
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
    // console.log('getRateLimitStatus called for userId:', userId);
    if (!userId) {
      // Return safe defaults for unauthenticated users
      return {
        isPremium: false,
        dailyCount: 0,
        dailyLimit: 0,
        dailyRemaining: 0,
        monthlyCount: 0,
        monthlyLimit: 0,
        monthlyRemaining: 0,
        premiumCount: 0,
        premiumLimit: 0,
        premiumRemaining: 0,
        effectiveRemaining: 0,
      };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new ConvexError(ERROR_CODES.USER_NOT_FOUND);
    }

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: user._id,
    });
    const isPremium = subscription?.status === 'active';
    const isAnonymous = user.isAnonymous ?? false;
    const now = Date.now();

    // Determine daily limit name for non-premium users
    const dailyLimitName = isAnonymous
      ? 'anonymousDaily'
      : 'authenticatedDaily';

    // Parallel fetching of all rate limit data
    const [
      dailyStatus,
      dailyConfig,
      monthlyStatus,
      monthlyConfig,
      premiumStatus,
      premiumConfig,
    ] = await Promise.all([
      isPremium
        ? Promise.resolve(null)
        : rateLimiter.check(ctx, dailyLimitName, { key: userId }),
      isPremium
        ? Promise.resolve(null)
        : rateLimiter.getValue(ctx, dailyLimitName, { key: userId }),
      rateLimiter.check(ctx, 'standardMonthly', { key: userId }),
      rateLimiter.getValue(ctx, 'standardMonthly', { key: userId }),
      isPremium
        ? rateLimiter.check(ctx, 'premiumMonthly', { key: userId })
        : Promise.resolve(null),
      isPremium
        ? rateLimiter.getValue(ctx, 'premiumMonthly', { key: userId })
        : Promise.resolve(null),
    ]);

    // Process daily limits
    let dailyLimit = 0;
    let dailyCount = 0;
    let dailyRemaining = 0;
    let dailyReset: number | undefined;

    if (!isPremium && dailyStatus && dailyConfig) {
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

    // Process monthly limits (standard for all users)
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

    // Process premium credits (for premium users)
    let premiumLimit = 0;
    let premiumCount = 0;
    let premiumRemaining = 0;
    let premiumReset: number | undefined;

    if (isPremium && premiumStatus && premiumConfig) {
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

    // --- Step 1: Fetch all data in parallel ---
    const [anonChats, anonMessages, anonAttachments] = await Promise.all([
      ctx.db
        .query('chats')
        .withIndex('by_user', (q) => q.eq('userId', previousAnonymousUserId))
        .collect(),
      ctx.db
        .query('messages')
        .withIndex('by_user', (q) => q.eq('userId', previousAnonymousUserId))
        .collect(),
      ctx.db
        .query('chat_attachments')
        .withIndex('by_userId', (q) => q.eq('userId', previousAnonymousUserId))
        .collect(),
    ]);

    // --- Step 2: Reassign all entities in parallel ---
    await Promise.all([
      ...anonChats.map((chat) => ctx.db.patch(chat._id, { userId: currentId })),
      ...anonMessages.map((message) =>
        ctx.db.patch(message._id, { userId: currentId })
      ),
      ...anonAttachments.map((attachment) =>
        ctx.db.patch(attachment._id, { userId: currentId })
      ),
    ]);

    // --- Step 3: Mark as non-anonymous (rate limits are managed automatically) ---
    await ctx.db.patch(currentId, {
      isAnonymous: false,
    });

    // --- Step 4: Delete anonymous user record ---
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
      throw new ConvexError(ERROR_CODES.NOT_AUTHENTICATED);
    }

    // --- Step 1: Fetch all documents that need to be deleted in parallel ---
    const [
      attachments,
      messages,
      chats,
      feedback,
      usage,
      authAccounts,
      authSessions,
    ] = await Promise.all([
      ctx.db
        .query('chat_attachments')
        .withIndex('by_userId', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('messages')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('chats')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('feedback')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('usage_history')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('authAccounts')
        .withIndex('userIdAndProvider', (q) => q.eq('userId', userId))
        .collect(),
      ctx.db
        .query('authSessions')
        .withIndex('userId', (q) => q.eq('userId', userId))
        .collect(),
    ]);

    // --- Step 2: Collect all deletion promises and execute them concurrently ---
    const deletionPromises: Promise<unknown>[] = [];

    // Delete attachments and their files
    for (const att of attachments) {
      deletionPromises.push(
        ctx.storage.delete(att.fileName as Id<'_storage'>).catch(() => {
          // Silently handle storage deletion errors
        })
      );
      deletionPromises.push(
        ctx.db.delete(att._id).catch(() => {
          // Silently handle database deletion errors
        })
      );
    }

    // Delete messages
    deletionPromises.push(...messages.map((msg) => ctx.db.delete(msg._id)));

    // Delete chats
    deletionPromises.push(...chats.map((chat) => ctx.db.delete(chat._id)));

    // Delete feedback
    deletionPromises.push(...feedback.map((f) => ctx.db.delete(f._id)));

    // Delete usage history
    deletionPromises.push(...usage.map((u) => ctx.db.delete(u._id)));

    // Delete auth accounts
    deletionPromises.push(
      ...authAccounts.map((acc) => ctx.db.delete(acc._id as Id<'authAccounts'>))
    );

    // Delete auth sessions
    deletionPromises.push(
      ...authSessions.map((sess) =>
        ctx.db.delete(sess._id as Id<'authSessions'>)
      )
    );

    // Execute all deletions concurrently
    await Promise.allSettled(deletionPromises);

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
