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
    .index("email", ["email"]),
  chats: defineTable({
    userId: v.id("users"),
    title: v.optional(v.string()),
    model: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
  messages: defineTable({
    chatId: v.id("chats"),
    userId: v.optional(v.id("users")),
    role: v.string(),
    content: v.string(),
    createdAt: v.optional(v.number()),
    experimentalAttachments: v.optional(v.any()),
    parentMessageId: v.optional(v.id("messages")),
    reasoningText: v.optional(v.string()),
    model: v.optional(v.string()),
  }).index("by_chat_and_created", ["chatId", "createdAt"]),
  feedback: defineTable({
    userId: v.id("users"),
    message: v.string(),
    createdAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
  chat_attachments: defineTable({
    userId: v.id("users"),
    chatId: v.id("chats"),
    fileId: v.id("_storage"), // Reference to Convex File Storage
    fileName: v.string(),
    fileType: v.string(),
    fileSize: v.number(),
  }).index("by_chatId", ["chatId"]),
  Logo: defineTable({
    color: v.string(),
    filter: v.optional(v.string()),
    logoid: v.string(),
    name: v.string(),
    orderid: v.id("Order"),
    rotate: v.number(),
    scale: v.optional(v.number()),
    strokewidth: v.number(),
    insertedAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
    userid: v.optional(v.id("users")),
  })
    .index("by_order", ["orderid"])
    .index("by_user", ["userid"]),
  Order: defineTable({
    checkoutid: v.optional(v.string()),
    createdat: v.optional(v.number()),
    priceid: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("UNPAID"),
        v.literal("PAID"),
        v.literal("SHIPPED"),
        v.literal("OUT"),
        v.literal("CANCELLED"),
        v.literal("PENDING")
      )
    ),
    updatedat: v.optional(v.number()),
    userid: v.optional(v.id("users")),
  }).index("by_user", ["userid"]),
  purchases: defineTable({
    amount: v.number(),
    status: v.string(),
    stripePaymentId: v.string(),
    userId: v.id("users"),
    createdAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
  usage_history: defineTable({
    userId: v.id("users"),
    messageCount: v.number(),
    periodStart: v.number(),
    periodEnd: v.number(),
    createdAt: v.optional(v.number()),
  }).index("by_user", ["userId"]),
});
