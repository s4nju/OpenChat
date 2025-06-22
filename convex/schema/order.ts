import { v } from "convex/values"

export const Order = v.object({
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
}) 