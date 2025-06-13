import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Usage Limits - ensure these are in sync with your application's limits
const NON_AUTH_DAILY_MESSAGE_LIMIT = 5;
const AUTH_DAILY_MESSAGE_LIMIT = 50;
const PREMIUM_MONTHLY_MESSAGE_LIMIT = 1500;
const NON_PREMIUM_MONTHLY_MESSAGE_LIMIT = 1500; // This seems same as premium, adjust if needed

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      email: v.optional(v.string()),
      name: v.optional(v.string()),
      image: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
      dailyMessageCount: v.optional(v.number()),
      dailyResetTimestamp: v.optional(v.number()),
      monthlyMessageCount: v.optional(v.number()),
      monthlyResetTimestamp: v.optional(v.number()),
      totalMessageCount: v.optional(v.number()),
      preferredModel: v.optional(v.string()),
      isPremium: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

export const storeCurrentUser = mutation({
  args: { isAnonymous: v.optional(v.boolean()) },
  returns: v.object({ isNew: v.boolean() }),
  handler: async (ctx, { isAnonymous }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isNew: false };
    const existing = await ctx.db.get(userId);
    if (existing) {
      const wasInitialized = existing.isAnonymous !== undefined;
      const now = Date.now();
      const updates: Record<string, unknown> = {};
      if (existing.isAnonymous !== isAnonymous) {
        updates.isAnonymous = isAnonymous;
      }
      if (existing.dailyMessageCount === undefined) {
        updates.dailyMessageCount = 0;
      }
      if (existing.monthlyMessageCount === undefined) {
        updates.monthlyMessageCount = 0;
      }
      if (existing.totalMessageCount === undefined) {
        updates.totalMessageCount = 0;
      }
      if (existing.dailyResetTimestamp === undefined) {
        updates.dailyResetTimestamp = now + DAY;
      }
      if (existing.monthlyResetTimestamp === undefined) {
        updates.monthlyResetTimestamp = now + MONTH;
      }
      if (existing.preferredModel === undefined) {
        updates.preferredModel = MODEL_DEFAULT;
      }
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(userId, updates);
      }
      return { isNew: !wasInitialized };
    }
    const now = Date.now();
    await ctx.db.insert("users", {
      isAnonymous,
      dailyMessageCount: 0,
      monthlyMessageCount: 0,
      totalMessageCount: 0,
      dailyResetTimestamp: now + DAY,
      monthlyResetTimestamp: now + MONTH,
      preferredModel: MODEL_DEFAULT,
    });
    return { isNew: true };
  },
});

export const updateUserProfile = mutation({
  args: {
    updates: v.object({
      preferredModel: v.optional(v.string()),
      isPremium: v.optional(v.boolean()),
    }),
  },
  returns: v.null(),
  handler: async (ctx, { updates }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    await ctx.db.patch(userId, { ...updates });
    return null;
  },
});

export const incrementMessageCount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("User not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    // Increment counts
    const dailyCount = (user.dailyMessageCount ?? 0) + 1;
    const monthlyCount = (user.monthlyMessageCount ?? 0) + 1;
    const totalCount = (user.totalMessageCount ?? 0) + 1;

    await ctx.db.patch(userId, {
      dailyMessageCount: dailyCount,
      monthlyMessageCount: monthlyCount,
      totalMessageCount: totalCount,
    });

    return null;
  },
});

export const assertNotOverLimit = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    await ctx.runMutation(api.users.resetUsageCountersIfNeeded, {});
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const monthlyLimit = user.isPremium
      ? PREMIUM_MONTHLY_MESSAGE_LIMIT
      : NON_PREMIUM_MONTHLY_MESSAGE_LIMIT;

    if ((user.monthlyMessageCount ?? 0) >= monthlyLimit) {
      throw new Error("MONTHLY_LIMIT_REACHED");
    }

    if (!user.isPremium) {
      const dailyLimit = user.isAnonymous
        ? NON_AUTH_DAILY_MESSAGE_LIMIT
        : AUTH_DAILY_MESSAGE_LIMIT;
      if ((user.dailyMessageCount ?? 0) >= dailyLimit) {
        throw new Error("DAILY_LIMIT_REACHED");
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
    effectiveRemaining: v.number(),
    dailyReset: v.optional(v.number()),
    monthlyReset: v.optional(v.number()),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const isPremium = user.isPremium ?? false;
    const isAnonymous = user.isAnonymous ?? false;

    // Get monthly limits
    const monthlyLimit = isPremium
      ? PREMIUM_MONTHLY_MESSAGE_LIMIT
      : NON_PREMIUM_MONTHLY_MESSAGE_LIMIT;
    const monthlyCount = user.monthlyMessageCount ?? 0;
    const monthlyRemaining = monthlyLimit - monthlyCount;

    // Get daily limits
    const dailyLimit = isAnonymous
      ? NON_AUTH_DAILY_MESSAGE_LIMIT
      : AUTH_DAILY_MESSAGE_LIMIT;
    const dailyCount = user.dailyMessageCount ?? 0;
    const dailyRemaining = dailyLimit - dailyCount;

    // For premium users, only the monthly limit matters
    // For non-premium users, both daily and monthly limits apply
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
      dailyReset: user.dailyResetTimestamp,
      monthlyReset: user.monthlyResetTimestamp,
    };
  },
});

export const mergeAnonymousToGoogleAccount = mutation({
  args: { previousAnonymousUserId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, { previousAnonymousUserId }) => {
    const currentId = await getAuthUserId(ctx);
    if (!currentId) return null;
    if (currentId === previousAnonymousUserId) return null;
    const anon = await ctx.db.get(previousAnonymousUserId);
    const user = await ctx.db.get(currentId);
    if (!anon || !user) return null;

    // --- Step 1: Reassign Chats ---
    const anonChats = await ctx.db
      .query("chats")
      .withIndex("by_user", (q) => q.eq("userId", previousAnonymousUserId))
      .collect();
    for (const chat of anonChats) {
      await ctx.db.patch(chat._id, { userId: currentId });
    }

    // --- Step 2: Reassign Messages ---
    const anonMessages = await ctx.db
      .query("messages")
      .filter((q) => q.eq(q.field("userId"), previousAnonymousUserId))
      .collect();
    for (const message of anonMessages) {
      await ctx.db.patch(message._id, { userId: currentId });
    }

    // --- Step 3: Reassign Chat Attachments ---
    const anonAttachments = await ctx.db
      .query("chat_attachments")
      .filter((q) => q.eq(q.field("userId"), previousAnonymousUserId))
      .collect();
    for (const attachment of anonAttachments) {
      await ctx.db.patch(attachment._id, { userId: currentId });
    }

    // --- Step 4: Merge usage counters & mark as non-anonymous ---
    await ctx.db.patch(currentId, {
      isAnonymous: false,
      dailyMessageCount:
        (user.dailyMessageCount ?? 0) + (anon.dailyMessageCount ?? 0),
      monthlyMessageCount:
        (user.monthlyMessageCount ?? 0) + (anon.monthlyMessageCount ?? 0),
      totalMessageCount:
        (user.totalMessageCount ?? 0) + (anon.totalMessageCount ?? 0),
    });

    // --- Step 5: Delete anonymous user record ---
    await ctx.db.delete(previousAnonymousUserId);
    return null;
  },
});

const DAY = 24 * 60 * 60 * 1000;
const MONTH = 30 * DAY;
const MODEL_DEFAULT = "gemini-2.0-flash";

export const resetUsageCountersIfNeeded = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    const updates: Record<string, number> = {};
    const now = Date.now();
    if (!user.dailyResetTimestamp || now > user.dailyResetTimestamp) {
      updates.dailyMessageCount = 0;
      updates.dailyResetTimestamp = now + DAY;
    }
    if (!user.monthlyResetTimestamp || now > user.monthlyResetTimestamp) {
      updates.monthlyMessageCount = 0;
      updates.monthlyResetTimestamp = now + MONTH;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(userId, updates);
    }
    return null;
  },
});
