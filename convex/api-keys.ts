import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const SECRET = process.env.API_KEY_SECRET ?? "";
if (!SECRET) {
  console.warn("API_KEY_SECRET is not set. User API keys will not be encrypted.");
}

function getKey() {
  return createHash("sha256").update(SECRET).digest();
}

function encrypt(text: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${encrypted.toString("hex")}:${tag.toString("hex")}`;
}

function decrypt(payload: string) {
  const [ivHex, dataHex, tagHex] = payload.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

export const getApiKeys = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("user_api_keys"),
      provider: v.string(),
      mode: v.optional(v.union(v.literal("priority"), v.literal("fallback"))),
      createdAt: v.optional(v.number()),
      updatedAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const keys = await ctx.db
      .query("user_api_keys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId))
      .collect();
    return keys.map(({ _id, provider, mode, createdAt, updatedAt }) => ({
      _id,
      provider,
      mode,
      createdAt,
      updatedAt,
    }));
  },
});

export const saveApiKey = mutation({
  args: { provider: v.string(), key: v.string(), mode: v.optional(v.union(v.literal("priority"), v.literal("fallback"))) },
  returns: v.null(),
  handler: async (ctx, { provider, key, mode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const encrypted = SECRET ? encrypt(key) : key;
    const existing = await ctx.db
      .query("user_api_keys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { encryptedKey: encrypted, mode, updatedAt: now });
    } else {
      await ctx.db.insert("user_api_keys", { userId, provider, encryptedKey: encrypted, mode, createdAt: now, updatedAt: now });
    }
    return null;
  },
});

export const deleteApiKey = mutation({
  args: { provider: v.string() },
  returns: v.null(),
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("user_api_keys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

export const updateApiKeyMode = mutation({
  args: { provider: v.string(), mode: v.union(v.literal("priority"), v.literal("fallback")) },
  returns: v.null(),
  handler: async (ctx, { provider, mode }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("user_api_keys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { mode, updatedAt: Date.now() });
    }
    return null;
  },
});

export const getDecryptedKey = query({
  args: { provider: v.string() },
  returns: v.optional(v.string()),
  handler: async (ctx, { provider }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("user_api_keys")
      .withIndex("by_user_provider", (q) => q.eq("userId", userId).eq("provider", provider))
      .unique();
    if (!existing) return null;
    return decryptKey(existing.encryptedKey);
  },
});

export function decryptKey(encrypted: string) {
  return SECRET ? decrypt(encrypted) : encrypted;
}
