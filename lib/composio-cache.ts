import { Redis } from '@upstash/redis';
import type { Tool } from 'ai';

// Type for connected account from Composio API (full response with sensitive data)
interface ConnectedAccount {
  id: string;
  status: string;
  toolkit: {
    slug: string;
    name?: string;
  };
  [key: string]: unknown;
}

// Secure minimal interface for caching (excludes ALL sensitive OAuth data)
interface SecureConnectedAccount {
  id: string;
  status: string;
  toolkit: {
    slug: string;
    name?: string;
  };
  isDisabled: boolean;
  createdAt: string;
  updatedAt: string;
}

// Helper function to safely extract cacheable data
export function extractSecureAccountData(
  account: ConnectedAccount
): SecureConnectedAccount {
  return {
    id: account.id,
    status: account.status,
    toolkit: {
      slug: account.toolkit.slug,
      name: account.toolkit.name,
    },
    isDisabled: account.isDisabled as boolean,
    createdAt: account.createdAt as string,
    updatedAt: account.updatedAt as string,
  };
}

// Export types for use in other files
export type { ConnectedAccount, SecureConnectedAccount };

// Initialize Redis client using environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Cache TTL values (in seconds)
const CACHE_TTL = {
  CONVERTED_TOOLS: 24 * 60 * 60, // 24 hours for converted v5 tools
  CONNECTED_ACCOUNTS: 60 * 60, // 1 hour for connected accounts
} as const;

// Cache key prefixes
const CACHE_PREFIX = {
  CONVERTED_TOOLS: 'composio:converted:',
  CONNECTED_ACCOUNTS: 'composio:accounts:',
} as const;

// Note: We cannot cache raw tools because they contain non-serializable functions
// We'll only cache the converted tools which are serializable

/**
 * Get cached converted tools from Redis
 */
export async function getCachedConvertedTools(
  userId: string,
  toolkitSlugs: string[]
): Promise<Record<string, Tool> | null> {
  const sortedSlugs = toolkitSlugs.sort().join(',');
  const cacheKey = `${CACHE_PREFIX.CONVERTED_TOOLS}${userId}:${sortedSlugs}`;
  const cached = await redis.get(cacheKey);
  // console.log('Cache key:', cacheKey);
  // console.log('Cached data type:', typeof cached);
  // console.log('Cached data:', cached);
  if (!cached) {
    // console.log('No cached converted tools found for:', cacheKey);
    return null;
  }

  // Handle both object and string cases
  let parsed: Record<string, Tool>;
  if (typeof cached === 'string') {
    parsed = JSON.parse(cached) as Record<string, Tool>;
  } else if (typeof cached === 'object' && cached !== null) {
    parsed = cached as Record<string, Tool>;
  } else {
    // console.log('Unexpected cached data type:', typeof cached);
    return null;
  }

  return parsed;
}

/**
 * Set converted tools in Redis cache
 */
export async function setCachedConvertedTools(
  userId: string,
  toolkitSlugs: string[],
  tools: Record<string, Tool>
): Promise<void> {
  try {
    const sortedSlugs = toolkitSlugs.sort().join(',');
    const cacheKey = `${CACHE_PREFIX.CONVERTED_TOOLS}${userId}:${sortedSlugs}`;
    // console.log('Setting cached converted tools:', cacheKey);
    // console.log('Tools to cache:', tools);
    // Stringify the tools object before storing
    await redis.set(cacheKey, JSON.stringify(tools), {
      ex: CACHE_TTL.CONVERTED_TOOLS,
    });
  } catch {
    // Silently fail - caching is optional
  }
}

/**
 * Get cached connected accounts from Redis (secure version - no OAuth tokens)
 */
export async function getCachedConnectedAccounts(
  userId: string
): Promise<SecureConnectedAccount[] | null> {
  try {
    const cacheKey = `${CACHE_PREFIX.CONNECTED_ACCOUNTS}${userId}`;
    const cached = await redis.get(cacheKey);

    if (!cached) {
      return null;
    }

    // Handle both object and string cases
    let parsed: SecureConnectedAccount[];
    if (typeof cached === 'string') {
      parsed = JSON.parse(cached) as SecureConnectedAccount[];
    } else if (Array.isArray(cached)) {
      parsed = cached;
    } else {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Set connected accounts in Redis cache (secure version - strips OAuth tokens)
 */
export async function setCachedConnectedAccounts(
  userId: string,
  accounts: ConnectedAccount[]
): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX.CONNECTED_ACCOUNTS}${userId}`;

    // Extract only safe, non-sensitive data for caching
    const secureAccounts = accounts.map(extractSecureAccountData);

    await redis.set(cacheKey, JSON.stringify(secureAccounts), {
      ex: CACHE_TTL.CONNECTED_ACCOUNTS,
    });
  } catch {
    // Silently fail - caching is optional
  }
}

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch {
    return false;
  }
}
