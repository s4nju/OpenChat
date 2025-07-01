/**
 * Error classification and handling utilities
 */

import { z } from 'zod'

export type ErrorDisplayType = "conversation" | "toast" | "both"

/**
 * Zod schema for Convex rate limit errors
 */
const ConvexRateLimitErrorSchema = z.object({
  data: z.object({
    kind: z.literal('RateLimitError'),
    name: z.string().optional()
  })
})

type ConvexRateLimitError = z.infer<typeof ConvexRateLimitErrorSchema>

/**
 * Type guard to check if an error is a Convex RateLimitError using Zod
 */
function isConvexRateLimitError(error: unknown): error is ConvexRateLimitError {
  return ConvexRateLimitErrorSchema.safeParse(error).success
}

export interface ClassifiedError {
  displayType: ErrorDisplayType
  code: string
  message: string
  userFriendlyMessage: string
  httpStatus: number
  responseType: string
  originalError?: Error | unknown
}

/**
 * HTTP status code mapping for different error types
 */
function getHttpStatusForErrorCode(code: string): number {
  switch (code) {
    case "AUTH_ERROR":
      return 401
    case "USER_KEY_ERROR":
      return 401
    case "RATE_LIMIT":
      return 429
    case "USAGE_LIMIT":
      return 403
    case "MODEL_UNAVAILABLE":
      return 503
    case "CONTENT_FILTERED":
      return 400
    case "CONTEXT_TOO_LONG":
      return 400
    case "TIMEOUT":
      return 408
    case "VALIDATION_ERROR":
      return 400
    case "TOOL_ERROR":
    case "GENERATION_ERROR":
    case "SYSTEM_ERROR":
    default:
      return 500
  }
}

/**
 * Get API response type identifier for error code
 */
function getResponseTypeForErrorCode(code: string): string {
  switch (code) {
    case "USER_KEY_ERROR":
      return "api_key_required"
    case "RATE_LIMIT":
      return "rate_limit"
    case "MODEL_UNAVAILABLE":
      return "model_unavailable"
    case "CONTENT_FILTERED":
      return "content_filtered"
    case "CONTEXT_TOO_LONG":
      return "context_too_long"
    case "TIMEOUT":
      return "timeout"
    case "TOOL_ERROR":
      return "tool_error"
    case "GENERATION_ERROR":
      return "generation_error"
    case "AUTH_ERROR":
      return "auth_error"
    case "VALIDATION_ERROR":
      return "validation_error"
    case "USAGE_LIMIT":
      return "usage_limit"
    default:
      return "unknown_error"
  }
}

/**
 * Classify an error and determine how it should be displayed
 */
export function classifyError(error: unknown): ClassifiedError {
  // Handle Convex rate limiter errors
  const rateLimitParseResult = ConvexRateLimitErrorSchema.safeParse(error);
  if (rateLimitParseResult.success) {
    const { data: { name } } = rateLimitParseResult.data;
    const code = "RATE_LIMIT";
    return {
      displayType: "conversation",
      code,
      message: `Rate limit exceeded. ${name || 'Unknown limit'}`,
      userFriendlyMessage: `You've reached your usage limit. Please try again in a moment.`,
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    };
  }

  // Handle nested error structures like { error: Error, cause: ... }
  let errorMsg: string
  if (error && typeof error === 'object' && 'error' in error && error.error instanceof Error) {
    errorMsg = error.error.message
  } else if (error instanceof Error) {
    errorMsg = error.message
  } else {
    errorMsg = String(error)
  }
  
  // Normalize error message for case-insensitive matching
  const normalizedMsg = errorMsg.toLowerCase()
  
  // Rate limit errors from AI providers - should be in conversation
  if (normalizedMsg.includes("rate limit") || normalizedMsg.includes("quota exceeded")) {
    const code = "RATE_LIMIT"
    return {
      displayType: "conversation",
      code,
      message: errorMsg,
      userFriendlyMessage: "I'm currently experiencing rate limits. Please try again in a moment.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Model availability errors - should be in conversation
  if (normalizedMsg.includes("model not available") || normalizedMsg.includes("model not found")) {
    const code = "MODEL_UNAVAILABLE"
    return {
      displayType: "conversation", 
      code,
      message: errorMsg,
      userFriendlyMessage: "The selected model is currently unavailable. Please try a different model.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Content filtering errors - should be in conversation
  if (normalizedMsg.includes("content filter") || normalizedMsg.includes("safety") || normalizedMsg.includes("blocked")) {
    const code = "CONTENT_FILTERED"
    return {
      displayType: "conversation",
      code,
      message: errorMsg,
      userFriendlyMessage: "Your request was blocked by content filters. Please try rephrasing your message.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Context length errors - should be in conversation
  if (normalizedMsg.includes("context length") || normalizedMsg.includes("token limit") || normalizedMsg.includes("too long")) {
    const code = "CONTEXT_TOO_LONG"
    return {
      displayType: "conversation",
      code,
      message: errorMsg, 
      userFriendlyMessage: "The conversation is too long. Please start a new chat or use a model with a larger context window.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Timeout errors - should be in conversation
  if (normalizedMsg.includes("timeout") || normalizedMsg.includes("aborted")) {
    const code = "TIMEOUT"
    return {
      displayType: "conversation",
      code,
      message: errorMsg,
      userFriendlyMessage: "The request timed out. Please try again.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Tool/search errors - should be in conversation
  if (normalizedMsg.includes("search") || normalizedMsg.includes("tool")) {
    const code = "TOOL_ERROR"
    return {
      displayType: "conversation",
      code,
      message: errorMsg,
      userFriendlyMessage: "I encountered an error while searching. Continuing without search results.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Authentication errors - should be toast only
  if (normalizedMsg.includes("authentication") || normalizedMsg.includes("not authenticated") || normalizedMsg.includes("unauthorized")) {
    const code = "AUTH_ERROR"
    return {
      displayType: "toast",
      code,
      message: errorMsg,
      userFriendlyMessage: "Authentication required. Please sign in.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // User API key errors - should be in conversation
  if (normalizedMsg.includes("user_key_required") || 
      normalizedMsg.includes("invalid api key") || 
      normalizedMsg.includes("api key is missing") ||
      normalizedMsg.includes("missing api key")) {
    const code = "USER_KEY_ERROR"
    return {
      displayType: "conversation",
      code,
      message: errorMsg,
      userFriendlyMessage: "API key for this model is missing or invalid. Please check your API key settings.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Daily/monthly limit errors - should be conversation only
  if (normalizedMsg.includes("daily_limit_reached") || normalizedMsg.includes("monthly_limit_reached")) {
    const code = "USAGE_LIMIT"
    return {
      displayType: "conversation",
      code,
      message: errorMsg,
      userFriendlyMessage: "You've reached your usage limit. Please upgrade or wait for the limit to reset.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Validation errors - should be toast only
  if (normalizedMsg.includes("validation") || normalizedMsg.includes("invalid") || normalizedMsg.includes("required")) {
    const code = "VALIDATION_ERROR"
    return {
      displayType: "toast",
      code,
      message: errorMsg,
      userFriendlyMessage: "Please check your input and try again.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Generic AI/generation errors - should be in conversation
  if (normalizedMsg.includes("generation") || normalizedMsg.includes("completion") || normalizedMsg.includes("response")) {
    const code = "GENERATION_ERROR"
    return {
      displayType: "conversation",
      code,
      message: errorMsg,
      userFriendlyMessage: "I encountered an error while generating a response. Please try again.",
      httpStatus: getHttpStatusForErrorCode(code),
      responseType: getResponseTypeForErrorCode(code),
      originalError: error
    }
  }
  
  // Default: system errors go to conversation
  const code = "SYSTEM_ERROR"
  return {
    displayType: "conversation",
    code,
    message: errorMsg,
    userFriendlyMessage: "An unexpected error occurred. Please try again.",
    httpStatus: getHttpStatusForErrorCode(code),
    responseType: getResponseTypeForErrorCode(code),
    originalError: error
  }
}

/**
 * Create a standardized API error response
 */
export function createErrorResponse(error: unknown): Response {
  const classified = classifyError(error)
  
  const errorPayload = {
    error: {
      type: classified.responseType,
      message: classified.userFriendlyMessage,
      code: classified.code
    }
  }
  
  return new Response(JSON.stringify(errorPayload), {
    status: classified.httpStatus,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Create a standardized streaming error for conversation display
 */
export function createStreamingError(error: unknown): { 
  shouldSaveToConversation: boolean
  errorPayload: any 
} {
  const classified = classifyError(error)
  
  const errorPayload = {
    error: {
      type: classified.responseType,
      message: classified.userFriendlyMessage
    }
  }
  
  return {
    shouldSaveToConversation: classified.displayType === "conversation" || classified.displayType === "both",
    errorPayload
  }
}

/**
 * Create an ErrorUIPart for conversation display
 */
export function createErrorPart(code: string, message: string, rawError?: string) {
  return {
    type: "error" as const,
    error: {
      code,
      message,
      ...(rawError && { rawError })
    }
  }
}

/**
 * Check if an error should be displayed in conversation
 */
export function shouldShowInConversation(error: unknown): boolean {
  const classified = classifyError(error)
  return classified.displayType === "conversation" || classified.displayType === "both"
}

/**
 * Check if an error should be displayed as toast
 */
export function shouldShowAsToast(error: unknown): boolean {
  const classified = classifyError(error)
  return classified.displayType === "toast" || classified.displayType === "both"
} 