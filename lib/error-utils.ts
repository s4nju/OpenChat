/**
 * Error classification and handling utilities
 */

export type ErrorDisplayType = "conversation" | "toast" | "both"

export interface ClassifiedError {
  displayType: ErrorDisplayType
  code: string
  message: string
  userFriendlyMessage: string
  originalError?: Error | unknown
}

/**
 * Classify an error and determine how it should be displayed
 */
export function classifyError(error: unknown): ClassifiedError {
  // Handle nested error structures like { error: Error, cause: ... }
  let errorMsg: string
  if (error && typeof error === 'object' && 'error' in error && error.error instanceof Error) {
    errorMsg = error.error.message
  } else if (error instanceof Error) {
    errorMsg = error.message
  } else {
    errorMsg = String(error)
  }
  
  // Rate limit errors from AI providers - should be in conversation
  if (errorMsg.includes("rate limit") || errorMsg.includes("quota exceeded")) {
    return {
      displayType: "conversation",
      code: "RATE_LIMIT",
      message: errorMsg,
      userFriendlyMessage: "I'm currently experiencing rate limits. Please try again in a moment.",
      originalError: error
    }
  }
  
  // Model availability errors - should be in conversation
  if (errorMsg.includes("model not available") || errorMsg.includes("model not found")) {
    return {
      displayType: "conversation", 
      code: "MODEL_UNAVAILABLE",
      message: errorMsg,
      userFriendlyMessage: "The selected model is currently unavailable. Please try a different model.",
      originalError: error
    }
  }
  
  // Content filtering errors - should be in conversation
  if (errorMsg.includes("content filter") || errorMsg.includes("safety") || errorMsg.includes("blocked")) {
    return {
      displayType: "conversation",
      code: "CONTENT_FILTERED", 
      message: errorMsg,
      userFriendlyMessage: "Your request was blocked by content filters. Please try rephrasing your message.",
      originalError: error
    }
  }
  
  // Context length errors - should be in conversation
  if (errorMsg.includes("context length") || errorMsg.includes("token limit") || errorMsg.includes("too long")) {
    return {
      displayType: "conversation",
      code: "CONTEXT_TOO_LONG",
      message: errorMsg, 
      userFriendlyMessage: "The conversation is too long. Please start a new chat or use a model with a larger context window.",
      originalError: error
    }
  }
  
  // Timeout errors - should be in conversation
  if (errorMsg.includes("timeout") || errorMsg.includes("aborted")) {
    return {
      displayType: "conversation",
      code: "TIMEOUT",
      message: errorMsg,
      userFriendlyMessage: "The request timed out. Please try again.",
      originalError: error
    }
  }
  
  // Tool/search errors - should be in conversation
  if (errorMsg.includes("search") || errorMsg.includes("tool")) {
    return {
      displayType: "conversation",
      code: "TOOL_ERROR",
      message: errorMsg,
      userFriendlyMessage: "I encountered an error while searching. Continuing without search results.",
      originalError: error
    }
  }
  
  // Authentication errors - should be toast only
  if (errorMsg.includes("authentication") || errorMsg.includes("not authenticated") || errorMsg.includes("unauthorized")) {
    return {
      displayType: "toast",
      code: "AUTH_ERROR", 
      message: errorMsg,
      userFriendlyMessage: "Authentication required. Please sign in.",
      originalError: error
    }
  }
  
  // User API key errors - should be in conversation
  if (errorMsg.includes("USER_KEY_REQUIRED") || 
      errorMsg.includes("invalid api key") || 
      errorMsg.includes("api key is missing") ||
      errorMsg.includes("API key is missing") ||
      errorMsg.includes("missing api key")) {
    return {
      displayType: "conversation",
      code: "USER_KEY_ERROR",
      message: errorMsg,
      userFriendlyMessage: "API key for this model is missing or invalid. Please check your API key settings.",
      originalError: error
    }
  }
  
  // Daily/monthly limit errors - should be toast only
  if (errorMsg.includes("DAILY_LIMIT_REACHED") || errorMsg.includes("MONTHLY_LIMIT_REACHED")) {
    return {
      displayType: "conversation",
      code: "USAGE_LIMIT",
      message: errorMsg,
      userFriendlyMessage: "You've reached your usage limit. Please upgrade or wait for the limit to reset.",
      originalError: error
    }
  }
  
  // Validation errors - should be toast only
  if (errorMsg.includes("validation") || errorMsg.includes("invalid") || errorMsg.includes("required")) {
    return {
      displayType: "toast",
      code: "VALIDATION_ERROR",
      message: errorMsg,
      userFriendlyMessage: "Please check your input and try again.",
      originalError: error
    }
  }
  
  // Generic AI/generation errors - should be in conversation
  if (errorMsg.includes("generation") || errorMsg.includes("completion") || errorMsg.includes("response")) {
    return {
      displayType: "conversation",
      code: "GENERATION_ERROR",
      message: errorMsg,
      userFriendlyMessage: "I encountered an error while generating a response. Please try again.",
      originalError: error
    }
  }
  
  // Default: system errors go to toast
  return {
    displayType: "conversation",
    code: "SYSTEM_ERROR",
    message: errorMsg,
    userFriendlyMessage: "An unexpected error occurred. Please try again.",
    originalError: error
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