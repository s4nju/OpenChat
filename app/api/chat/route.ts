// /chat/api/chat.ts
import { checkUsage, incrementUsage } from "@/lib/api"
import { MODELS } from "@/lib/config"
import { sanitizeUserInput } from "@/lib/sanitize"
import { validateUserIdentity } from "@/lib/server/api"
import { Attachment } from "@ai-sdk/ui-utils"
import { Message as MessageAISDK, streamText } from "ai"

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 30

type ChatRequest = {
  messages: MessageAISDK[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
}

export async function POST(req: Request) {
  try {
    let userMsgId: number | null = null
    let assistantMsgId: number | null = null
    const { messages, chatId, userId, model, isAuthenticated, systemPrompt } =
      (await req.json()) as ChatRequest

    if (!messages || !chatId || !userId) {
      return new Response(
        JSON.stringify({ error: "Error, missing information" }),
        { status: 400 }
      )
    }

    const supabase = await validateUserIdentity(userId, isAuthenticated)

    // First check if the user is within their usage limits
    await checkUsage(supabase, userId)

    const userMessage = messages[messages.length - 1]
    if (userMessage && userMessage.role === "user") {
      const { data: userMsgData, error: msgError } = await supabase
        .from("messages")
        .insert({
          chat_id: chatId,
          role: "user",
          content: sanitizeUserInput(userMessage.content),
          experimental_attachments:
            userMessage.experimental_attachments as unknown as Attachment[],
          user_id: userId,
        })
        .select("id")
        .single()
      if (msgError) {
        console.error("Error saving user message:", msgError)
      } else {
        console.log("User message saved successfully.")

        userMsgId = userMsgData?.id ?? null
        console.log("User message ID:", userMsgId)

        // Increment usage only after confirming the message was saved
        await incrementUsage(supabase, userId)
      }
    }

    // Lookup model and check if it supports reasoning
    const selectedModel = MODELS.find((m) => m.id === model);

    const result = streamText({
      model: selectedModel?.api_sdk!,
      system: systemPrompt || "You are a helpful assistant.",
      messages,
      // When the response finishes, insert the assistant messages to supabase
      async onFinish({ response }) {
        try {
          console.log("Response finished:", response)
          for (const msg of response.messages) {
            console.log("Response message role:", msg.role)
            if (msg.content) {
              // Extract text content from potential parts array
              let textContent = "";
              let reasoningText = null;

              if (typeof msg.content === 'string') {
                textContent = msg.content;
              } else if (Array.isArray(msg.content)) {
                textContent = msg.content
                  .filter(part => part.type === 'text')
                  .map(part => part.text)
                  .join('');
                // Extract reasoning parts
                // Extract reasoning text from reasoning parts
                const reasoningParts = msg.content
                  .filter(part => part.type === 'reasoning' && typeof part.text === 'string')
                  .map(part => (part as any).text)
                  .filter(Boolean);
                if (reasoningParts.length > 0) {
                  reasoningText = reasoningParts.join('\n\n');
                }
              }

              // Prepare payload for database insertion
              const insertPayload = {
                chat_id: chatId,
                role: "assistant" as const,
                content: textContent,
                parent_message_id: userMsgId,
                user_id: userId,
                reasoning_text: reasoningText,
              };

              const {data: assistantMsgData, error: assistantError } = await supabase
                .from("messages")
                .insert(insertPayload)
                .select("id")
                .single();
              if (assistantError) {
                console.error("Error saving assistant message:", assistantError);
              } else {
                console.log("Assistant message saved successfully.");
                console.log("Assistant message ID:", assistantMsgData?.id);
                assistantMsgId = assistantMsgData?.id ?? null;
                console.log("Assistant message ID:", assistantMsgId);
              }
            }
          }
        } catch (err) {
          console.error(
            "Error in onFinish while saving assistant messages:",
            err
          );
        }
      },
    });

    // Ensure the stream is consumed so onFinish is triggered.
    result.consumeStream()
    // Conditionally send reasoning tokens to the client if model supports it
    // Always send reasoning if available
    const originalResponse = result.toDataStreamResponse({ sendReasoning: true });
    console.log("Original response:", originalResponse);

    // Optionally attach chatId in a custom header.
    const headers = new Headers(originalResponse.headers)
    headers.set("X-Chat-Id", chatId)
    headers.set("X-User-Message-Id", String(userMsgId))
    headers.set("X-Assistant-Message-Id", String(assistantMsgId))

    return new Response(originalResponse.body, {
      status: originalResponse.status,
      headers,
    })
  } catch (err: any) {
    // console.error("Error in /chat/api/chat:", err)
    // Return a structured error response if the error is a UsageLimitError.
    if (err.code === "DAILY_LIMIT_REACHED") {
      return new Response(
        JSON.stringify({ error: err.message, code: err.code }),
        { status: 403 }
      )
    }

    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500 }
    )
  }
}
