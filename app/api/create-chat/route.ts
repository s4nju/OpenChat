import { fetchMutation, fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { buildSystemPrompt } from "@/lib/config";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    // --- Validate request body ---
    const body = await request.json();

    const schema = z.object({
      title: z.string().min(1, "Title is required"),
      model: z.string().min(1, "Model is required"),
      systemPrompt: z.string().optional(),
    });

    const parseResult = schema.safeParse(body);

    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parseResult.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { title, model, systemPrompt } = parseResult.data;

    const token = await convexAuthNextjsToken();

    const user = await fetchQuery(api.users.getCurrentUser, {}, { token });
    const composedPrompt = buildSystemPrompt(user, systemPrompt);

    // Check usage limits before creating the chat. This mutation will throw
    // an error if the user is over their limit, which will be caught below.
    await fetchMutation(api.users.assertNotOverLimit, {}, { token });

    // Create the new chat record in Convex
    const { chatId } = await fetchMutation(
      api.chats.createChat,
      {
        title,
        model,
        systemPrompt: composedPrompt,
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
