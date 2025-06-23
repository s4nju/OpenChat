import { Doc } from "@/convex/_generated/dataModel"
import type { Message } from "ai"

// Infer types from Convex schema validators
type ConvexMessagePart = {
  type: "text"
  text: string
} | {
  type: "image"
  image: string
  mimeType: string
} | {
  type: "reasoning"
  reasoning: string
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
  }
} | {
  type: "tool-invocation"
  toolInvocation: {
    state: "call" | "result" | "partial-call"
    args?: any
    result?: any
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
  promptTokens?: number
  completionTokens?: number
  reasoningTokens?: number
  serverDurationMs?: number
}

/**
 * Convert Convex message document to AI SDK format
 */
export function convertConvexToAISDK(msg: Doc<"messages">): Message {
  return {
    id: msg._id,
    role: msg.role as "user" | "assistant" | "system",
    content: msg.content, // Keep as fallback for text-only display
    createdAt: new Date(msg._creationTime),
    parts: msg.parts as any || [{ type: "text", text: msg.content }], // Use parts or fallback to text
    experimental_attachments: extractAttachmentsFromParts(msg.parts),
  }
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
      const hasGeneratedUrl = (part as any).url && typeof (part as any).url === 'string'
      
      // Use helper function to detect storage IDs
      const isStorageId = isConvexStorageId(part.data)
      
      return {
        name: part.filename,
        contentType: part.mimeType,
        // Use generated URL if available, otherwise use data field (for backwards compatibility)
        url: hasGeneratedUrl ? (part as any).url : part.data,
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
export function extractReasoningFromResponse(responseParts: any[]): string | undefined {
  if (!responseParts) return undefined
  
  const reasoningText = responseParts
    .filter(part => part.type === "reasoning")
    .map(part => part.reasoning || part.text)
    .join("\n")
  
  return reasoningText || undefined
}

/**
 * Build metadata object from AI SDK usage, response and model info
 */
export function buildMetadataFromResponse(
  usage: any, 
  response: any, 
  modelId: string, 
  startTime: number
): MessageMetadata {
  return {
    modelId,
    modelName: response.modelId || modelId, // Use response.modelId if available, fallback to modelId
    promptTokens: usage?.promptTokens,
    completionTokens: usage?.completionTokens,
    reasoningTokens: usage?.reasoningTokens, // May not exist for all models
    serverDurationMs: Date.now() - startTime
  }
}

/**
 * Extract reasoning text from parts array (for backward compatibility display)
 */
export function extractReasoningFromParts(parts?: ConvexMessagePart[]): string | undefined {
  if (!parts) return undefined
  
  const reasoningPart = parts.find((part): part is Extract<ConvexMessagePart, { type: "reasoning" }> => 
    part.type === "reasoning"
  )
  
  return reasoningPart?.reasoning
}

/**
 * Extract model name from metadata (for backward compatibility display)
 */
export function extractModelFromMetadata(metadata?: MessageMetadata): string | undefined {
  return metadata?.modelName || metadata?.modelId
}

/**
 * Create text and reasoning parts from AI response content
 */
export function createPartsFromAIResponse(
  textContent: string, 
  reasoningText?: string
): ConvexMessagePart[] {
  const parts: ConvexMessagePart[] = [
    { type: "text", text: textContent }
  ]
  
  if (reasoningText) {
    parts.push({ type: "reasoning", reasoning: reasoningText })
  }
  
  return parts
}

/**
 * Helper to detect if a string is a Convex storage ID
 */
export function isConvexStorageId(value: string): boolean {
  // Convex storage IDs are typically 32-character hex strings
  return /^[a-z0-9]{32}$/.test(value) && !value.startsWith('http') && !value.startsWith('data:') && !value.startsWith('blob:')
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