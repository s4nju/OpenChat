import { fetchMutation } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";

export async function POST(request: Request) {
  try {
    const { title, model, systemPrompt } = await request.json();
    const token = await convexAuthNextjsToken();

    // Check usage limits before creating the chat. This mutation will throw
    // an error if the user is over their limit, which will be caught below.
    await fetchMutation(api.users.assertNotOverLimit, {}, { token });

    // Create the new chat record in Convex
    const { chatId } = await fetchMutation(
      api.chats.createChat,
      {
        title,
        model,
        systemPrompt,
      },
      { token }
    );

    // The client now only needs the ID to redirect to the new chat page.
    // The chat data itself will be fetched on the client via a query.
    return new Response(JSON.stringify({ chatId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in create-chat endpoint:", err);

    // Handle specific error codes from Convex if they are thrown
    if (
      err.message?.includes("DAILY_LIMIT_REACHED") ||
      err.message?.includes("MONTHLY_LIMIT_REACHED")
    ) {
      return new Response(
        JSON.stringify({ error: err.message, code: "LIMIT_REACHED" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
