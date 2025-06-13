import { fetchMutation } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function POST(request: Request) {
  try {
    const { chatId, model } = (await request.json()) as {
      chatId: Id<"chats">;
      model: string;
    };

    if (!chatId || !model) {
      return new Response(
        JSON.stringify({ error: "Missing chatId or model" }),
        {
          status: 400,
        }
      );
    }

    const token = await convexAuthNextjsToken();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    await fetchMutation(
      api.chats.updateChatModel,
      {
        chatId,
        model,
      },
      { token }
    );

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    });
  } catch (err: any) {
    console.error("Error in update-chat-model endpoint:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500 }
    );
  }
}
