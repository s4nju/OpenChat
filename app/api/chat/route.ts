import { MODELS } from "@/lib/config";
import { sanitizeUserInput } from "@/lib/sanitize";
import {
  Message as MessageAISDK,
  streamText,
  createDataStreamResponse,
  smoothStream,
  appendResponseMessages,
  JSONValue,
} from "ai";
import { exaSearchTool } from "@/app/api/tools";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { AnthropicProviderOptions } from "@ai-sdk/anthropic";
import type { GoogleGenerativeAIProviderOptions } from "@ai-sdk/google";
import type { OpenAIResponsesProviderOptions } from "@ai-sdk/openai";

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 60;

type ReasoningEffort = "low" | "medium" | "high";

type ChatRequest = {
  messages: MessageAISDK[];
  chatId: Id<"chats">;
  model: string;
  systemPrompt: string;
  reloadAssistantMessageId?: Id<"messages">;
  enableSearch?: boolean;
  reasoningEffort?: ReasoningEffort;
};

const buildGoogleProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): GoogleGenerativeAIProviderOptions => {
  const options: GoogleGenerativeAIProviderOptions = {};

  if (["2.5-flash", "2.5-pro"].some((m) => modelId.includes(m))) {
    options.thinkingConfig = {
      includeThoughts: true,
      thinkingBudget:
        reasoningEffort === "low"
          ? 1000
          : reasoningEffort === "medium"
            ? 6000
            : 12000,
    };
  }

  return options;
};

const buildOpenAIProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): OpenAIResponsesProviderOptions => {
  const options: OpenAIResponsesProviderOptions = {};

  if (["o1", "o3", "o4"].some((m) => modelId.includes(m)) && reasoningEffort) {
    options.reasoningEffort = reasoningEffort;
    options.reasoningSummary = "detailed";
  }

  return options;
};

const buildAnthropicProviderOptions = (
  modelId: string,
  reasoningEffort?: ReasoningEffort
): AnthropicProviderOptions => {
  const options: AnthropicProviderOptions = {};

  if (
    reasoningEffort &&
    ["sonnet-4", "4-sonnet", "4-opus", "opus-4", "3-7"].some((m) =>
      modelId.includes(m)
    )
  ) {
    options.thinking = {
      type: "enabled",
      budgetTokens:
        reasoningEffort === "low"
          ? 1024
          : reasoningEffort === "medium"
            ? 6000
            : 12000,
    };
  }

  return options;
};

export async function POST(req: Request) {
  req.signal.addEventListener("abort", () => {
    console.log("Request aborted by client");
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

    if (!messages || !chatId) {
      return new Response(
        JSON.stringify({ error: "Error, missing required information" }),
        { status: 400 }
      );
    }

    // --- Enhanced Input Validation ---
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "'messages' must be a non-empty array." }),
        { status: 400 }
      );
    }

    if (typeof chatId !== "string" || chatId.trim() === "") {
      return new Response(
        JSON.stringify({ error: "'chatId' must be a non-empty string." }),
        { status: 400 }
      );
    }

    const selectedModel = MODELS.find((m) => m.id === model);
    if (!selectedModel) {
      return new Response(
        JSON.stringify({ error: "Invalid 'model' provided." }),
        { status: 400 }
      );
    }

    if (systemPrompt && systemPrompt.length > 1000) {
      return new Response(
        JSON.stringify({ error: "'systemPrompt' must not exceed 1000 characters." }),
        { status: 400 }
      );
    }

    const token = await convexAuthNextjsToken();

    // --- API Key and Model Configuration ---
    const { apiKeyUsage } = selectedModel;
    let userApiKey: string | null = null;
    let keyEntry: { provider: string; mode?: string } | undefined;

    if (apiKeyUsage?.allowUserKey) {
      try {
        const userKeys = await fetchQuery(api.api_keys.getApiKeys, {}, { token });
        keyEntry = userKeys.find((k) => k.provider === selectedModel.provider);
        if (keyEntry) {
          userApiKey = await fetchQuery(
            api.api_keys.getDecryptedKey,
            { provider: selectedModel.provider },
            { token }
          );
        }
      } catch (e) {
        console.error("Failed to fetch or decrypt user API key:", e);
        // If this is a critical error (auth failure), we should return early
        if (e instanceof Error && e.message.includes("Not authenticated")) {
          return new Response(
            JSON.stringify({ error: "Authentication required" }),
            { status: 401 }
          );
        }
      }
    }

    // Determine if we should use a user-provided API key
    const useUserKey = Boolean(
      (apiKeyUsage?.userKeyOnly && userApiKey) ||
      (keyEntry?.mode === "priority" && userApiKey)
    );

    // Reject early if model requires user key only but no user API key provided
    if (apiKeyUsage?.userKeyOnly && !userApiKey) {
      return new Response(
        JSON.stringify({ error: "USER_KEY_REQUIRED", message: "This model requires a user-provided API key." }),
        { status: 401 }
      );
    }

    // --- Rate Limiting (only if not using user key) ---
    if (!useUserKey) {
      await fetchMutation(api.users.assertNotOverLimit, {}, { token });
    }

    return createDataStreamResponse({
      execute: async (dataStream) => {
        let userMsgId: Id<"messages"> | null = null;
        let assistantMsgId: Id<"messages"> | null = null;

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
        if (!reloadAssistantMessageId) {
          const userMessage = messages[messages.length - 1];
          if (userMessage && userMessage.role === "user") {
            const { messageId } = await fetchMutation(
              api.messages.sendUserMessageToChat,
              {
                chatId: chatId,
                role: "user",
                content: sanitizeUserInput(userMessage.content as string),
                experimentalAttachments: userMessage.experimental_attachments,
              },
              { token }
            );
            userMsgId = messageId;
          }
        }

        const makeOptions = (useUser: boolean) => {
          const key = useUser ? userApiKey : undefined;

          if (selectedModel.provider === "gemini") {
            return {
              google: {
                ...buildGoogleProviderOptions(selectedModel.id, reasoningEffort),
                apiKey: key,
              },
            };
          }
          if (selectedModel.provider === "openai") {
            return {
              openai: {
                ...buildOpenAIProviderOptions(selectedModel.id, reasoningEffort),
                apiKey: key,
              },
            };
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
            };
          }
          return undefined;
        };

        const runStream = (useUser: boolean) =>
          streamText({
            model: selectedModel.api_sdk,
            system: systemPrompt || "You are a helpful assistant.",
            messages,
            tools: enableSearch ? { exaSearch: exaSearchTool } : undefined,
            maxSteps: 5,
            providerOptions: makeOptions(useUser) as Record<string, Record<string, JSONValue>> | undefined,
            experimental_transform: smoothStream({ delayInMs: 20, chunking: "word" }),
            onError: (error) => console.log("Error in streamText:", error),
            async onFinish({ response }) {
              const userMessage = messages[messages.length - 1];
              try {
                for (const msg of response.messages) {
                  if (
                    msg.role === "assistant" &&
                    Array.isArray(msg.content) &&
                    msg.content.every((item) => item.type === "reasoning" || item.type === "text")
                  ) {
                    const textContent = msg.content.filter((p) => p.type === "text").map((p) => p.text).join("");
                    const reasoningText = msg.content.find((p) => p.type === "reasoning")?.text;
                    const [, assistantMessage] = appendResponseMessages({
                      messages: [userMessage],
                      responseMessages: response.messages,
                    });

                    if (!userMsgId) {
                      throw new Error("Missing parent userMsgId when saving assistant message.");
                    }

                    const { messageId } = await fetchMutation(
                      api.messages.saveAssistantMessage,
                      {
                        chatId,
                        role: "assistant",
                        content: textContent,
                        parentMessageId: userMsgId,
                        reasoningText,
                        model,
                        parts: assistantMessage.parts,
                      },
                      { token }
                    );
                    assistantMsgId = messageId;

                    if (useUser) {
                      await fetchMutation(
                        api.api_keys.incrementUserApiKeyUsage,
                        { provider: selectedModel.provider },
                        { token }
                      );
                    } else {
                      await fetchMutation(api.users.incrementMessageCount, {}, { token });
                    }
                  }
                }
                dataStream.writeData({ userMsgId, assistantMsgId });
              } catch (err) {
                console.error("Error in onFinish while saving assistant messages:", err);
              }
            },
          });

        let result;
        if (apiKeyUsage?.allowUserKey) {
          const primaryIsUserKey = useUserKey;
          try {
            // console.log(`Attempting stream with ${primaryIsUserKey ? 'user' : 'internal'} key for ${selectedModel.provider}.`);
            result = runStream(primaryIsUserKey);
          } catch (primaryError) {
            // console.warn(`Stream with ${primaryIsUserKey ? 'user' : 'internal'} key failed.`, primaryError);

            const fallbackIsPossible = primaryIsUserKey || (!primaryIsUserKey && !!userApiKey);

            if (fallbackIsPossible) {
              const fallbackIsUserKey = !primaryIsUserKey;
              // console.log(`Falling back to ${fallbackIsUserKey ? 'user' : 'internal'} key.`);
              try {
                result = runStream(fallbackIsUserKey);
              } catch (fallbackError) {
                // console.error(`Fallback with ${fallbackIsUserKey ? 'user' : 'internal'} key also failed.`, fallbackError);
                throw fallbackError;
              }
            } else {
              // console.error('No fallback key available. Rethrowing initial error.');
              throw primaryError;
            }
          }
        } else {
          // console.log(`Model ${selectedModel.id} does not allow user key; using internal key only.`);
          result = runStream(false);
        }

        result.mergeIntoDataStream(dataStream, { sendReasoning: true });
      },
      onError: (error) => {
        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (err: unknown) {
    const error = err as { message?: string };
    if (
      error.message?.includes("DAILY_LIMIT_REACHED") ||
      error.message?.includes("MONTHLY_LIMIT_REACHED")
    ) {
      return new Response(
        JSON.stringify({ error: error.message, code: "LIMIT_REACHED" }),
        { status: 403 }
      );
    }
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
