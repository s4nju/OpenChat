// /chat/api/chat.ts
import { checkUsage, incrementUsage } from "@/app/lib/api"
import { MODELS } from "@/app/lib/config"
import { validateUserIdentity } from "@/app/lib/server/api"
import { Attachment } from "@ai-sdk/ui-utils"
import { Message, streamText } from "ai"

// Maximum allowed duration for streaming (in seconds)
export const maxDuration = 30

type ChatRequest = {
  messages: Message[]
  chatId: string
  userId: string
  model: string
  isAuthenticated: boolean
  systemPrompt: string
}

export async function POST(req: Request) {
  try {
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
      const { error: msgError } = await supabase.from("messages").insert({
        chat_id: chatId,
        role: "user",
        content: userMessage.content,
        attachments:
          userMessage.experimental_attachments as unknown as Attachment[],
      })
      if (msgError) {
        console.error("Error saving user message:", msgError)
      } else {
        console.log("User message saved successfully.")

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
            // console.log("Response message role:", msg.role)
            // console.log("FULL MESSAGE OBJECT:", JSON.stringify(msg, null, 2))
            
            if (msg.content) {
              let plainText = msg.content
              let reasoningContent = null
              
              // Check if content is an array (new API response format)
              if (Array.isArray(msg.content)) {
                // console.log("Content is an array with length:", msg.content.length)
                
                // Extract reasoning content from content array
                const reasoningItems = msg.content.filter((item: any) => item.type === 'reasoning')
                // console.log("Found reasoning items in content array:", reasoningItems.length)
                
                if (reasoningItems.length > 0) {
                  reasoningContent = reasoningItems
                    .map((item: any) => item.text || '')
                    .join("\n\n")
                  // console.log("Extracted reasoning from content array:", 
                  //   reasoningContent ? reasoningContent.substring(0, 50) + "..." : "null")
                }
                
                // Extract text content for the message
                plainText = msg.content
                  .filter((item: any) => item.type === 'text')
                  .map((item: any) => item.text || '')
                  .join(" ")
                // console.log("Extracted plain text:", plainText.substring(0, 50) + "...")
              }
              
              // Check for parts array
              if (!reasoningContent && 'parts' in msg && Array.isArray(msg.parts)) {
                // console.log("Message has parts array:", msg.parts.length)
                const reasoningParts = msg.parts.filter((part: any) => part.type === 'reasoning') || []
                // console.log("Found reasoning parts:", reasoningParts.length)
                if (reasoningParts.length > 0) {
                  reasoningContent = reasoningParts
                    .map((part: any) => 
                      part.details
                        ?.filter((detail: any) => detail.type === 'text')
                        .map((detail: any) => detail.text)
                        .join("")
                    )
                    .join("\n\n")
                  // console.log("Extracted reasoning content from parts:", reasoningContent ? reasoningContent.substring(0, 50) + "..." : "null")
                }
              } 
              // else if (!Array.isArray(msg.content)) {
              //   console.log("Content is not an array and message doesn't have parts array")
              // }
              
              // Fallback: check for reasoning property on message (older AI SDK versions)
              if (!reasoningContent && 'reasoning' in msg && msg.reasoning) {
                reasoningContent = msg.reasoning as string
                // console.log("Using message.reasoning fallback:", reasoningContent ? reasoningContent.substring(0, 50) + "..." : "null")
              }
              
              // Debug model info
              // console.log("Current model:", model)
              // const currentModel = MODELS.find((m) => m.id === model)
              // console.log("Model config:", JSON.stringify(currentModel, null, 2))
              // console.log("Has think property:", currentModel?.think ? "Yes" : "No")
              
              try {
                const parsed = msg.content
                if (Array.isArray(parsed)) {
                  // Join all parts of type "text"
                  plainText = parsed
                    .filter((part) => part.type === "text")
                    .map((part) => part.text)
                    .join(" ")
                }
              } catch (err) {
                console.warn(
                  "Could not parse message content as JSON, using raw content"
                )
              }

              const { error: assistantError } = await supabase
                .from("messages")
                .insert({
                  chat_id: chatId,
                  role: "assistant",
                  content: plainText.toString(),
                  reasoning_content: reasoningContent,
                })
              
              if (assistantError) {
                console.error("Error saving assistant message:", assistantError)
                
                // Remove schema checking debug code
                /*
                if (assistantError.message && assistantError.message.includes("column")) {
                  console.log("Checking database schema for messages table...")
                  try {
                    const { data: schemaData, error: schemaError } = await supabase
                      .from('messages')
                      .select('*')
                      .limit(1)
                    
                    if (schemaError) {
                      console.error("Error fetching schema:", schemaError)
                    } else if (schemaData && schemaData.length > 0) {
                      console.log("Available columns in messages table:", Object.keys(schemaData[0]))
                    } else {
                      console.log("No data available to determine schema")
                    }
                  } catch (schemaCheckErr) {
                    console.error("Error checking schema:", schemaCheckErr)
                  }
                }
                */
              } else {
                console.log("Assistant message saved successfully.")
                
                // Remove verification debug code
                /*
                console.log("Saved message data:", JSON.stringify(insertData, null, 2))
                
                // Double-check by retrieving the record
                if (insertData && insertData.length > 0) {
                  const messageId = insertData[0].id
                  console.log("Verifying saved message with ID:", messageId)
                  
                  try {
                    const { data: verifyData, error: verifyError } = await supabase
                      .from('messages')
                      .select('*')
                      .eq('id', messageId)
                      .single()
                    
                    if (verifyError) {
                      console.error("Error verifying saved message:", verifyError)
                    } else if (verifyData) {
                      console.log("Verified message data:", JSON.stringify(verifyData, null, 2))
                      console.log("Has reasoning_content?", 
                        Object.prototype.hasOwnProperty.call(verifyData as any, 'reasoning_content') && (verifyData as any)['reasoning_content'] ? 
                        `Yes (${typeof (verifyData as any)['reasoning_content']}, length: ${String((verifyData as any)['reasoning_content']).length})` : 
                        "No (null or empty)")
                    }
                  } catch (verifyErr) {
                    console.error("Error during verification:", verifyErr)
                  }
                }
                */
              }
            }
          }
        } catch (err) {
          console.error(
            "Error in onFinish while saving assistant messages:",
            err
          )
        }
      },
    })

    // Ensure the stream is consumed so onFinish is triggered.
    result.consumeStream()
    
    // Check if the model has think: true to include reasoning
    const modelConfig = MODELS.find((m) => m.id === model)
    const shouldSendReasoning = modelConfig?.think || false
    
    // console.log(`Model ${model} should send reasoning: ${shouldSendReasoning}`)
    
    const originalResponse = result.toDataStreamResponse({
      sendReasoning: shouldSendReasoning,
    })
    
    // Optionally attach chatId in a custom header.
    const headers = new Headers(originalResponse.headers)
    headers.set("X-Chat-Id", chatId)

    return new Response(originalResponse.body, {
      status: originalResponse.status,
      headers,
    })
  } catch (err: any) {
    console.error("Error in /chat/api/chat:", err)
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
