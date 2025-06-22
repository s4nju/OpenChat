import { v } from "convex/values"

export const User = v.object({
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
    premiumCredits: v.optional(v.number()),
    preferredName: v.optional(v.string()),
    occupation: v.optional(v.string()),
    traits: v.optional(v.string()),
    about: v.optional(v.string()),
}) 