import { createClient } from "@/lib/supabase/server"; // Use server client
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

  let requestBody: any = null; // Initialize requestBody
  try {
    // Attempt to parse the body early, regardless of auth status
    // This might fail if DELETE requests don't have bodies or are empty
    requestBody = await req.json();
  } catch (e) {
    // Ignore parsing errors for now, could be expected for DELETE
    // console.log("Note: Could not parse request body for DELETE, might be empty.");
  }

  try {
    const supabase = await createClient(); // Create server client

    // --- Get Authenticated User ---
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    let userId: string | null = null;
    let isGuest = false;

    if (user && !authError) {
      userId = user.id; // Authenticated user
    } else {
      // --- Attempt Guest Check using pre-parsed body ---
      // Check if we successfully parsed a body earlier
      if (requestBody && requestBody.userId && requestBody.isAuthenticated === false) {
        // --- DEBUG LOGGING ---
        console.log(`[DELETE /api/messages] Attempting guest check for userId: ${requestBody.userId}`);

        // --- DETAILED DEBUG LOGGING ---
        // First, check if user exists at all and log anonymous status
        const { data: rawUserData, error: rawUserError } = await supabase
          .from("users")
          .select("id, anonymous") // Select anonymous flag too
          .eq("id", requestBody.userId)
          .maybeSingle(); // Use maybeSingle in case user doesn't exist

        if (rawUserError) {
           console.error(`[DELETE /api/messages] Error fetching raw user data for ${requestBody.userId}:`, rawUserError.message);
           // Don't fail here yet, let the specific check handle it
        } else if (!rawUserData) {
           console.log(`[DELETE /api/messages] Raw user check: User ${requestBody.userId} NOT FOUND.`);
        } else {
           console.log(`[DELETE /api/messages] Raw user check: User ${requestBody.userId} FOUND. Anonymous status: ${rawUserData.anonymous}`);
        }
        // --- END DETAILED DEBUG LOGGING ---

        // Now, perform the specific check for anonymous guest
        const { data: guestData, error: guestError } = await supabase
          .from("users")
          .select("id") // Original check only needed id
          .eq("id", requestBody.userId) // Use pre-parsed body
          .eq("anonymous", true)
          .single();

        if (guestError || !guestData) {
          // console.error("Guest verification failed:", guestError);
          // Return the specific error message encountered by the user
          return NextResponse.json({ error: "Guest user not found or invalid" }, { status: 403 });
        }
        userId = guestData.id; // Use the verified guest ID
        isGuest = true;
      } else {
        // No authenticated user and no valid guest info found in the (potentially empty) body
        // console.log("DELETE failed: No authenticated user and no valid guest info in body.", requestBody);
        return NextResponse.json({ error: "Not authenticated or invalid guest request" }, { status: 401 });
      }
      // --- End Guest Check ---
    }

    if (!userId) {
      // Should not happen if logic above is correct, but as a safeguard
      return NextResponse.json({ error: "Authorization failed" }, { status: 401 });
    }

    // Verify the message belongs to the user (authenticated or guest) making the request
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
    // console.error("Error in DELETE /api/messages/[messageId]:", error);
    // No need to check for "Invalid user identity" specifically anymore
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

  let requestBody: any;
  let newContent: string;
  let clientUserId: string | undefined;
  let clientIsAuthenticated: boolean | undefined;

  try {
    requestBody = await req.json();
    newContent = requestBody.content;
    clientUserId = requestBody.userId; // Extract potential guest ID
    clientIsAuthenticated = requestBody.isAuthenticated; // Extract auth status

    if (typeof newContent !== 'string') {
      return NextResponse.json({ error: "Invalid request body: 'content' must be a string" }, { status: 400 });
    }
  } catch (e) {
    return NextResponse.json({ error: "Invalid request body format" }, { status: 400 });
  }

  // Log only non-sensitive information
  // console.log(`PUT /api/messages/${messageId} - Received request`); // Removed user ID from log

  try {
    const supabase = await createClient(); // Create server client

    // --- Get Authenticated User ---
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    let userId: string | null = null;
    let isGuest = false;

    if (user && !authError) {
      userId = user.id; // Authenticated user
    } else if (clientIsAuthenticated === false && clientUserId) {
      // --- Attempt Guest Check ---
      // Verify this guest user exists and is anonymous
      const { data: guestData, error: guestError } = await supabase
        .from("users")
        .select("id")
        .eq("id", clientUserId)
        .eq("anonymous", true)
        .single();

      if (guestError || !guestData) {
        // console.error("Guest verification failed:", guestError);
        return NextResponse.json({ error: "Guest user not found or invalid" }, { status: 403 });
      }
      userId = guestData.id; // Use the verified guest ID
      isGuest = true;
      // --- End Guest Check ---
    } else {
      // No authenticated user and no valid guest info in body
      return NextResponse.json({ error: "Not authenticated or invalid guest request" }, { status: 401 });
    }

    if (!userId) {
      // Should not happen if logic above is correct, but as a safeguard
      return NextResponse.json({ error: "Authorization failed" }, { status: 401 });
    }

    // Verify the message belongs to the user (authenticated or guest) and is editable
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
    // No need to check for "Invalid user identity" specifically anymore
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
