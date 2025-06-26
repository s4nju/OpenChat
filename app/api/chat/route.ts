import { searchTool } from "@/app/api/tools"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { MODELS } from "@/lib/config"
import { SEARCH_PROMPT_INSTRUCTIONS } from "@/lib/config"
import { sanitizeUserInput } from "@/lib/sanitize"
import { 
  convertAttachmentsToFileParts, 
  createPartsFromAIResponse,
  buildMetadataFromResponse
} from "@/lib/ai-sdk-utils"
import { 
  classifyError, 
  shouldShowInConversation,
  createErrorPart 
} from "@/lib/error-utils"
import type { AnthropicProviderOptions } from "@ai-sdk/anthropic"
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google"
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai"
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"
import { withTracing } from "@posthog/ai"
import {
  createDataStreamResponse,
  JSONValue,
  Message as MessageAISDK,
  smoothStream,
  streamText,
} from "ai"
import { fetchMutation, fetchQuery } from "convex/nextjs"
import { PostHog } from "posthog-node"

// Initialize PostHog client at module level for efficiency
let phClient: PostHog | null = null
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  try {
    phClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    })
  } catch (error) {
    console.error("Failed to initialize PostHog client:", error)
  }
}

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 60

/**
 * Map error codes to error types for API responses
 */
function getErrorType(errorCode: string): string {
  switch (errorCode) {
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
    default:
      return "unknown_error"
  }
}

/**
 * Helper function to save an error message as an assistant message
 */
async function saveErrorMessage(
  chatId: Id<"chats">,
  userMsgId: Id<"messages"> | null,
  error: unknown,
  token: string,
  modelId?: string,
  modelName?: string
) {
  console.log("saveErrorMessage called with:", {
    chatId,
    userMsgId,
    error: error instanceof Error ? error.message : String(error),
    hasToken: !!token,
    modelId,
    modelName
  })
  
  try {
    if (!userMsgId) {
      console.warn("Cannot save error message: no parent user message ID")
      return null
    }
    
    const classified = classifyError(error)
    console.log("Error classified as:", classified)
    
    // Extract raw error message for backend debugging
    let rawErrorMessage = classified.message
    if (classified.originalError) {
      if (classified.originalError instanceof Error) {
        rawErrorMessage = classified.originalError.message
      } else if (classified.originalError && typeof classified.originalError === 'object' && 'error' in classified.originalError) {
        // Handle nested error structure like { error: Error, cause: ... }
        const nestedError = (classified.originalError as { error: unknown }).error
        rawErrorMessage = nestedError instanceof Error ? nestedError.message : String(nestedError)
      } else {
        rawErrorMessage = String(classified.originalError)
      }
    }
    
    const errorPart = createErrorPart(classified.code, classified.userFriendlyMessage, rawErrorMessage)
    console.log("Error part created:", errorPart)
    
    const parts = [errorPart]
    
    console.log("Calling saveAssistantMessage...")
    const { messageId } = await fetchMutation(
      api.messages.saveAssistantMessage,
      {
        chatId,
        role: "assistant",
        content: "", // Empty content to avoid duplication and search pollution
        parentMessageId: userMsgId,
        parts: parts,
        metadata: {
          modelId: modelId || "error",
          modelName: modelName || "Error",
        },
      },
      { token }
    )
    
    console.log("Error message saved with ID:", messageId)
    return messageId
  } catch (err) {
    console.error("Failed to save error message:", err)
    return null
  }
}

type ReasoningEffort = "low" | "medium" | "high"
type SupportedProvider =
  | "openrouter"
  | "openai"
  | "anthropic"
  | "mistral"
  | "meta"
  | "Qwen"

/**
 * Token budget configuration for reasoning models
 * - low: For quick responses with minimal reasoning depth
 * - medium: Balanced reasoning depth for most use cases
 * - high: Maximum reasoning depth for complex problems
 *
 * Anthropic uses 1024 for low (aligned with their API minimum),
 * while Google uses 1000 (their minimum threshold)
 */
const REASONING_BUDGETS = {
  low: { google: 1000, openai: "low", anthropic: 1024 },
  medium: { google: 6000, openai: "medium", anthropic: 6000 },
  high: { google: 12000, openai: "high", anthropic: 12000 },
} as const

/**
 * Model identifiers that support reasoning capabilities
 * Uses substring matching for version flexibility (e.g., "2.5-flash-001", "o1-preview")
 */
const REASONING_MODELS = {
  google: ["2.5-flash", "2.5-pro"],
  openai: ["o1", "o3", "o4"],
  anthropic: ["sonnet-4", "4-sonnet", "4-opus", "opus-4", "3-7"],
} as const

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: Id<"chats">
  model: string
  systemPrompt: string
  reloadAssistantMessageId?: Id<"messages">
  enableSearch?: boolean
  reasoningEffort?: ReasoningEffort
}

const buildGoogleProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): GoogleGenerativeAIProviderOptions => {
  const options: GoogleGenerativeAIProviderOptions = {}

  // Check if model supports reasoning using centralized configuration
  if (REASONING_MODELS.google.some((m) => modelId.includes(m))) {
    options.thinkingConfig = {
      includeThoughts: true,
      thinkingBudget: reasoningEffort
        ? REASONING_BUDGETS[reasoningEffort].google
        : REASONING_BUDGETS.medium.google,
    }
  }

  return options
}

const buildOpenAIProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): OpenAIResponsesProviderOptions => {
  const options: OpenAIResponsesProviderOptions = {}

  // Check if model supports reasoning using centralized configuration
  if (
    REASONING_MODELS.openai.some((m) => modelId.includes(m)) &&
    reasoningEffort
  ) {
    options.reasoningEffort = REASONING_BUDGETS[reasoningEffort]
      .openai as ReasoningEffort
    options.reasoningSummary = "detailed"
  }

  return options
}

const buildAnthropicProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): AnthropicProviderOptions => {
  const options: AnthropicProviderOptions = {}

  // Check if model supports reasoning using centralized configuration
  if (
    reasoningEffort &&
    REASONING_MODELS.anthropic.some((m) => modelId.includes(m))
  ) {
    options.thinking = {
      type: "enabled",
      budgetTokens: REASONING_BUDGETS[reasoningEffort].anthropic,
    }
  }

  return options
}

export async function POST(req: Request) {
  req.signal.addEventListener("abort", () => {
    console.log("Request aborted by client")
  })

  try {
    const {
      messages,
      chatId,
      model,
      systemPrompt,
      reloadAssistantMessageId,
      enableSearch,
      reasoningEffort,
    } = (await req.json()) as ChatRequest

    if (!messages || !chatId) {
      return new Response(
        JSON.stringify({ error: "Error, missing required information" }),
        { status: 400 }
      )
    }

    // --- Enhanced Input Validation ---
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "'messages' must be a non-empty array." }),
        { status: 400 }
      )
    }

    if (typeof chatId !== "string" || chatId.trim() === "") {
      return new Response(
        JSON.stringify({ error: "'chatId' must be a non-empty string." }),
        { status: 400 }
      )
    }

    const selectedModel = MODELS.find((m) => m.id === model)
    if (!selectedModel) {
      return new Response(
        JSON.stringify({ error: "Invalid 'model' provided." }),
        { status: 400 }
      )
    }

    if (systemPrompt && systemPrompt.length > 1000) {
      return new Response(
        JSON.stringify({
          error: "'systemPrompt' must not exceed 1000 characters.",
        }),
        { status: 400 }
      )
    }

    const token = await convexAuthNextjsToken()

    // Get current user for PostHog tracking
    const user = await fetchQuery(api.users.getCurrentUser, {}, { token })
    const userId = user?._id

    // --- API Key and Model Configuration ---
    const { apiKeyUsage } = selectedModel
    let userApiKey: string | null = null
    let keyEntry: { provider: string; mode?: string } | undefined

    if (apiKeyUsage?.allowUserKey) {
      try {
        const userKeys = await fetchQuery(
          api.api_keys.getApiKeys,
          {},
          { token }
        )
        keyEntry = userKeys.find((k) => k.provider === selectedModel.provider)
        if (keyEntry) {
          userApiKey = await fetchQuery(
            api.api_keys.getDecryptedKey,
            { provider: selectedModel.provider as SupportedProvider },
            { token }
          )
        }
      } catch (e) {
        console.error("Failed to fetch or decrypt user API key:", e)
        // If this is a critical error (auth failure), we should return early
        if (e instanceof Error && e.message.includes("Not authenticated")) {
          return new Response(
            JSON.stringify({ error: "Authentication required" }),
            { status: 401 }
          )
        }
      }
    }

    // Determine if we should use a user-provided API key
    const useUserKey = Boolean(
      (apiKeyUsage?.userKeyOnly && userApiKey) ||
      (keyEntry?.mode === "priority" && userApiKey)
    )

    // Reject early if model requires user key only but no user API key provided
    if (apiKeyUsage?.userKeyOnly && !userApiKey) {
      return new Response(
        JSON.stringify({
          error: "USER_KEY_REQUIRED",
          message: "This model requires a user-provided API key.",
        }),
        { status: 401 }
      )
    }

    // --- Rate Limiting (only if not using user key) ---
    if (!useUserKey) {
      await fetchMutation(api.users.assertNotOverLimit, {}, { token })
    }

    return createDataStreamResponse({
      execute: async (dataStream) => {
        let userMsgId: Id<"messages"> | null = null

        // --- Reload Logic (Delete and Recreate) ---
        if (reloadAssistantMessageId) {
          const details = await fetchQuery(
            api.messages.getMessageDetails,
            { messageId: reloadAssistantMessageId },
            { token }
          )
          userMsgId = details?.parentMessageId ?? null
          await fetchMutation(
            api.messages.deleteMessageAndDescendants,
            { messageId: reloadAssistantMessageId },
            { token }
          )
        }

        // --- Insert User Message (if not a reload) ---
        if (!reloadAssistantMessageId) {
          const userMessage = messages[messages.length - 1]
          if (userMessage && userMessage.role === "user") {
            // Convert experimental_attachments to FileParts before saving
            const fileParts = userMessage.experimental_attachments 
              ? convertAttachmentsToFileParts(userMessage.experimental_attachments)
              : []

            const userParts = [
              { type: "text" as const, text: sanitizeUserInput(userMessage.content as string) },
              ...fileParts
            ]

            const { messageId } = await fetchMutation(
              api.messages.sendUserMessageToChat,
              {
                chatId: chatId,
                role: "user",
                content: sanitizeUserInput(userMessage.content as string),
                parts: userParts,
                metadata: {} // Empty metadata for user messages
              },
              { token }
            )
            userMsgId = messageId
          }
        }

        // Helper to convert storage IDs to fresh URLs for AI models
        const resolveAttachmentUrls = async (messages: MessageAISDK[]): Promise<MessageAISDK[]> => {
          return Promise.all(
            messages.map(async (message) => {
              if (!message.experimental_attachments) return message

              const resolvedAttachments = await Promise.all(
                message.experimental_attachments.map(async (attachment) => {
                  // Check if URL is actually a storage ID
                  const isStorageId = attachment.url && 
                    !attachment.url.startsWith('http') && 
                    !attachment.url.startsWith('data:') &&
                    !attachment.url.startsWith('blob:')

                  if (isStorageId) {
                    try {
                      // Generate fresh URL from storage ID for AI model
                      const freshUrl = await fetchQuery(
                        api.files.getStorageUrl,
                        { storageId: attachment.url },
                        { token }
                      )
                      return { ...attachment, url: freshUrl || attachment.url }
                    } catch (error) {
                      console.warn(`Failed to resolve storage URL for ${attachment.url}:`, error)
                      return attachment // Return as-is if resolution fails
                    }
                  }
                  return attachment
                })
              )

              return { ...message, experimental_attachments: resolvedAttachments }
            })
          )
        }

        // Resolve storage IDs to fresh URLs for AI consumption
        const resolvedMessages = await resolveAttachmentUrls(messages)

        const makeOptions = (useUser: boolean) => {
          const key = useUser ? userApiKey : undefined

          if (selectedModel.provider === "gemini") {
            return {
              google: {
                ...buildGoogleProviderOptions(
                  selectedModel.id,
                  reasoningEffort
                ),
                apiKey: key,
              },
            }
          }
          if (selectedModel.provider === "openai") {
            return {
              openai: {
                ...buildOpenAIProviderOptions(
                  selectedModel.id,
                  reasoningEffort
                ),
                apiKey: key,
              },
            }
          }
          if (selectedModel.provider === "anthropic") {
            return {
              anthropic: {
                ...buildAnthropicProviderOptions(
                  selectedModel.id,
                  reasoningEffort
                ),
                apiKey: key,
              },
            }
          }
          return undefined
        }

        const startTime = Date.now()
        const runStream = (useUser: boolean) =>
          streamText({
            model: phClient
              ? withTracing(selectedModel.api_sdk, phClient, {
                posthogDistinctId: userId?.toString(),
                posthogProperties: {
                  conversation_id: chatId,
                },
              })
              : selectedModel.api_sdk,
            system: enableSearch 
              ? `${systemPrompt || "You are a helpful assistant."}\n\n${SEARCH_PROMPT_INSTRUCTIONS}`
              : systemPrompt || "You are a helpful assistant.",
            messages: resolvedMessages,
            tools: enableSearch ? { search: searchTool } : undefined,
            maxSteps: 5,
            providerOptions: makeOptions(useUser) as
              | Record<string, Record<string, JSONValue>>
              | undefined,
            experimental_transform: smoothStream({
              delayInMs: 20,
              chunking: "word",
            }),
            onError: async (error) => {
              console.log("Error in streamText:", error)
              console.log("userMsgId in onError:", userMsgId)
              console.log("Should show in conversation:", shouldShowInConversation(error))
              
              // Save conversation errors as messages
              if (shouldShowInConversation(error) && token) {
                console.log("Attempting to save error message from onError...")
                try {
                  await saveErrorMessage(chatId, userMsgId, error, token, selectedModel.id, selectedModel.name)
                  console.log("Error message saved from onError")
                } catch (saveError) {
                  console.error("Failed to save error message:", saveError)
                }
                
                // Return error response to client
                const classified = classifyError(error)
                const errorType = getErrorType(classified.code)
                throw new Error(JSON.stringify({
                  error: {
                    type: errorType,
                    message: classified.userFriendlyMessage
                  }
                }))
              } else {
                console.log("Not saving error - either not conversation error or no token")
              }
            },
            async onFinish({ usage, response }) {
              try {
                // Get the actual response data
                const responseData = await response;
                
                // console.log("DEBUG: Response structure:", {
                //   messageCount: responseData.messages.length,
                //   messages: responseData.messages.map((msg, idx) => ({
                //     index: idx,
                //     role: msg.role,
                //     contentType: Array.isArray(msg.content) ? 'array' : typeof msg.content,
                //     contentLength: Array.isArray(msg.content) ? msg.content.length : msg.content?.length || 0,
                //     contentTypes: Array.isArray(msg.content) ? msg.content.map(p => p.type) : [],
                //     content: Array.isArray(msg.content) ? msg.content : msg.content
                //   }))
                // });

                // Combine all assistant messages and extract tool results
                let combinedTextContent = ""
                let combinedReasoningText: string | undefined
                const allToolInvocations: Array<{
                  toolCallId: string
                  toolName: string
                  args?: unknown
                  result?: unknown
                  state: "call" | "result" | "partial-call"
                }> = []

                // First pass: extract tool calls from assistant messages
                for (const msg of responseData.messages) {
                  if (msg.role === "assistant") {
                    if (Array.isArray(msg.content)) {
                      // Extract text content
                      const textParts = msg.content.filter((p) => p.type === "text")
                      const textContent = textParts.map((p) => p.text).join("")
                      if (textContent.trim()) {
                        combinedTextContent += textContent
                      }

                      // Extract reasoning
                      const reasoningPart = msg.content.find((p) => p.type === "reasoning")
                      if (reasoningPart?.text && !combinedReasoningText) {
                        combinedReasoningText = reasoningPart.text
                      }
                      
                      // Extract tool calls
                      const toolCalls = msg.content.filter((p) => p.type === "tool-call")
                      toolCalls.forEach((call: { toolCallId: string; toolName: string; args: unknown }) => {
                        allToolInvocations.push({
                          toolCallId: call.toolCallId,
                          toolName: call.toolName,
                          args: call.args,
                          result: undefined,
                          state: "call"
                        })
                      })
                    } else if (typeof msg.content === "string") {
                      if (msg.content.trim()) {
                        combinedTextContent += msg.content
                      }
                    }
                  }
                }

                // Second pass: extract tool results from tool messages
                for (const msg of responseData.messages) {
                  if (msg.role === "tool" && Array.isArray(msg.content)) {
                    msg.content.forEach((part: { type: string; toolCallId: string; toolName?: string; result: unknown }) => {
                      if (part.type === "tool-result") {
                        // Find the matching tool call and add the result
                        const matchingInvocation = allToolInvocations.find(
                          inv => inv.toolCallId === part.toolCallId
                        )
                        if (matchingInvocation) {
                          matchingInvocation.result = part.result
                          matchingInvocation.state = "result"
                        } else {
                          // Create new invocation if no matching call found
                          allToolInvocations.push({
                            toolCallId: part.toolCallId,
                            toolName: part.toolName || "unknown",
                            args: undefined,
                            result: part.result,
                            state: "result"
                          })
                        }
                      }
                    })
                  }
                }

                // console.log("DEBUG: Combined message processing:", {
                //   combinedTextContent: combinedTextContent.substring(0, 100) + "...",
                //   combinedReasoningText: combinedReasoningText?.substring(0, 50) + "...",
                //   toolInvocationsCount: allToolInvocations.length,
                //   toolInvocations: allToolInvocations.map(inv => ({
                //     toolName: inv.toolName,
                //     state: inv.state,
                //     hasResult: !!inv.result,
                //     resultPreview: inv.result ? JSON.stringify(inv.result).substring(0, 100) + "..." : "none"
                //   }))
                // });

                if (!userMsgId) {
                  throw new Error(
                    "Missing parent userMsgId when saving assistant message."
                  )
                }

                // Create parts array including tool invocations
                const messageParts = createPartsFromAIResponse(combinedTextContent, combinedReasoningText, allToolInvocations)
                
                // console.log("DEBUG: Final message parts:", {
                //   partsCount: messageParts.length,
                //   partTypes: messageParts.map(p => p.type),
                //   hasToolInvocations: messageParts.some(p => p.type === "tool-invocation")
                // });
                
                // Build metadata from response with human-readable model name
                const metadata = buildMetadataFromResponse(usage, response, selectedModel.id, selectedModel.name, startTime, enableSearch, reasoningEffort)

                await fetchMutation(
                  api.messages.saveAssistantMessage,
                  {
                    chatId,
                    role: "assistant",
                    content: combinedTextContent,
                    parentMessageId: userMsgId,
                    parts: messageParts,
                    metadata: metadata,
                  },
                  { token }
                )

                if (useUser) {
                  await fetchMutation(
                    api.api_keys.incrementUserApiKeyUsage,
                    { provider: selectedModel.provider },
                    { token }
                  )
                } else {
                  await fetchMutation(
                    api.users.incrementMessageCount,
                    {},
                    { token }
                  )
                }
                
              } catch (err) {
                console.error(
                  "Error in onFinish while saving assistant messages:",
                  err
                )
              } finally {
                if (phClient) {
                  try {
                    await phClient.shutdown()
                  } catch (error) {
                    console.error("PostHog shutdown failed:", error)
                  }
                }
              }
            },
          })

        let result
        if (apiKeyUsage?.allowUserKey) {
          const primaryIsUserKey = useUserKey
          try {
            result = runStream(primaryIsUserKey)
          } catch (primaryError) {
            console.log("Caught primary error:", primaryError)
            console.log("userMsgId:", userMsgId)
            console.log("Should show in conversation:", shouldShowInConversation(primaryError))
            
            // Save conversation errors as messages
            if (shouldShowInConversation(primaryError) && token) {
              console.log("Attempting to save error message...")
              await saveErrorMessage(chatId, userMsgId, primaryError, token, selectedModel.id, selectedModel.name)
              console.log("Error message saved")
            }
            
            const fallbackIsPossible =
              primaryIsUserKey || (!primaryIsUserKey && !!userApiKey)

            if (fallbackIsPossible) {
              const fallbackIsUserKey = !primaryIsUserKey
              try {
                result = runStream(fallbackIsUserKey)
              } catch (fallbackError) {
                console.log("Caught fallback error:", fallbackError)
                // Save conversation errors as messages for fallback error too
                if (shouldShowInConversation(fallbackError) && token) {
                  await saveErrorMessage(chatId, userMsgId, fallbackError, token, selectedModel.id, selectedModel.name)
                }
                throw fallbackError
              }
            } else {
              throw primaryError
            }
          }
        } else {
          try {
            result = runStream(false)
          } catch (streamError) {
            console.log("Caught stream error:", streamError)
            console.log("userMsgId:", userMsgId)
            console.log("Should show in conversation:", shouldShowInConversation(streamError))
            
            // Save conversation errors as messages
            if (shouldShowInConversation(streamError) && token) {
              console.log("Attempting to save error message...")
              await saveErrorMessage(chatId, userMsgId, streamError, token, selectedModel.id, selectedModel.name)
              console.log("Error message saved")
            }
            throw streamError
          }
        }

        result.mergeIntoDataStream(dataStream, { sendReasoning: true })
      },
      onError: (error) => {
        // Mark structured errors for handling at higher level
        const errorMsg = error instanceof Error ? error.message : String(error)
        try {
          const parsedError = JSON.parse(errorMsg)
          if (parsedError.error && parsedError.error.type && parsedError.error.message) {
            // Tag this as a structured error
            throw new Error(`STRUCTURED_ERROR:${errorMsg}`)
          }
        } catch {
          // Not structured, continue with normal error handling
        }
        
        return errorMsg
      },
    })
  } catch (err: unknown) {
    const error = err as { message?: string }
    
    // Handle structured conversation errors
    if (error.message?.startsWith("STRUCTURED_ERROR:")) {
      const structuredErrorJson = error.message.replace("STRUCTURED_ERROR:", "")
      try {
        const parsedError = JSON.parse(structuredErrorJson)
        return new Response(JSON.stringify(parsedError), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
      } catch {
        // Fall through to default error handling
      }
    }
    
    if (
      error.message?.includes("DAILY_LIMIT_REACHED") ||
      error.message?.includes("MONTHLY_LIMIT_REACHED")
    ) {
      return new Response(
        JSON.stringify({ error: error.message, code: "LIMIT_REACHED" }),
        { status: 403 }
      )
    }
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    )
  }
}
