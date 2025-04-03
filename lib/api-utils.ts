// lib/api-utils.ts

// Types
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  apiKey: string;
  model: string;
}

// Constants
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

// Cache implementation
const CACHE_TTL = 60 * 1000; // 1 minute in milliseconds
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

// Validate chat request
export function validateChatRequest(req: ChatRequest): string | null {
  if (!req.apiKey || typeof req.apiKey !== 'string') {
    return 'API key is required and must be a string';
  }

  if (!req.model || typeof req.model !== 'string') {
    return 'Model ID is required and must be a string';
  }

  if (!req.messages || !Array.isArray(req.messages) || req.messages.length === 0) {
    return 'Messages are required and must be a non-empty array';
  }

  // Validate each message
  for (const message of req.messages) {
    if (!message.role || !['user', 'assistant', 'system'].includes(message.role)) {
      return 'Each message must have a valid role (user, assistant, or system)';
    }
    if (typeof message.content !== 'string') {
      return 'Each message must have content as a string';
    }
  }

  return null; // No validation errors
}

// Generate cache key
export function generateCacheKey(req: ChatRequest): string {
  // For chat completions, we only cache non-streaming requests with the same messages and model
  // We don't include the API key in the cache key
  return `chat:${req.model}:${JSON.stringify(req.messages)}`;
}

// Check cache
export function getCachedResponse(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check if entry is expired
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }

  return entry.data;
}

// Set cache
export function setCachedResponse(key: string, data: any): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

// Clean expired cache entries
export function cleanCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

// Set up automatic cache cleaning every minute
if (typeof setInterval !== 'undefined') {
  setInterval(cleanCache, 60 * 1000);
}

// Fetch with retry logic
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const fetchOptions = {
        ...options,
        signal: controller.signal,
      };

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      return response;
    } catch (error: any) {
      lastError = error;

      // Don't retry if it's an abort error (timeout)
      if (error.name === 'AbortError') {
        throw new Error('Request timed out');
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) break;

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (attempt + 1)));
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

// Create standard error response
export function createErrorResponse(message: string, status: number = 500): Response {
  return new Response(
    JSON.stringify({ error: message }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}

// Performance monitoring has been removed for privacy

// Get OpenRouter headers
export function getOpenRouterHeaders(apiKey: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': 'https://openchat.dev',
    'X-Title': 'OpenChat',
    'OR-SITE-URL': 'https://openchat.dev',
  };
}
