/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: <main route> */
import type { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import type { OpenAIResponsesProviderOptions } from '@ai-sdk/openai';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
// import { withTracing } from '@posthog/ai';
import {
  consumeStream,
  convertToModelMessages,
  type FileUIPart,
  experimental_generateImage as generateImage,
  type JSONValue,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { fetchAction, fetchMutation, fetchQuery } from 'convex/nextjs';
import { ConvexError, type Infer } from 'convex/values';
import { searchTool } from '@/app/api/tools';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';
import type { Message } from '@/convex/schema/message';
import { getComposioTools, listConnectedAccounts } from '@/lib/composio-server';
import { MODELS_MAP } from '@/lib/config';
import { ERROR_CODES } from '@/lib/error-codes';
import {
  classifyError,
  createErrorPart,
  createErrorResponse,
  createStreamingError,
  shouldShowInConversation,
} from '@/lib/error-utils';
import { buildSystemPrompt, PERSONAS_MAP } from '@/lib/prompt_config';
import { sanitizeUserInput } from '@/lib/sanitize';

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 120;

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
      return null;
    }

    const classified = classifyError(error);
    const errorPart = createErrorPart(
      classified.code,
      classified.userFriendlyMessage,
      classified.message
    );

    const { messageId } = await fetchMutation(
      api.messages.saveAssistantMessage,
      {
        chatId,
        role: 'assistant',
        content: '', // Empty content to avoid duplication and search pollution
        parentMessageId: userMsgId,
        parts: [errorPart],
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
  messages: UIMessage[],
  chatId: Id<'chats'>,
  token: string | undefined,
  reloadAssistantMessageId?: Id<'messages'>
): Promise<Id<'messages'> | null> {
  if (!reloadAssistantMessageId && token) {
    const userMessage = messages.at(-1);
    if (userMessage && userMessage.role === 'user') {
      // Use parts directly since schema now matches AI SDK v5
      const userParts = (userMessage.parts || []).map((p) =>
        p.type === 'text' ? { ...p, text: sanitizeUserInput(p.text) } : p
      );

      // Extract text content for backwards compatibility
      const textContent = userParts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');

      const { messageId } = await fetchMutation(
        api.messages.sendUserMessageToChat,
        {
          chatId,
          role: 'user',
          content: sanitizeUserInput(textContent),
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
  messages: UIMessage[];
  chatId: Id<'chats'>;
  model: string;
  personaId?: string;
  reloadAssistantMessageId?: Id<'messages'>;
  enableSearch?: boolean;
  reasoningEffort?: ReasoningEffort;
  userInfo?: { timezone?: string };
};

/**
 * Helper function to check if a model should have thinking enabled
 * based on its features configuration
 */
const shouldEnableThinking = (modelId: string): boolean => {
  const model = MODELS_MAP[modelId];
  if (!model) {
    return false;
  }

  const reasoningFeature = model.features?.find((f) => f.id === 'reasoning');
  return reasoningFeature?.enabled === true;
};

/**
 * Helper function to check if a model supports tool calling
 * based on its features configuration
 */
const supportsToolCalling = (
  selectedModel: (typeof MODELS_MAP)[string]
): boolean => {
  return (
    selectedModel.features?.some(
      (feature) => feature.id === 'tool-calling' && feature.enabled === true
    ) ?? false
  );
};

const buildGoogleProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): GoogleGenerativeAIProviderOptions => {
  const options: GoogleGenerativeAIProviderOptions = {};

  // Check if model supports reasoning using centralized configuration
  if (REASONING_MODELS.google.some((m) => modelId.includes(m))) {
    const enableThinking = shouldEnableThinking(modelId);

    if (enableThinking) {
      options.thinkingConfig = {
        includeThoughts: true,
        thinkingBudget: reasoningEffort
          ? REASONING_BUDGETS[reasoningEffort].google
          : REASONING_BUDGETS.medium.google,
      };
    }
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

/**
 * Handle image generation for image generation models
 */
async function handleImageGeneration({
  messages,
  chatId,
  selectedModel,
  userMsgId,
  token,
}: {
  messages: UIMessage[];
  chatId: Id<'chats'>;
  selectedModel: (typeof MODELS_MAP)[string];
  userMsgId: Id<'messages'> | null;
  token?: string;
}) {
  let currentUserMsgId: Id<'messages'> | null = userMsgId;

  try {
    // Save user message first
    if (!currentUserMsgId && token) {
      currentUserMsgId = await saveUserMessage(messages, chatId, token);
    }
    // Extract the prompt from the last user message parts
    const lastMessage = messages.at(-1);
    // console.log(lastMessage);
    const textPart = lastMessage?.parts?.find((part) => part.type === 'text');
    const prompt = textPart?.text || 'A beautiful image';

    // Generate the image using built-in API key
    // Use different parameters based on provider (OpenAI uses size, Google uses aspectRatio)
    const { image } =
      selectedModel.provider === 'openai'
        ? await generateImage({
            model: selectedModel.api_sdk,
            prompt,
            size: '1024x1024',
          })
        : await generateImage({
            model: selectedModel.api_sdk,
            prompt,
            aspectRatio: '1:1',
          });

    // console.log(image);

    // Upload image to Convex storage
    const imageBuffer = image.uint8Array;
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });

    const uploadUrl = await fetchAction(
      api.files.generateUploadUrl,
      {},
      { token }
    );

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: imageBlob,
      headers: {
        'Content-Type': 'image/png',
      },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload generated image');
    }

    const { storageId } = await uploadResponse.json();

    // Generate the proper public storage URL
    const properStorageUrl = await fetchQuery(
      api.files.getStorageUrl,
      { storageId },
      { token }
    );

    if (!properStorageUrl) {
      throw new Error('Failed to generate storage URL for uploaded image');
    }

    // Save generated image to attachments table
    if (token) {
      await fetchAction(
        api.files.saveGeneratedImage,
        {
          fileName: storageId,
          chatId,
          fileType: 'image/png',
          fileSize: imageBuffer.length,
          url: properStorageUrl,
        },
        { token }
      );
    }

    // Create file part for the generated image
    const filePart: FileUIPart = {
      type: 'file',
      filename: storageId,
      mediaType: 'image/png',
      url: properStorageUrl,
    };

    // Save assistant message with image
    if (currentUserMsgId && token) {
      await fetchMutation(
        api.messages.saveAssistantMessage,
        {
          chatId,
          role: 'assistant',
          content: '', // Empty content - let the image speak for itself
          parentMessageId: currentUserMsgId,
          parts: [filePart], // Only include the file part, no redundant text
          metadata: {
            modelId: selectedModel.id,
            modelName: selectedModel.name,
            includeSearch: false,
            reasoningEffort: 'none',
          },
        },
        { token }
      );
    }

    // Increment premium credits usage since image generation uses premium credits
    if (token) {
      await fetchMutation(
        api.users.incrementMessageCount,
        { usesPremiumCredits: true },
        { token }
      );
    }

    // Return success response
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (currentUserMsgId && token) {
      await saveErrorMessage(
        chatId,
        currentUserMsgId,
        error,
        token,
        selectedModel.id,
        selectedModel.name
      );
    }
    return createErrorResponse(error);
  }
}

export async function POST(req: Request) {
  req.signal.addEventListener('abort', () => {
    // Request aborted by client
  });

  try {
    const {
      messages,
      chatId,
      model,
      personaId,
      reloadAssistantMessageId,
      enableSearch,
      reasoningEffort,
      userInfo,
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

    const selectedModel = MODELS_MAP[model];
    if (!selectedModel) {
      return createErrorResponse(new Error("Invalid 'model' provided."));
    }

    const token = await convexAuthNextjsToken();

    // --- Optimized Parallel Database Queries ---
    // Run independent queries in parallel to reduce latency
    const [user, userKeys, isUserPremiumForPremiumModels, composioTools] =
      await Promise.all([
        // Get current user for PostHog tracking and auth
        fetchQuery(api.users.getCurrentUser, {}, { token }),
        // Get user API keys if model allows user keys
        selectedModel.apiKeyUsage?.allowUserKey
          ? fetchQuery(api.api_keys.getApiKeys, {}, { token }).catch(() => [])
          : Promise.resolve([]),
        // Check premium status for premium models (only if needed)
        selectedModel.premium
          ? fetchQuery(api.users.userHasPremium, {}, { token }).catch(
              () => false
            )
          : Promise.resolve(false),
        // Get Composio tools for connected accounts (only if model supports tool calling)
        (async () => {
          try {
            // Only fetch tools if the model supports tool calling
            if (!supportsToolCalling(selectedModel)) {
              return {};
            }

            const currentUser = await fetchQuery(
              api.users.getCurrentUser,
              {},
              { token }
            );
            if (!currentUser) {
              return {};
            }

            const connectedAccounts = await listConnectedAccounts(
              currentUser._id
            );
            const connectedToolkitSlugs = connectedAccounts
              .filter((account) => account.status === 'ACTIVE')
              .map((account) => account.toolkit.slug.toUpperCase());

            if (connectedToolkitSlugs.length > 0) {
              return await getComposioTools(
                currentUser._id,
                connectedToolkitSlugs
              );
            }
            return {};
          } catch {
            // If Composio tools fail to load, continue without them
            return {};
          }
        })(),
      ]);

    // const userId = user?._id;

    // --- API Key and Model Configuration ---
    const { apiKeyUsage } = selectedModel;
    let userApiKey: string | null = null;
    let keyEntry: { provider: string; mode?: string } | undefined;

    if (apiKeyUsage?.allowUserKey && Array.isArray(userKeys)) {
      try {
        keyEntry = userKeys.find((k) => k.provider === selectedModel.provider);
        if (keyEntry) {
          userApiKey = await fetchQuery(
            api.api_keys.getDecryptedKey,
            { provider: selectedModel.provider as SupportedProvider },
            { token }
          );
        }
      } catch (e) {
        // console.error('Failed to decrypt user API key:', e);
        // If this is a critical error (auth failure), we should return early
        if (
          e instanceof ConvexError &&
          e.data === ERROR_CODES.NOT_AUTHENTICATED
        ) {
          return createErrorResponse(e);
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

    // --- Premium Model Access Check ---
    // Only applies if user is NOT using their own API key
    if (
      selectedModel.premium &&
      !useUserKey &&
      !isUserPremiumForPremiumModels
    ) {
      // Save user message first
      const userMsgId = await saveUserMessage(
        messages,
        chatId,
        token,
        reloadAssistantMessageId
      );

      // Create premium access error
      const premiumError = new Error('PREMIUM_MODEL_ACCESS_DENIED');

      // Save error message to conversation
      if (token) {
        await saveErrorMessage(
          chatId,
          userMsgId,
          premiumError,
          token,
          selectedModel.id,
          selectedModel.name,
          enableSearch,
          reasoningEffort
        );
      }

      // Return proper HTTP error response
      return createErrorResponse(premiumError);
    }

    // --- Rate Limiting (only if not using user key) ---
    let rateLimitError: Error | null = null;

    if (!useUserKey) {
      try {
        // Check if the selected model uses premium credits
        const usesPremiumCredits = selectedModel.usesPremiumCredits === true;

        await fetchMutation(
          api.users.assertNotOverLimit,
          { usesPremiumCredits },
          { token }
        );
      } catch (error) {
        if (error instanceof ConvexError) {
          const errorCode = error.data;
          if (
            errorCode === ERROR_CODES.DAILY_LIMIT_REACHED ||
            errorCode === ERROR_CODES.MONTHLY_LIMIT_REACHED ||
            errorCode === ERROR_CODES.PREMIUM_LIMIT_REACHED
          ) {
            rateLimitError = error;
            // Don't throw yet - let user message save first
          } else {
            throw error; // Re-throw non-rate-limit errors
          }
        } else {
          throw error; // Re-throw non-ConvexError errors
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

    const basePrompt = personaId ? PERSONAS_MAP[personaId]?.prompt : undefined;
    const finalSystemPrompt = buildSystemPrompt(
      user,
      basePrompt,
      enableSearch,
      userInfo?.timezone
    );

    // Check if this is an image generation model
    const isImageGenerationModel = selectedModel.features?.some(
      (feature) => feature.id === 'image-generation' && feature.enabled
    );

    // Handle image generation models differently
    if (isImageGenerationModel) {
      // Image generation always uses built-in API key, no user key support
      return handleImageGeneration({
        messages,
        chatId,
        selectedModel,
        userMsgId: null,
        token,
      });
    }

    // console.log('DEBUG: finalSystemPrompt', finalSystemPrompt);

    // --- Reload Logic (Delete and Recreate) ---
    let userMsgId: Id<'messages'> | null = null;
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
    if (!userMsgId) {
      userMsgId = await saveUserMessage(
        messages,
        chatId,
        token,
        reloadAssistantMessageId
      );
    }

    const makeOptions = (useUser: boolean) => {
      const key = useUser ? userApiKey : undefined;

      if (selectedModel.provider === 'gemini') {
        return {
          google: {
            ...buildGoogleProviderOptions(selectedModel.id, reasoningEffort),
            apiKey: key,
          },
        };
      }
      if (selectedModel.provider === 'openai') {
        return {
          openai: {
            ...buildOpenAIProviderOptions(selectedModel.id, reasoningEffort),
            apiKey: key,
          },
        };
      }
      if (selectedModel.provider === 'anthropic') {
        return {
          anthropic: {
            ...buildAnthropicProviderOptions(selectedModel.id, reasoningEffort),
            apiKey: key,
          },
        };
      }
      return;
    };

    const startTime = Date.now();
    // Pre-build the base metadata object before the stream starts
    const baseMetadata = {
      modelId: selectedModel.id,
      modelName: selectedModel.name,
      includeSearch: enableSearch,
      reasoningEffort: reasoningEffort || 'none',
    };
    let finalUsage = {
      inputTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      cachedInputTokens: 0,
    };

    // Create reusable streamText function with shared logic
    const createStreamTextCall = (useUser: boolean) => {
      return streamText({
        model: selectedModel.api_sdk,
        system: finalSystemPrompt,
        messages: convertToModelMessages(messages),
        tools: {
          ...(enableSearch ? { search: searchTool } : {}),
          ...(supportsToolCalling(selectedModel) ? composioTools : {}),
        },
        stopWhen: stepCountIs(5),
        // COMMENTED OUT: abortSignal: req.signal
        //
        // Why we don't forward client abort signals to AI provider:
        // 1. Page reloads/navigation send abort signals that we don't want to forward to AI
        // 2. We use result.consumeStream() below to ensure completion even on client disconnect
        // 3. Client disconnects (page reload, tab close) should NOT stop AI generation on server
        // 4. Server should complete the generation and save full response to database
        // 5. Only intentional user "stop" actions should abort AI generation (handled separately)
        //
        // Current behavior with this commented out:
        // - Page reload during streaming: AI continues on server, full response saved
        // - User clicks stop: Client stops receiving updates, server completes in background
        // - Browser/tab close: AI continues on server, full response saved
        //
        // This follows AI SDK v5 best practices for handling client disconnects
        // abortSignal: req.signal,
        providerOptions: makeOptions(useUser) as
          | Record<string, Record<string, JSONValue>>
          | undefined,
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
        onFinish({ usage }) {
          // This only runs on successful completion.
          // Just capture the usage data here.
          finalUsage = {
            inputTokens: usage.inputTokens || 0,
            outputTokens: usage.outputTokens || 0,
            reasoningTokens: usage.reasoningTokens || 0,
            totalTokens: usage.totalTokens || 0,
            cachedInputTokens: usage.cachedInputTokens || 0,
          };
        },
      });
    };

    // Try to get the result using the appropriate API key configuration
    let result: ReturnType<typeof createStreamTextCall>;
    let wasUserKeyUsed: boolean;

    if (apiKeyUsage?.allowUserKey) {
      const primaryIsUserKey = useUserKey;
      try {
        wasUserKeyUsed = primaryIsUserKey;
        result = createStreamTextCall(primaryIsUserKey);
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
            wasUserKeyUsed = fallbackIsUserKey;
            result = createStreamTextCall(fallbackIsUserKey);
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
      wasUserKeyUsed = false;
      try {
        result = createStreamTextCall(false);
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

    // consume the stream to ensure it runs to completion & triggers onFinish
    // even when the client response is aborted:
    result.consumeStream(); // no await

    // Return the new toUIMessageStreamResponse with simplified message persistence
    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      sendReasoning: true,
      sendSources: true,
      onFinish: async (Messages) => {
        // This callback ALWAYS runs, even on abort.
        // Construct the final metadata here.
        const finalMetadata: Infer<typeof Message>['metadata'] = {
          ...baseMetadata,
          serverDurationMs: Date.now() - startTime,
          inputTokens: finalUsage.inputTokens,
          outputTokens: finalUsage.outputTokens,
          totalTokens: finalUsage.totalTokens,
          reasoningTokens: finalUsage.reasoningTokens,
          cachedInputTokens: finalUsage.cachedInputTokens,
        };

        // Save the final assistant message with all parts
        const capturedText = Messages.responseMessage.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join('');
        await fetchMutation(
          api.messages.saveAssistantMessage,
          {
            chatId,
            role: 'assistant',
            content: capturedText,
            parentMessageId: userMsgId || undefined,
            parts: Messages.responseMessage.parts,
            metadata: finalMetadata,
          },
          { token }
        );
        if (wasUserKeyUsed) {
          await fetchMutation(
            api.api_keys.incrementUserApiKeyUsage,
            { provider: selectedModel.provider },
            { token }
          );
        } else {
          // Check if the selected model uses premium credits
          const usesPremiumCredits = selectedModel.usesPremiumCredits === true;

          await fetchMutation(
            api.users.incrementMessageCount,
            { usesPremiumCredits },
            { token }
          );
        }
      },
      consumeSseStream: consumeStream,
    });
  } catch (err) {
    // console.log('Unhandled error in chat API:', err);
    return createErrorResponse(err);
  }
}
