// app/api/chat/route.ts
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { messages, apiKey, model } = await req.json()

    // Validate required parameters
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!model) {
      return new Response(JSON.stringify({ error: "Model ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    console.log("Processing request with model:", model)
    console.log("API Key present:", !!apiKey)

    try {
      // Create a direct fetch to OpenRouter API
      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": "https://vercel.com", // Required by OpenRouter
          "X-Title": "AI Chat App", // Optional but recommended
          "OR-SITE-URL": "https://vercel.com", // Alternative to HTTP-Referer
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true,
        }),
      })

      if (!openRouterResponse.ok) {
        let errorMessage = `OpenRouter API error: ${openRouterResponse.status} ${openRouterResponse.statusText}`
        try {
          const errorText = await openRouterResponse.text()
          console.error("OpenRouter error response:", errorText)

          try {
            const errorData = JSON.parse(errorText)
            errorMessage = errorData.error?.message || errorData.error || errorMessage
          } catch (parseError) {
            // If we can't parse JSON, use the raw text
            errorMessage = errorText || errorMessage
          }
        } catch (e) {
          // If we can't get the text, use the status
        }

        console.error("OpenRouter API error:", errorMessage)
        return new Response(JSON.stringify({ error: errorMessage }), {
          status: openRouterResponse.status,
          headers: { "Content-Type": "application/json" },
        })
      }

      // Return the streaming response directly
      return new Response(openRouterResponse.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } catch (modelError: any) {
      console.error("Error with OpenRouter API:", modelError)
      return new Response(
        JSON.stringify({
          error: `Error with OpenRouter API: ${modelError.message || "Unknown model error"}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      )
    }
  } catch (error: any) {
    console.error("API route error:", error)
    return new Response(
      JSON.stringify({
        error: `API error: ${error.message || "An unknown error occurred"}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}

// This API route handles chat requests to OpenRouter.