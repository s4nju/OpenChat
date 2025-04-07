import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { chatId, model } = await request.json()

    if (!chatId || !model) {
      return new Response(
        JSON.stringify({ error: "Missing chatId or model" }),
        {
          status: 400,
        }
      )
    }

    // --- Authorization Check ---
    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
      });
    }

    // Verify the chat belongs to the authenticated user
    const { data: chatData, error: fetchError } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", chatId)
      .single();

    if (fetchError) {
      console.error(`Error fetching chat ${chatId} for ownership check:`, fetchError);
      // Don't reveal if chat exists or not, just deny access
      return new Response(JSON.stringify({ error: "Failed to verify chat ownership" }), { status: 500 });
    }

    if (!chatData || chatData.user_id !== user.id) {
      console.warn(`User ${user.id} attempted to update model for chat ${chatId} not owned by them.`);
      return new Response(JSON.stringify({ error: "Unauthorized to update this chat" }), { status: 403 });
    }
    // --- End Authorization Check ---


    // Update the chat record with the new model
    const { error } = await supabase
      .from("chats")
      .update({ model })
      .eq("id", chatId)

    if (error) {
      console.error("Error updating chat model:", error)
      return new Response(
        JSON.stringify({
          error: "Failed to update chat model",
          details: error.message,
        }),
        { status: 500 }
      )
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
    })
  } catch (err: any) {
    console.error("Error in update-chat-model endpoint:", err)
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500 }
    )
  }
}
