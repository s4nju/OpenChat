/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <main route> */
import type { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { withTracing } from '@posthog/ai';
import {
  createDataStreamResponse,
  type JSONValue,
  type Message as MessageAISDK,
  smoothStream,
  streamText,
} from 'ai';
import { checkBotId } from 'botid/server';
import { fetchMutation, fetchQuery } from 'convex/nextjs';
import { PostHog } from 'posthog-node';
import { searchTool } from '@/app/api/tools';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import {
  buildMetadataFromResponse,
  convertAttachmentsToFileParts,
  createPartsFromAIResponse,
} from '@/lib/ai-sdk-utils';
import { MODELS, SEARCH_PROMPT_INSTRUCTIONS } from '@/lib/config';
import {
  classifyError,
  createErrorPart,
  createErrorResponse,
  createStreamingError,
  shouldShowInConversation,
} from '@/lib/error-utils';
import { sanitizeUserInput } from '@/lib/sanitize';

// Initialize PostHog client at module level for efficiency
let phClient: PostHog | null = null;
if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  try {
    phClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    });
  } catch (_error) {
    // console.error('Failed to initialize PostHog client:', error);
  }
}

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 60;

/**
 * Helper function to save an error message as an assistant message
 */
async function saveErrorMessage(
  chatId: Id<'chats'>,
  userMsgId: Id<'messages'> | null,
  error: unknown,
  token: string,
  modelId?: string,
  modelName?: string,
  enableSearch?: boolean,
  reasoningEffort?: ReasoningEffort
) {
  try {
    if (!userMsgId) {
      // console.warn('Cannot save error message: no parent user message ID');
      return null;
    }

    const classified = classifyError(error);

    // Extract raw error message for backend debugging
    let rawErrorMessage = classified.message;
    if (classified.originalError) {
      if (classified.originalError instanceof Error) {
        rawErrorMessage = classified.originalError.message;
      } else if (
        classified.originalError &&
        typeof classified.originalError === 'object' &&
        'error' in classified.originalError
      ) {
        // Handle nested error structure like { error: Error, cause: ... }
        const nestedError = (classified.originalError as { error: unknown })
          .error;
        rawErrorMessage =
          nestedError instanceof Error
            ? nestedError.message
            : String(nestedError);
      } else {
        rawErrorMessage = String(classified.originalError);
      }
    }

    const errorPart = createErrorPart(
      classified.code,
      classified.userFriendlyMessage,
      rawErrorMessage
    );

    const parts = [errorPart];
    const { messageId } = await fetchMutation(
      api.messages.saveAssistantMessage,
      {
        chatId,
        role: 'assistant',
        content: '', // Empty content to avoid duplication and search pollution
        parentMessageId: userMsgId,
        parts,
        metadata: {
          modelId: modelId || 'error',
          modelName: modelName || 'Error',
          includeSearch: enableSearch,
          reasoningEffort: reasoningEffort || 'none',
        },
      },
      { token }
    );

    return messageId;
  } catch (_err) {
    // console.error('Failed to save error message:', err);
    return null;
  }
}

type ReasoningEffort = 'low' | 'medium' | 'high';
type SupportedProvider =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'mistral'
  | 'meta'
  | 'Qwen';

/**
 * Helper function to save user message to chat if not in reload mode
 */
async function saveUserMessage(
  messages: MessageAISDK[],
  chatId: Id<'chats'>,
  token: string | undefined,
  reloadAssistantMessageId?: Id<'messages'>
): Promise<Id<'messages'> | null> {
  if (!reloadAssistantMessageId && token) {
    const userMessage = messages.at(-1);
    if (userMessage && userMessage.role === 'user') {
      // Convert experimental_attachments to FileParts before saving
      const fileParts = userMessage.experimental_attachments
        ? convertAttachmentsToFileParts(userMessage.experimental_attachments)
        : [];

      const userParts = [
        {
          type: 'text' as const,
          text: sanitizeUserInput(userMessage.content as string),
        },
        ...fileParts,
      ];

      const { messageId } = await fetchMutation(
        api.messages.sendUserMessageToChat,
        {
          chatId,
          role: 'user',
          content: sanitizeUserInput(userMessage.content as string),
          parts: userParts,
          metadata: {}, // Empty metadata for user messages
        },
        { token }
      );
      return messageId;
    }
  }
  return null;
}

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
  low: { google: 1000, openai: 'low', anthropic: 1024 },
  medium: { google: 6000, openai: 'medium', anthropic: 6000 },
  high: { google: 12_000, openai: 'high', anthropic: 12_000 },
} as const;

/**
 * Model identifiers that support reasoning capabilities
 * Uses substring matching for version flexibility (e.g., "2.5-flash-001", "o1-preview")
 */
const REASONING_MODELS = {
  google: ['2.5-flash', '2.5-pro'],
  openai: ['o1', 'o3', 'o4'],
  anthropic: ['sonnet-4', '4-sonnet', '4-opus', 'opus-4', '3-7'],
} as const;

type ChatRequest = {
  messages: MessageAISDK[];
  chatId: Id<'chats'>;
  model: string;
  systemPrompt: string;
  reloadAssistantMessageId?: Id<'messages'>;
  enableSearch?: boolean;
  reasoningEffort?: ReasoningEffort;
};

const buildGoogleProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): GoogleGenerativeAIProviderOptions => {
  const options: GoogleGenerativeAIProviderOptions = {};

  // Check if model supports reasoning using centralized configuration
  if (REASONING_MODELS.google.some((m) => modelId.includes(m))) {
    options.thinkingConfig = {
      includeThoughts: true,
      thinkingBudget: reasoningEffort
        ? REASONING_BUDGETS[reasoningEffort].google
        : REASONING_BUDGETS.medium.google,
    };
  }

  return options;
};

const buildOpenAIProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): OpenAIResponsesProviderOptions => {
  const options: OpenAIResponsesProviderOptions = {};

  // Check if model supports reasoning using centralized configuration
  if (
    REASONING_MODELS.openai.some((m) => modelId.includes(m)) &&
    reasoningEffort
  ) {
    options.reasoningEffort = REASONING_BUDGETS[reasoningEffort]
      .openai as ReasoningEffort;
    options.reasoningSummary = 'detailed';
  }

  return options;
};

const buildAnthropicProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): AnthropicProviderOptions => {
  const options: AnthropicProviderOptions = {};

  // Check if model supports reasoning using centralized configuration
  if (
    reasoningEffort &&
    REASONING_MODELS.anthropic.some((m) => modelId.includes(m))
  ) {
    options.thinking = {
      type: 'enabled',
      budgetTokens: REASONING_BUDGETS[reasoningEffort].anthropic,
    };
  }

  return options;
};

export async function POST(req: Request) {
  // Verify the request using Vercel BotID. If identified as a bot, block early.
  const { isBot } = await checkBotId();
  if (isBot) {
    return new Response('Access denied', { status: 403 });
  }

  req.signal.addEventListener('abort', () => {
    // Request aborted by client
  });

  try {
    const {
      messages,
      chatId,
      model,
      systemPrompt,
      reloadAssistantMessageId,
      enableSearch,
      reasoningEffort,
    } = (await req.json()) as ChatRequest;

    if (!(messages && chatId)) {
      return createErrorResponse(new Error('Missing required information'));
    }

    // --- Enhanced Input Validation ---
    if (!Array.isArray(messages) || messages.length === 0) {
      return createErrorResponse(
        new Error("'messages' must be a non-empty array.")
      );
    }

    if (typeof chatId !== 'string' || chatId.trim() === '') {
      return createErrorResponse(
        new Error("'chatId' must be a non-empty string.")
      );
    }

    const selectedModel = MODELS.find((m) => m.id === model);
    if (!selectedModel) {
      return createErrorResponse(new Error("Invalid 'model' provided."));
    }

    if (systemPrompt && systemPrompt.length > 1000) {
      return createErrorResponse(
        new Error("'systemPrompt' must not exceed 1000 characters.")
      );
    }

    const token = await convexAuthNextjsToken();

    // Get current user for PostHog tracking
    const user = await fetchQuery(api.users.getCurrentUser, {}, { token });
    const userId = user?._id;

    // --- API Key and Model Configuration ---
    const { apiKeyUsage } = selectedModel;
    let userApiKey: string | null = null;
    let keyEntry: { provider: string; mode?: string } | undefined;

    if (apiKeyUsage?.allowUserKey) {
      try {
        const userKeys = await fetchQuery(
          api.api_keys.getApiKeys,
          {},
          { token }
        );
        keyEntry = userKeys.find((k) => k.provider === selectedModel.provider);
        if (keyEntry) {
          userApiKey = await fetchQuery(
            api.api_keys.getDecryptedKey,
            { provider: selectedModel.provider as SupportedProvider },
            { token }
          );
        }
      } catch (e) {
        // console.error('Failed to fetch or decrypt user API key:', e);
        // If this is a critical error (auth failure), we should return early
        if (e instanceof Error && e.message.includes('Not authenticated')) {
          return createErrorResponse(new Error('Not authenticated'));
        }
      }
    }

    // Determine if we should use a user-provided API key
    const useUserKey = Boolean(
      (apiKeyUsage?.userKeyOnly && userApiKey) ||
        (keyEntry?.mode === 'priority' && userApiKey)
    );

    // Reject early if model requires user key only but no user API key provided
    if (apiKeyUsage?.userKeyOnly && !userApiKey) {
      return createErrorResponse(new Error('user_key_required'));
    }

    // --- Rate Limiting (only if not using user key) ---
    let rateLimitError: Error | null = null;

    if (!useUserKey) {
      try {
        await fetchMutation(api.users.assertNotOverLimit, {}, { token });
      } catch (error) {
        if (
          error instanceof Error &&
          (error.message.includes('DAILY_LIMIT_REACHED') ||
            error.message.includes('MONTHLY_LIMIT_REACHED'))
        ) {
          rateLimitError = error;
          // Don't throw yet - let user message save first
        } else {
          throw error; // Re-throw non-rate-limit errors
        }
      }
    }

    // --- Handle Rate Limit Error Early (but save messages first) ---
    if (rateLimitError) {
      // Save user message first (even though rate limited)
      const userMsgId = await saveUserMessage(
        messages,
        chatId,
        token,
        reloadAssistantMessageId
      );

      // Save error message to conversation
      if (token) {
        await saveErrorMessage(
          chatId,
          userMsgId,
          rateLimitError,
          token,
          selectedModel.id,
          selectedModel.name,
          enableSearch,
          reasoningEffort
        );
      }

      // Return proper HTTP error response (not 200)
      return createErrorResponse(rateLimitError);
    }

    return createDataStreamResponse({
      execute: async (dataStream) => {
        let userMsgId: Id<'messages'> | null = null;

        // --- Reload Logic (Delete and Recreate) ---
        if (reloadAssistantMessageId) {
          const details = await fetchQuery(
            api.messages.getMessageDetails,
            { messageId: reloadAssistantMessageId },
            { token }
          );
          userMsgId = details?.parentMessageId ?? null;
          await fetchMutation(
            api.messages.deleteMessageAndDescendants,
            { messageId: reloadAssistantMessageId },
            { token }
          );
        }

        // --- Insert User Message (if not a reload) ---
        userMsgId = await saveUserMessage(
          messages,
          chatId,
          token,
          reloadAssistantMessageId
        );

        // Helper to convert storage IDs to fresh URLs for AI models
        const resolveAttachmentUrls = async (
          messagesToResolve: MessageAISDK[]
        ): Promise<MessageAISDK[]> => {
          return await Promise.all(
            messagesToResolve.map(async (message) => {
              if (!message.experimental_attachments) {
                return message;
              }

              const resolvedAttachments = await Promise.all(
                message.experimental_attachments.map(async (attachment) => {
                  // Check if URL is actually a storage ID
                  const isStorageId =
                    attachment.url &&
                    !attachment.url.startsWith('http') &&
                    !attachment.url.startsWith('data:') &&
                    !attachment.url.startsWith('blob:');

                  if (isStorageId) {
                    try {
                      // Generate fresh URL from storage ID for AI model
                      const freshUrl = await fetchQuery(
                        api.files.getStorageUrl,
                        { storageId: attachment.url },
                        { token }
                      );
                      return { ...attachment, url: freshUrl || attachment.url };
                    } catch (_error) {
                      // console.warn(
                      //   `Failed to resolve storage URL for ${attachment.url}:`,
                      //   error
                      // );
                      return attachment; // Return as-is if resolution fails
                    }
                  }
                  return attachment;
                })
              );

              return {
                ...message,
                experimental_attachments: resolvedAttachments,
              };
            })
          );
        };

        // Resolve storage IDs to fresh URLs for AI consumption
        const resolvedMessages = await resolveAttachmentUrls(messages);

        const makeOptions = (useUser: boolean) => {
          const key = useUser ? userApiKey : undefined;

          if (selectedModel.provider === 'gemini') {
            return {
              google: {
                ...buildGoogleProviderOptions(
                  selectedModel.id,
                  reasoningEffort
                ),
                apiKey: key,
              },
            };
          }
          if (selectedModel.provider === 'openai') {
            return {
              openai: {
                ...buildOpenAIProviderOptions(
                  selectedModel.id,
                  reasoningEffort
                ),
                apiKey: key,
              },
            };
          }
          if (selectedModel.provider === 'anthropic') {
            return {
              anthropic: {
                ...buildAnthropicProviderOptions(
                  selectedModel.id,
                  reasoningEffort
                ),
                apiKey: key,
              },
            };
          }
          return;
        };

        const startTime = Date.now();
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
              ? `${systemPrompt || 'You are a helpful assistant.'}\n\n${SEARCH_PROMPT_INSTRUCTIONS}`
              : systemPrompt || 'You are a helpful assistant.',
            messages: resolvedMessages,
            tools: enableSearch ? { search: searchTool } : undefined,
            maxSteps: 5,
            providerOptions: makeOptions(useUser) as
              | Record<string, Record<string, JSONValue>>
              | undefined,
            experimental_transform: smoothStream({
              delayInMs: 20,
              chunking: 'word',
            }),
            onError: async (error) => {
              // Save conversation errors as messages
              if (shouldShowInConversation(error) && token) {
                try {
                  await saveErrorMessage(
                    chatId,
                    userMsgId,
                    error,
                    token,
                    selectedModel.id,
                    selectedModel.name,
                    enableSearch,
                    reasoningEffort
                  );
                } catch (_saveError) {
                  // console.error('Failed to save error message:', saveError);
                }

                // Create standardized streaming error for client
                const streamingError = createStreamingError(error);
                throw new Error(JSON.stringify(streamingError.errorPayload));
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
                let combinedTextContent = '';
                let combinedReasoningText: string | undefined;
                const allToolInvocations: Array<{
                  toolCallId: string;
                  toolName: string;
                  args?: unknown;
                  result?: unknown;
                  state: 'call' | 'result' | 'partial-call';
                }> = [];

                // First pass: extract tool calls from assistant messages
                for (const msg of responseData.messages) {
                  if (msg.role === 'assistant') {
                    if (Array.isArray(msg.content)) {
                      // Extract text content
                      const textParts = msg.content.filter(
                        (p) => p.type === 'text'
                      );
                      const textContent = textParts.map((p) => p.text).join('');
                      if (textContent.trim()) {
                        combinedTextContent += textContent;
                      }

                      // Extract reasoning
                      const reasoningPart = msg.content.find(
                        (p) => p.type === 'reasoning'
                      );
                      if (reasoningPart?.text && !combinedReasoningText) {
                        combinedReasoningText = reasoningPart.text;
                      }

                      // Extract tool calls
                      const toolCalls = msg.content.filter(
                        (p) => p.type === 'tool-call'
                      );
                      for (const call of toolCalls as Array<{
                        toolCallId: string;
                        toolName: string;
                        args: unknown;
                      }>) {
                        allToolInvocations.push({
                          toolCallId: call.toolCallId,
                          toolName: call.toolName,
                          args: call.args,
                          result: undefined,
                          state: 'call',
                        });
                      }
                    } else if (
                      typeof msg.content === 'string' &&
                      msg.content.trim()
                    ) {
                      combinedTextContent += msg.content;
                    }
                  }
                }

                // Second pass: extract tool results from tool messages
                for (const msg of responseData.messages) {
                  if (msg.role === 'tool' && Array.isArray(msg.content)) {
                    for (const part of msg.content as Array<{
                      type: string;
                      toolCallId: string;
                      toolName?: string;
                      result: unknown;
                    }>) {
                      if (part.type === 'tool-result') {
                        // Find the matching tool call and add the result
                        const matchingInvocation = allToolInvocations.find(
                          (inv) => inv.toolCallId === part.toolCallId
                        );
                        if (matchingInvocation) {
                          matchingInvocation.result = part.result;
                          matchingInvocation.state = 'result';
                        } else {
                          // Create new invocation if no matching call found
                          allToolInvocations.push({
                            toolCallId: part.toolCallId,
                            toolName: part.toolName || 'unknown',
                            args: undefined,
                            result: part.result,
                            state: 'result',
                          });
                        }
                      }
                    }
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
                    'Missing parent userMsgId when saving assistant message.'
                  );
                }

                // Create parts array including tool invocations
                const messageParts = createPartsFromAIResponse(
                  combinedTextContent,
                  combinedReasoningText,
                  allToolInvocations
                );

                // console.log("DEBUG: Final message parts:", {
                //   partsCount: messageParts.length,
                //   partTypes: messageParts.map(p => p.type),
                //   hasToolInvocations: messageParts.some(p => p.type === "tool-invocation")
                // });

                // Build metadata from response with human-readable model name
                const metadata = buildMetadataFromResponse(
                  usage,
                  response,
                  selectedModel.id,
                  selectedModel.name,
                  startTime,
                  enableSearch,
                  reasoningEffort
                );

                await fetchMutation(
                  api.messages.saveAssistantMessage,
                  {
                    chatId,
                    role: 'assistant',
                    content: combinedTextContent,
                    parentMessageId: userMsgId,
                    parts: messageParts,
                    metadata,
                  },
                  { token }
                );

                if (useUser) {
                  await fetchMutation(
                    api.api_keys.incrementUserApiKeyUsage,
                    { provider: selectedModel.provider },
                    { token }
                  );
                } else {
                  await fetchMutation(
                    api.users.incrementMessageCount,
                    {},
                    { token }
                  );
                }
              } catch (_err) {
                // console.error(
                //   'Error in onFinish while saving assistant messages:',
                //   err
                // );
              } finally {
                if (phClient) {
                  try {
                    await phClient.shutdown();
                  } catch (_error) {
                    // console.error('PostHog shutdown failed:', error);
                  }
                }
              }
            },
          });

        let result: ReturnType<typeof runStream>;
        if (apiKeyUsage?.allowUserKey) {
          const primaryIsUserKey = useUserKey;
          try {
            result = runStream(primaryIsUserKey);
          } catch (primaryError) {
            // Save conversation errors as messages
            if (shouldShowInConversation(primaryError) && token) {
              await saveErrorMessage(
                chatId,
                userMsgId,
                primaryError,
                token,
                selectedModel.id,
                selectedModel.name,
                enableSearch,
                reasoningEffort
              );
            }

            const fallbackIsPossible =
              primaryIsUserKey || (!primaryIsUserKey && !!userApiKey);

            if (fallbackIsPossible) {
              const fallbackIsUserKey = !primaryIsUserKey;
              try {
                result = runStream(fallbackIsUserKey);
              } catch (fallbackError) {
                // Save conversation errors as messages for fallback error too
                if (shouldShowInConversation(fallbackError) && token) {
                  await saveErrorMessage(
                    chatId,
                    userMsgId,
                    fallbackError,
                    token,
                    selectedModel.id,
                    selectedModel.name,
                    enableSearch,
                    reasoningEffort
                  );
                }
                throw fallbackError;
              }
            } else {
              throw primaryError;
            }
          }
        } else {
          try {
            result = runStream(false);
          } catch (streamError) {
            // Save conversation errors as messages
            if (shouldShowInConversation(streamError) && token) {
              await saveErrorMessage(
                chatId,
                userMsgId,
                streamError,
                token,
                selectedModel.id,
                selectedModel.name,
                enableSearch,
                reasoningEffort
              );
            }
            throw streamError;
          }
        }

        result.mergeIntoDataStream(dataStream, { sendReasoning: true });
      },
      onError: (error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return errorMsg;
      },
    });
  } catch (err: unknown) {
    // console.error('Unhandled error in chat API:', err);
    return createErrorResponse(err);
  }
}
