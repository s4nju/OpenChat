import { validateUserIdentity } from "@/app/lib/server/api";
import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30; // Optional: Set max duration

// Removed getMessageId helper function

// --- DELETE Handler ---
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ messageId?: string }> } // params is a Promise
) {
  // Await the params promise and then access messageId
  const resolvedParams = await params;
  const messageId = resolvedParams.messageId;
  if (!messageId) {
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
  }

  // Extract userId from request context or headers (adjust as needed)
  // This assumes you have middleware setting userId or similar
  // For now, let's assume it comes from a header or requires re-validation
  const userId = req.headers.get("X-User-Id"); // Example: Get userId from header
  const isAuthenticated = !!req.headers.get("X-Is-Authenticated"); // Example

  if (!userId) {
     return NextResponse.json({ error: "User ID not provided or authentication failed" }, { status: 401 });
  }

  try {
    const supabase = await validateUserIdentity(userId, isAuthenticated);

    // Verify the message belongs to the user making the request
    // Convert messageId to number for Supabase query
    const messageIdNum = parseInt(messageId, 10);
    if (isNaN(messageIdNum)) {
      return NextResponse.json({ error: "Invalid Message ID format" }, { status: 400 });
    }

    const { data: messageData, error: fetchError } = await supabase
      .from("messages")
      .select("id, chat_id")
      .eq("id", messageIdNum) // Use numeric ID
      .single();

    if (fetchError || !messageData) {
      // console.error("Error fetching message or message not found:", fetchError);
      return NextResponse.json({ error: "Message not found or error fetching message" }, { status: 404 });
    }

    // Authorization Check: Ensure the message belongs to a chat owned by the user
    // This requires joining chats table or performing a separate check.
    const { data: chatData, error: chatFetchError } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", messageData.chat_id)
      .single();
    if (chatFetchError || !chatData || chatData.user_id !== userId) {
       return NextResponse.json({ error: "Unauthorized to delete message in this chat" }, { status: 403 });
    }

    // Perform the delete operation for the single message
    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageIdNum); // Use numeric ID

    if (deleteError) {
      // console.error("Error deleting message:", deleteError);
      return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
    }

    // Return simple success, no chat deletion info needed here
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error: any) {
    // console.error("Error in DELETE /api/messages/[messageId]:", error);
     if (error.message.includes("Invalid user identity")) { // Example check
       return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
     }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


// --- PUT Handler (for Editing) ---
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ messageId?: string }> } // params is a Promise
) {
  // Await the params promise and then access messageId
  const resolvedParams = await params;
  const messageId = resolvedParams.messageId;
  if (!messageId) {
    return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
  }

  const userId = req.headers.get("X-User-Id"); // Example
  const isAuthenticated = !!req.headers.get("X-Is-Authenticated"); // Example

  if (!userId) {
     return NextResponse.json({ error: "User ID not provided or authentication failed" }, { status: 401 });
  }

  let newContent: string;
  try {
    const body = await req.json();
    newContent = body.content;
    if (typeof newContent !== 'string') {
      return NextResponse.json({ error: "Invalid request body: 'content' must be a string" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Log only non-sensitive information
  // console.log(`PUT /api/messages/${messageId} - Received request from user ${userId}`);

  try {
    const supabase = await validateUserIdentity(userId, isAuthenticated);

    // Verify the message belongs to the user and is editable (e.g., role === 'user')
    // Convert messageId to number for Supabase query
    const messageIdNum = parseInt(messageId, 10);
    if (isNaN(messageIdNum)) {
      // console.error(`PUT /api/messages/${messageId} - Invalid numeric ID.`);
      return NextResponse.json({ error: "Invalid Message ID format" }, { status: 400 });
    }
    // console.log(`PUT /api/messages/${messageId} - Parsed numeric ID: ${messageIdNum}`);

    const { data: messageData, error: fetchError } = await supabase
      .from("messages")
      .select("id, role, chat_id") // Include role
      .eq("id", messageIdNum) // Use numeric ID
      .single();

    if (fetchError || !messageData) {
      // console.error("Error fetching message or message not found:", fetchError);
      return NextResponse.json({ error: "Message not found or error fetching message" }, { status: 404 });
    }

    // Add authorization check: Ensure message belongs to the user's chat
    // (Similar check as in DELETE, potentially refactor into a helper)
    const { data: chatData, error: chatFetchError } = await supabase
      .from("chats")
      .select("user_id")
      .eq("id", messageData.chat_id)
      .single();
    if (chatFetchError || !chatData || chatData.user_id !== userId) {
       return NextResponse.json({ error: "Unauthorized to edit message in this chat" }, { status: 403 });
    }

    // Add logic: Only allow editing of 'user' messages?
    if (messageData.role !== 'user') {
       // console.warn(`PUT /api/messages/${messageId} - Attempt to edit non-user message (role: ${messageData.role}).`);
       return NextResponse.json({ error: "Only user messages can be edited" }, { status: 403 });
    }

    // Perform the update operation
    // console.log(`PUT /api/messages/${messageId} - Attempting to update message ID ${messageIdNum}...`);
    const { error: updateError } = await supabase
      .from("messages")
      .update({ content: newContent, updated_at: new Date().toISOString() }) // Also update timestamp
      .eq("id", messageIdNum); // Use numeric ID

    if (updateError) {
      // console.error(`PUT /api/messages/${messageId} - Error updating message:`, updateError);
      return NextResponse.json({ error: "Failed to update message" }, { status: 500 });
    }

    // console.log(`PUT /api/messages/${messageId} - Message updated successfully.`);
    return NextResponse.json({ success: true, updatedContent: newContent }, { status: 200 });

  } catch (error: any) {
    // console.error("Error in PUT /api/messages/[messageId]:", error);
     if (error.message.includes("Invalid user identity")) {
       return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
     }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
