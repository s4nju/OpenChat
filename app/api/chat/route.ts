// app/api/chat/route.ts
// Simplified version to fix the 500 error

// Set max duration for the API route
export const maxDuration = 60;

/**
 * POST handler for chat completions
 * Simplified version to fix compatibility issues
 */
export async function POST(req: Request) {
  try {
    // Parse request body
    const { messages, apiKey, model } = await req.json();

    // Basic validation
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!model) {
      return new Response(JSON.stringify({ error: "Model ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Process request with model

    try {
      // Direct fetch to OpenRouter API
      const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://openchat.dev",
          "X-Title": "OpenChat",
          "OR-SITE-URL": "https://openchat.dev",
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          stream: true,
          max_tokens: 2048,
        }),
      });

      // Handle error responses
      if (!openRouterResponse.ok) {
        let errorMessage = `OpenRouter API error: ${openRouterResponse.status} ${openRouterResponse.statusText}`;

        try {
          const errorText = await openRouterResponse.text();
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error?.message || errorData.error || errorMessage;
          } catch (parseError) {
            // If we can't parse JSON, use the raw text
            errorMessage = errorText || errorMessage;
          }
        } catch (e) {
          // If we can't get the text, use the status
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
          status: openRouterResponse.status,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Return the streaming response with proper SSE formatting
      return new Response(openRouterResponse.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          "Connection": "keep-alive",
          "X-Accel-Buffering": "no", // Disable buffering in Nginx
        },
      });
    } catch (modelError: any) {
      return new Response(
        JSON.stringify({
          error: `Error with OpenRouter API: ${modelError.message || "Unknown model error"}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        error: `API error: ${error.message || "An unknown error occurred"}`,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
