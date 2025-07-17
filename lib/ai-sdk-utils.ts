import { Doc } from "@/convex/_generated/dataModel"
import type { UIMessage } from "ai"

// Infer types from Convex schema validators
export type ConvexMessagePart = {
  type: "text"
  text: string
} | {
  type: "image"
  image: string
  mimeType: string
} | {
  type: "reasoning"
  reasoningText: string
  signature?: string
  duration?: number
  details?: Array<{
    type: "text" | "redacted"
    text?: string
    data?: string
    signature?: string
  }>
} | {
  type: "file"
  data: string
  filename?: string
  mimeType?: string
  url?: string // Generated URL for display (not persisted)
} | {
  type: "error"
  error: {
    code: string
    message: string
    rawError?: string
  }
} | {
  type: "tool-invocation"
  toolInvocation: {
    state: "call" | "result" | "partial-call"
    args?: unknown
    result?: unknown
    toolCallId: string
    toolName: string
    step?: number
  }
}

// AI SDK Attachment type
export interface Attachment {
  name?: string
  contentType?: string
  url: string
  storageId?: string
}

// AI SDK Message metadata type
export interface MessageMetadata {
  modelId?: string
  modelName?: string
  inputTokens?: number
  outputTokens?: number
  reasoningTokens?: number
  serverDurationMs?: number
  includeSearch?: boolean
  reasoningEffort?: string
}


/**
 * Extract attachment objects from FileParts for AI SDK experimental_attachments
 * Handles both storage IDs and generated URLs from queries
 */
export function extractAttachmentsFromParts(parts?: ConvexMessagePart[]): Attachment[] | undefined {
  if (!parts) return undefined
  
  const attachments = parts
    .filter((part): part is Extract<ConvexMessagePart, { type: "file" }> => part.type === "file")
    .filter(validateFilePart) // Filter out invalid parts
    .map(part => {
      // Check if part has a generated URL field (added by queries)
      const partWithUrl = part as ConvexMessagePart & { url?: string }
      const hasGeneratedUrl = partWithUrl.url && typeof partWithUrl.url === 'string'
      
      // Use helper function to detect storage IDs
      const isStorageId = isConvexStorageId(part.data)
      
      return {
        name: part.filename,
        contentType: part.mimeType,
        // Use generated URL if available, otherwise use data field (for backwards compatibility)
        url: hasGeneratedUrl ? partWithUrl.url! : part.data,
        storageId: isStorageId ? part.data : undefined
      }
    })
  
  return attachments.length > 0 ? attachments : undefined
}

/**
 * Convert uploaded file attachments to FileParts for storage
 * Stores storage ID instead of URL for permanent reference
 */
export function convertAttachmentsToFileParts(attachments: Attachment[]): ConvexMessagePart[] {
  return attachments.map(att => ({
    type: "file" as const,
    data: att.storageId || att.url, // Use storage ID if available, fallback to URL for backwards compatibility
    mimeType: att.contentType || "application/octet-stream",
    filename: att.name
  }))
}

/**
 * Extract reasoning text from AI SDK response parts
 */
export function extractReasoningFromResponse(responseParts: Array<{ type: string; reasoningText?: string; text?: string }>): string | undefined {
  if (!responseParts) return undefined
  
  const reasoningText = responseParts
    .filter(part => part.type === "reasoning")
    .map(part => part.reasoningText || part.text)
    .join("\n")
  
  return reasoningText || undefined
}

/**
 * Build metadata object from AI SDK usage, response and model info
 */
export function buildMetadataFromResponse(
  usage: { inputTokens?: number; outputTokens?: number; reasoningTokens?: number }, 
  response: { modelId?: string }, 
  modelId: string,
  modelName: string,
  startTime: number,
  includeSearch?: boolean,
  reasoningEffort?: string
): MessageMetadata {
  return {
    modelId,
    modelName: modelName || response.modelId || modelId, // Use provided modelName first, then response.modelId, then fallback to modelId
    inputTokens: usage?.inputTokens || 0,
    outputTokens: usage?.outputTokens || 0,
    reasoningTokens: usage?.reasoningTokens || 0, // Default to 0 instead of undefined/NaN
    serverDurationMs: Date.now() - startTime,
    includeSearch: includeSearch || false,
    reasoningEffort: reasoningEffort || "none"
  };
}

/**
 * Extract reasoning text from parts array (for backward compatibility display)
 */
export function extractReasoningFromParts(parts?: ConvexMessagePart[]): string | undefined {
  if (!parts) return undefined
  
  const reasoningPart = parts.find((part): part is Extract<ConvexMessagePart, { type: "reasoning" }> => 
    part.type === "reasoning"
  )
  
  return reasoningPart?.reasoningText;
}

/**
 * Extract model name from metadata (for backward compatibility display)
 */
export function extractModelFromMetadata(metadata?: MessageMetadata): string | undefined {
  return metadata?.modelName || metadata?.modelId
}

/**
 * Create parts from AI response content including tool invocations
 */
export function createPartsFromAIResponse(
  textContent: string, 
  reasoningText?: string,
  toolInvocations?: Array<{
    toolCallId: string
    toolName: string
    args?: unknown
    result?: unknown
    state: "call" | "result" | "partial-call"
  }>
): ConvexMessagePart[] {
  const parts: ConvexMessagePart[] = [
    { type: "text", text: textContent }
  ]
  
  if (reasoningText) {
    parts.push({ 
      type: "reasoning", 
      reasoningText: reasoningText,
      details: [] // Initialize details as empty array to prevent iteration errors
    })
  }
  
  // Add tool invocations as parts
  if (toolInvocations && toolInvocations.length > 0) {
    toolInvocations.forEach((invocation) => {
      parts.push({
        type: "tool-invocation",
        toolInvocation: {
          state: invocation.state,
          args: invocation.args,
          result: invocation.result,
          toolCallId: invocation.toolCallId,
          toolName: invocation.toolName
        }
      })
    })
  }
  
  return parts
}

/**
 * Helper to detect if a string is a Convex storage ID
 */
export function isConvexStorageId(value: string): boolean {
  // Convex storage IDs are typically 32-character hex strings
  return /^[a-z0-9]{32}$/.test(value) && !value.startsWith('http') && !value.startsWith('data:') && !value.startsWith('blob:');
}

/**
 * Helper to validate file part data
 */
export function validateFilePart(part: ConvexMessagePart): boolean {
  if (part.type !== "file") return false
  if (!part.data || typeof part.data !== "string") return false
  if (!part.mimeType) return false
  return true
} 