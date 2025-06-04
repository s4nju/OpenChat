import { query, mutation } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

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
    await ctx.db.replace(userId, { ...user, ...updates });
    return null;
  },
});

export const incrementMessageCount = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = (await ctx.db.get(userId))!;
    const dailyCount = user.dailyMessageCount ?? 0;
    const totalCount = user.totalMessageCount ?? 0;
    await ctx.db.replace(userId, {
      ...user,
      dailyMessageCount: dailyCount + 1,
      totalMessageCount: totalCount + 1,
    });
    return null;
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
    await ctx.db.patch(currentId, {
      isAnonymous: false,
      dailyMessageCount:
        (user.dailyMessageCount ?? 0) + (anon.dailyMessageCount ?? 0),
      monthlyMessageCount:
        (user.monthlyMessageCount ?? 0) + (anon.monthlyMessageCount ?? 0),
      totalMessageCount:
        (user.totalMessageCount ?? 0) + (anon.totalMessageCount ?? 0),
    });
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

export const checkAndIncrementUsage = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    await ctx.runMutation(api.users.resetUsageCountersIfNeeded, {});
    await ctx.runMutation(api.users.incrementMessageCount, {});
    return null;
  },
});
