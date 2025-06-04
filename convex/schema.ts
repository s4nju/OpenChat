import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
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
    .index("by_email", ["email"]),
});
