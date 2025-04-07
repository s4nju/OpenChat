import { validateUserIdentity } from "@/app/lib/server/api";
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

  // Extract userId and authentication status (adjust as needed)
  const userId = req.headers.get("X-User-Id");
  const isAuthenticated = !!req.headers.get("X-Is-Authenticated");

  if (!userId) {
     return NextResponse.json({ error: "User ID not provided or authentication failed" }, { status: 401 });
  }

  try {
    const supabase = await validateUserIdentity(userId, isAuthenticated);

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
     if (error.message.includes("Invalid user identity")) {
       return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
     }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
