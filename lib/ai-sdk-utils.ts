import { Doc } from "@/convex/_generated/dataModel"
import type { UIMessage, FileUIPart, TextUIPart, ReasoningUIPart, ToolUIPart, SourceUrlUIPart } from "ai"

// Type alias for message parts array
type MessageParts = Array<TextUIPart | ReasoningUIPart | ToolUIPart | SourceUrlUIPart | FileUIPart>

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
 * Extract attachment objects from FileParts  
 * Handles both storage IDs and generated URLs from queries
 */
export function extractAttachmentsFromParts(parts?: MessageParts): Attachment[] | undefined {
  if (!parts) return undefined
  
  const attachments = parts
    .filter((part): part is FileUIPart => part.type === "file")
    .map(part => ({
      name: part.filename,
      contentType: part.mediaType,
      url: part.url,
      storageId: isConvexStorageId(part.url) ? part.url : undefined
    }))
  
  return attachments.length > 0 ? attachments : undefined
}

/**
 * Convert uploaded file attachments to FileParts for storage
 */
export function convertAttachmentsToFileParts(attachments: Attachment[]): FileUIPart[] {
  return attachments.map(att => ({
    type: "file" as const,
    url: att.storageId || att.url, // Use storage ID if available, fallback to URL for backwards compatibility
    mediaType: att.contentType || "application/octet-stream",
    filename: att.name
  }))
}

/**
 * Extract reasoning text from AI SDK response parts
 */
export function extractReasoningFromResponse(responseParts: MessageParts): string | undefined {
  if (!responseParts) return undefined
  
  const reasoningText = responseParts
    .filter((part): part is ReasoningUIPart => part.type === "reasoning")
    .map(part => part.text)
    .join("\n")
  
  return reasoningText || undefined
}

/**
 * Build metadata object from AI SDK usage, response and model info
 */
export function buildMetadataFromResponse(
  usage: { inputTokens?: number; outputTokens?: number; reasoningTokens?: number }, 
  modelId: string,
  modelName: string,
  startTime: number,
  includeSearch?: boolean,
  reasoningEffort?: string
): MessageMetadata {
  return {
    modelId,
    modelName: modelName || modelId, // Use provided modelName first, then response.modelId, then fallback to modelId
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
export function extractReasoningFromParts(parts?: MessageParts): string | undefined {
  if (!parts) return undefined
  
  const reasoningPart = parts.find((part): part is ReasoningUIPart => 
    part.type === "reasoning"
  )
  
  return reasoningPart?.text;
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
): MessageParts {
  const parts: MessageParts = [
    { type: "text", text: textContent }
  ]
  
  if (reasoningText) {
    parts.push({ 
      type: "reasoning", 
      text: reasoningText
    })
  }
  
  // Add tool invocations as parts
  if (toolInvocations && toolInvocations.length > 0) {
    toolInvocations.forEach((invocation) => {
      parts.push({
        type: `tool-${invocation.toolName}` as `tool-${string}`,
        toolCallId: invocation.toolCallId,
        state: invocation.state,
        input: invocation.args,
        output: invocation.result,
      } as unknown as ToolUIPart)
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
 * Convert Convex message document to AI SDK UIMessage format
 */
export function convertConvexToAISDK(msg: Doc<'messages'>): UIMessage {
  // console.log("Converting Convex message to AI SDK format:", msg);
  return {
    id: msg._id,
    role: msg.role,
    parts: msg.parts || [],
    metadata: msg.metadata,
  };
}