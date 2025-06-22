import { v } from "convex/values"

export const Logo = v.object({
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