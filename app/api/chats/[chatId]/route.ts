import { createClient } from "@/lib/supabase/server"; // Use server client
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30; // Optional: Set max duration

// --- DELETE Handler for Chats ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ chatId?: string }> } // params is a Promise
) {
  // Await the params promise and then access chatId
  const resolvedParams = await params;
  const chatId = resolvedParams.chatId;

  if (!chatId) {
    return NextResponse.json({ error: "Chat ID is required" }, { status: 400 });
  }

  try {
    const supabase = await createClient(); // Create server client

    // --- Get Authenticated User ---
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      // console.error("Authentication error in DELETE chat:", authError);
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const userId = user.id; // Use server-validated user ID
    // --- End Get Authenticated User ---

    // Verify the chat belongs to the user making the request
    const { data: chatData, error: fetchError } = await supabase
      .from("chats")
      .select("id, user_id")
      .eq("id", chatId)
      .single();

    if (fetchError || !chatData) {
      // console.error("Error fetching chat or chat not found:", fetchError);
      return NextResponse.json({ error: "Chat not found or error fetching chat" }, { status: 404 });
    }

    // Authorization check
    if (chatData.user_id !== userId) {
       // console.warn(`User ${userId} attempted to delete chat ${chatId} owned by ${chatData.user_id}`);
       return NextResponse.json({ error: "Unauthorized to delete this chat" }, { status: 403 });
    }

    // Perform the delete operation
    // Supabase cascade delete should handle associated messages if set up correctly.
    // If not, you'd need to delete messages first:
    // await supabase.from("messages").delete().eq("chat_id", chatId);
    const { error: deleteError } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId);

    if (deleteError) {
      // console.error("Error deleting chat:", deleteError);
      return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 });
    }

    // console.log(`Chat ${chatId} deleted successfully by user ${userId}.`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    // console.error("Error in DELETE /api/chats/[chatId]:", error);
    // No need to check for "Invalid user identity" specifically anymore
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
