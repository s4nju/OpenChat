// app/api/chat/cached/route.ts
import {
  validateChatRequest,
  generateCacheKey,
  getCachedResponse,
  setCachedResponse,
  fetchWithRetry,
  createErrorResponse,
  getOpenRouterHeaders,
  type ChatRequest
} from '@/lib/api-utils';

// Set max duration for the API route
export const maxDuration = 60;

// Set runtime to edge for better performance
export const runtime = 'edge';

/**
 * POST handler for cached chat completions
 * This endpoint is optimized for non-streaming responses that can be cached
 */
export async function POST(req: Request) {
  try {
    // Parse request body
    const requestData = await req.json() as ChatRequest;

    // Validate request data
    const validationError = validateChatRequest(requestData);
    if (validationError) {
      return createErrorResponse(validationError, 400);
    }

    const { messages, apiKey, model } = requestData;

    // Check cache for non-streaming requests
    const cacheKey = generateCacheKey(requestData);
    const cachedResponse = getCachedResponse(cacheKey);

    if (cachedResponse) {
      return new Response(JSON.stringify(cachedResponse), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=60',
          'X-Cache': 'HIT',
        },
      });
    }

    try {
      // Prepare request to OpenRouter API
      const openRouterBody = {
        model,
        messages,
        stream: false, // Non-streaming for cacheable responses
        max_tokens: 2048,
      };

      // Use optimized fetch with retry logic
      const openRouterResponse = await fetchWithRetry(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: getOpenRouterHeaders(apiKey),
          body: JSON.stringify(openRouterBody),
        },
        2 // Max retries
      );

      // Handle error responses
      if (!openRouterResponse.ok) {
        let errorMessage = `OpenRouter API error: ${openRouterResponse.status} ${openRouterResponse.statusText}`;

        try {
          const errorText = await openRouterResponse.text();
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || errorData.error || errorMessage;
          } catch (parseError) {
            // If we can't parse JSON, use the raw text
            errorMessage = errorText || errorMessage;
          }
        } catch (e) {
          // If we can't get the text, use the status
        }

        return createErrorResponse(errorMessage, openRouterResponse.status);
      }

      // Parse the response
      const responseData = await openRouterResponse.json();

      // Cache the response
      setCachedResponse(cacheKey, responseData);

      // Return the JSON response
      return new Response(JSON.stringify(responseData), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'max-age=60',
          'X-Cache': 'MISS',
        },
      });
    } catch (modelError: any) {
      return createErrorResponse(
        `Error with OpenRouter API: ${modelError.message || "Unknown model error"}`,
        500
      );
    }
  } catch (error: any) {
    return createErrorResponse(
      `API error: ${error.message || "An unknown error occurred"}`,
      500
    );
  }
}
