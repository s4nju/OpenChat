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
 */
export function extractAttachmentsFromParts(parts?: ConvexMessagePart[]): Attachment[] | undefined {
  if (!parts) return undefined
  
  const attachments = parts
    .filter((part): part is Extract<ConvexMessagePart, { type: "file" }> => part.type === "file")
    .map(part => ({
      name: part.filename,
      contentType: part.mimeType,
      url: part.data.startsWith('data:') ? part.data : `data:${part.mimeType};base64,${part.data}`
    }))
  
  return attachments.length > 0 ? attachments : undefined
}

/**
 * Convert uploaded file attachments to FileParts for storage
 */
export function convertAttachmentsToFileParts(attachments: Attachment[]): ConvexMessagePart[] {
  return attachments.map(att => ({
    type: "file" as const,
    data: att.url, // Could be data URL or regular URL
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