// /chat/api/chat.ts
import { checkUsage, incrementUsage } from "@/lib/api"
import { MODELS } from "@/lib/config"
import { sanitizeUserInput } from "@/lib/sanitize"
import { validateUserIdentity } from "@/lib/server/api"
import { Attachment } from "@ai-sdk/ui-utils"
import { Message as MessageAISDK, streamText, createDataStreamResponse } from "ai"

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 60

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  reloadAssistantMessageId?: number
}

// reasoningMiddleware is applied in config via MODELS

export async function POST(req: Request) {
  try {
    const {
      messages,
      chatId,
      userId,
      model,
      isAuthenticated,
      systemPrompt,
      reloadAssistantMessageId,
    } = (await req.json()) as ChatRequest;

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      );
    }

    const supabase = await validateUserIdentity(userId, isAuthenticated);

    // First check if the user is within their usage limits
    await checkUsage(supabase, userId);

    // Lookup model and check if it supports reasoning
    const selectedModel = MODELS.find((m) => m.id === model);

    return createDataStreamResponse({
      execute: async (dataStream) => {
        // Use api_sdk from config, which includes reasoning middleware if enabled
        let userMsgId: number | null = null;
        let assistantMsgId: number | null = null;

        // For reload, fetch existing parent_message_id
        if (reloadAssistantMessageId) {
          const { data: existingMsg, error: parentErr } = await supabase
            .from("messages")
            .select("parent_message_id")
            .eq("id", reloadAssistantMessageId)
            .single();
          if (parentErr) {
            console.error("Error fetching parent_message_id:", parentErr);
          } else {
            userMsgId = existingMsg?.parent_message_id ?? null;
          }
        }
        // *** NEW: delete all downstream messages after the one being reloaded ***
        if (reloadAssistantMessageId) {
          const { error: delErr } = await supabase
            .from("messages")
            .delete()
            .eq("chat_id", chatId)
            .gt("id", reloadAssistantMessageId);
          if (delErr) console.error("Error deleting downstream messages:", delErr);
        }
        // Insert user message unless this is a reload
        if (!reloadAssistantMessageId) {
          const userMessage = messages[messages.length - 1];
          if (userMessage && userMessage.role === "user") {
            const { data: userMsgData, error: msgError } = await supabase
              .from("messages")
              .insert({
                chat_id: chatId,
                role: "user",
                content: sanitizeUserInput(userMessage.content),
                experimental_attachments: userMessage.experimental_attachments
                  ? JSON.parse(JSON.stringify(userMessage.experimental_attachments))
                  : undefined,
                user_id: userId,
                model: selectedModel?.id,
              })
              .select("id")
              .single();
            if (msgError) {
              console.error("Error saving user message:", msgError);
            } else {
              userMsgId = userMsgData?.id ?? null;
              await incrementUsage(supabase, userId);
            }
          }
        }

        // Stream AI response and insert assistant message on finish
        const result = streamText({
          model: selectedModel?.api_sdk!,
          system: systemPrompt || "You are a helpful assistant.",
          messages,
          async onFinish({ response }) {
            try {
              for (const msg of response.messages) {
                if (msg.content) {
                  // Use the middleware-extracted reasoning
                  const textContent = typeof msg.content === 'string' ? msg.content : (Array.isArray(msg.content) ? msg.content.filter(part => part.type === 'text').map(part => part.text).join('') : '');
                  // The middleware will attach `reasoning` to the message if found
                  const reasoningText = (msg as any).reasoning || null;

                  const insertPayload = {
                    chat_id: chatId,
                    role: "assistant" as const,
                    content: textContent,
                    parent_message_id: userMsgId,
                    user_id: userId,
                    reasoning_text: reasoningText,
                    model: selectedModel?.id,
                  };

                  if (reloadAssistantMessageId) {
                    // Update existing assistant message on reload
                    const { error: updErr } = await supabase
                      .from("messages")
                      .update({
                        content: textContent,
                        reasoning_text: reasoningText,
                        model: selectedModel?.id,
                      })
                      .eq("id", reloadAssistantMessageId);
                    if (updErr) console.error("Error updating assistant message:", updErr);
                    assistantMsgId = reloadAssistantMessageId;
                    // Increment usage count for reload
                    await incrementUsage(supabase, userId);
                  } else {
                    const { data: assistantMsgData, error: assistantError } = await supabase
                      .from("messages")
                      .insert(insertPayload)
                      .select("id")
                      .single();
                    if (assistantError) {
                      console.error("Error saving assistant message:", assistantError);
                    } else {
                      assistantMsgId = assistantMsgData?.id ?? null;
                    }
                  }
                }
              }
              // Send both IDs to the frontend for IndexedDB sync
              dataStream.writeData({ userMsgId, assistantMsgId });
            } catch (err) {
              console.error("Error in onFinish while saving assistant messages:", err);
            }
          },
        });
        result.mergeIntoDataStream(dataStream, { sendReasoning: true });
      },
      onError: error => {
        return error instanceof Error ? error.message : String(error);
      },
    });
  } catch (err: any) {
    if (err.code === "DAILY_LIMIT_REACHED") {
      return new Response(
        JSON.stringify({ error: err.message, code: err.code }),
        { status: 403 }
      );
    }
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
