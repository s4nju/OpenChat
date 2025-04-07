// /chat/api/chat.ts
import { checkUsage, incrementUsage } from "@/app/lib/api"
import { MODELS } from "@/app/lib/config"
import { validateUserIdentity } from "@/app/lib/server/api"
import { Attachment } from "@ai-sdk/ui-utils"
import { Message, streamText, createDataStreamResponse } from "ai" // Import createDataStreamResponse

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 30

type ChatRequest = {
  messages: Message[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
  isRegeneration?: boolean // Add optional flag
}

export async function POST(req: Request) {
  // Destructure the full request body first
  const body = (await req.json()) as ChatRequest
  const { messages, chatId, userId, model, isAuthenticated, systemPrompt, isRegeneration } = body

  // Use createDataStreamResponse to handle streaming data
  return createDataStreamResponse({
    // Main execution logic
    execute: async (dataStream) => {
      try {
        if (!messages || !chatId || !userId) {
          throw new Error("Missing required information")
        }

        const supabase = await validateUserIdentity(userId, isAuthenticated)

        // First check if the user is within their usage limits
        await checkUsage(supabase, userId)

        const userMessage = messages[messages.length - 1]
        let userMessageId: string | null = null
        // Only insert user message if it's the last one AND not a regeneration call
        if (userMessage && userMessage.role === "user" && !isRegeneration) {
          // console.log("POST /api/chat - Inserting user message (not regeneration)");
          const { data: userData, error: msgError } = await supabase
            .from("messages")
            .insert({
              chat_id: chatId,
              role: "user",
              content: userMessage.content,
              attachments:
                userMessage.experimental_attachments as unknown as Attachment[],
            })
            .select('id') // Select the ID
            .single() // Expect a single row back

          if (msgError) {
            // console.error("Error saving user message:", msgError)
            // Decide how to handle: maybe throw error or just log?
            // For now, log and continue, but don't send ID
          } else if (userData) {
            userMessageId = String(userData.id) // Convert ID to string
            // console.log("User message saved successfully with ID:", userMessageId)
            // Send user message ID as general data
            // We'll send this ID later in the annotation
            // dataStream.writeData({ type: 'user_message_saved', id: userMessageId }) // No longer needed here

            // Increment usage only after confirming the message was saved
            await incrementUsage(supabase, userId)
          }
        }

        const result = streamText({
          model: MODELS.find((m) => m.id === model)?.api_sdk!,
          system: systemPrompt || "You are a helpful assistant.",
          messages,
          // When the response finishes, insert the assistant messages.
          async onFinish({ response }) {
            try {
              for (const msg of response.messages) {
                if (msg.content && msg.role === 'assistant') { // Ensure it's an assistant message
                  let plainText = msg.content
                  let reasoningContent = null

                  // Logic for extracting plainText and reasoningContent (simplified for clarity)
                  if (Array.isArray(msg.content)) {
                    const reasoningItems = msg.content.filter((item: any) => item.type === 'reasoning')
                    if (reasoningItems.length > 0) {
                      reasoningContent = reasoningItems.map((item: any) => item.text || '').join("\n\n")
                    }
                    plainText = msg.content.filter((item: any) => item.type === 'text').map((item: any) => item.text || '').join(" ")
                  } else if ('parts' in msg && Array.isArray(msg.parts)) {
                     const reasoningParts = msg.parts.filter((part: any) => part.type === 'reasoning') || []
                     if (reasoningParts.length > 0) {
                       reasoningContent = reasoningParts.map((part: any) => part.details?.filter((detail: any) => detail.type === 'text').map((detail: any) => detail.text).join("")).join("\n\n")
                     }
                     // Assuming parts also contain text for plainText extraction if needed
                     plainText = msg.parts.filter((part: any) => part.type === 'text').map((part: any) => part.text || '').join(" ") || String(msg.content); // Fallback
                  } else if ('reasoning' in msg && msg.reasoning) {
                     reasoningContent = msg.reasoning as string
                     plainText = String(msg.content); // Ensure plainText is string
                  } else {
                     plainText = String(msg.content); // Ensure plainText is string
                  }

                  const { data: assistantData, error: assistantError } = await supabase
                    .from("messages")
                    .insert({
                      chat_id: chatId,
                      role: "assistant",
                      content: plainText.toString(),
                      reasoning_content: reasoningContent,
                    })
                    .select('id') // Select the ID
                    .single() // Expect a single row back

                  if (assistantError) {
                    // console.error("Error saving assistant message:", assistantError)
                  } else if (assistantData) {
                    const assistantMessageId = String(assistantData.id) // Ensure ID is string
                    // console.log("Assistant message saved successfully with ID:", assistantMessageId)
                    // Send both assistant and user message IDs as an annotation
                    // attached to the assistant message stream
                    const annotationPayload: { assistantId: string; userId?: string } = {
                      assistantId: assistantMessageId,
                    };
                    if (userMessageId) {
                      annotationPayload.userId = userMessageId;
                    }
                    dataStream.writeMessageAnnotation(annotationPayload);
                  }
                }
              }
            } catch (err) {
              // console.error("Error in onFinish while saving assistant messages:", err)
              dataStream.writeData({ type: 'error', message: 'Failed to save assistant response' });
            }
          },
        })

        // Check if the model has think: true to include reasoning
        const modelConfig = MODELS.find((m) => m.id === model)
        const shouldSendReasoning = modelConfig?.think || false

        // Merge the text stream into the data stream
        result.mergeIntoDataStream(dataStream)

      } catch (err: any) {
        // console.error("Error during stream execution:", err)
        dataStream.writeData({ type: 'error', message: err.message || 'Internal server error' });
        throw err; // Re-throw for the onError handler
      } finally {
         // Ensure the stream is closed if mergeIntoDataStream doesn't handle it on error
         // dataStream.close(); // Usually handled by mergeIntoDataStream
      }
    },
    // Error handler for createDataStreamResponse
    onError: (error) => {
      // console.error("Error in createDataStreamResponse:", error)
      // Handle specific errors like daily limit
      if ((error as any).code === "DAILY_LIMIT_REACHED") {
         // Return the error details as a JSON string in the stream
         return JSON.stringify({ error: (error as Error).message, code: (error as any).code });
      }
      // Return a generic error message as a JSON string
      return JSON.stringify({ error: 'An internal error occurred during the chat process.' });
    },
    // Optional: onCompletion callback
    // onCompletion: () => {
    //   console.log("Data stream completed.");
    // }
  })
}
