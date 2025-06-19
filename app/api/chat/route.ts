import { MODELS } from "@/lib/config";
import { sanitizeUserInput } from "@/lib/sanitize";
import {
  Message as MessageAISDK,
  streamText,
  createDataStreamResponse,
  smoothStream,
  appendResponseMessages,
} from "ai";
import { exaSearchTool } from "@/app/api/tools";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 60;

type ChatRequest = {
  messages: MessageAISDK[];
  chatId: Id<"chats">;
  model: string;
  systemPrompt: string;
  reloadAssistantMessageId?: Id<"messages">;
  enableSearch?: boolean;
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

    // --- Unified Rate-Limiting Check ---
    await fetchMutation(api.users.assertNotOverLimit, {}, { token });

    return createDataStreamResponse({
      execute: async (dataStream) => {
        let userMsgId: Id<"messages"> | null = null;
        let assistantMsgId: Id<"messages"> | null = null;

        // --- Reload Logic (Delete and Recreate) ---
        if (reloadAssistantMessageId) {
          // 1. Get the parent (user) message ID of the message we are about to delete
          const details = await fetchQuery(
            api.messages.getMessageDetails,
            {
              messageId: reloadAssistantMessageId,
            },
            { token }
          );
          userMsgId = details?.parentMessageId ?? null;

          // 2. Delete the assistant message and any subsequent messages
          await fetchMutation(
            api.messages.deleteMessageAndDescendants,
            {
              messageId: reloadAssistantMessageId,
            },
            { token }
          );
        }

        // --- Insert User Message (if not a reload) ---
        if (!reloadAssistantMessageId) {
          const userMessage = messages[messages.length - 1];
          if (userMessage && userMessage.role === "user") {
            // This mutation now also checks usage, increments, and updates chat timestamp
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

        // --- Stream AI Response ---
        const tools = enableSearch ? { exaSearch: exaSearchTool } : undefined;

        const userKeys = await fetchQuery(api.apiKeys.getApiKeys, {}, { token });
        const keyEntry = userKeys.find((k) => k.provider === selectedModel?.provider);
        let userApiKey: string | null = null;
        if (keyEntry) {
          userApiKey = await fetchQuery(
            api.apiKeys.getDecryptedKey,
            { provider: selectedModel!.provider },
            { token }
          );
        }

        const makeOptions = (useUser: boolean): Record<string, unknown> | undefined => {
          if (selectedModel?.provider === "gemini") {
            const google: Record<string, unknown> = {
              thinkingConfig: { includeThoughts: true },
            };
            if (useUser && userApiKey) google.apiKey = userApiKey;
            return { google };
          }
          if (selectedModel?.provider === "openai" && useUser && userApiKey) {
            return { openai: { apiKey: userApiKey } };
          }
          if (selectedModel?.provider === "claude" && useUser && userApiKey) {
            return { anthropic: { apiKey: userApiKey } };
          }
          return undefined;
        };

        const runStream = (useUser: boolean) =>
          streamText({
            model: selectedModel!.api_sdk,
            system: systemPrompt || "You are a helpful assistant.",
            messages,
            tools,
            maxSteps: 5,
            providerOptions: makeOptions(useUser),
            experimental_transform: smoothStream({
              delayInMs: 20,
              chunking: "word",
            }),
            onError: (error) => {
              console.log("Error in streamText:", error);
            },

          async onFinish({ response }) {
            const userMessage = messages[messages.length - 1];
            try {
              // console.log("response", response.messages)
              for (const msg of response.messages) {
                // console.log("msg", msg)
                if (
                  msg.role === "assistant" &&
                  Array.isArray(msg.content) &&
                  msg.content.every(
                    (item) => item.type === "reasoning" || item.type === "text"
                  )
                ) {
                  const textContent =
                    typeof msg.content === "string"
                      ? msg.content
                      : Array.isArray(msg.content)
                      ? msg.content
                          .filter((part) => part.type === "text")
                          .map((part) => part.text)
                          .join("")
                      : "";
                  const reasoningText = msg.content.find((part) => part.type === "reasoning")?.text || undefined;
                  // console.log("textContent", textContent)
                  // console.log("reasoningText", reasoningText)

                  const [, assistantMessage] = appendResponseMessages({
                    messages: [userMessage],
                    responseMessages: response.messages,
                  });

                  // Ensure userMsgId is available before proceeding
                  if (!userMsgId) {
                    throw new Error("Missing parent userMsgId when saving assistant message.");
                  }

                  const { messageId } = await fetchMutation(
                    api.messages.saveAssistantMessage,
                    {
                      chatId: chatId,
                      role: "assistant",
                      content: textContent,
                      parentMessageId: userMsgId, // userMsgId must be set by this point
                      reasoningText: reasoningText,
                      model: model,
                      parts: assistantMessage.parts,
                    },
                    { token }
                  );
                  assistantMsgId = messageId;

                  // Now, increment the usage
                  await fetchMutation(
                    api.users.incrementMessageCount,
                    {},
                    { token }
                  );
                }
              }
              // Send both IDs to the frontend
              dataStream.writeData({ userMsgId, assistantMsgId });
            } catch (err) {
              console.error(
                "Error in onFinish while saving assistant messages:",
                err
              );
            }
          },
        });

        let result;
        try {
          result = runStream(keyEntry?.mode === "priority");
        } catch (err) {
          if (keyEntry?.mode === "fallback" && userApiKey) {
            result = runStream(true);
          } else {
            throw err;
          }
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
