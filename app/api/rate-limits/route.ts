import {
  AUTH_DAILY_MESSAGE_LIMIT,
  NON_AUTH_DAILY_MESSAGE_LIMIT,
} from "@/app/lib/config"
import { validateUserIdentity } from "../../lib/server/api"
import { createGuestServerClient } from "@/app/lib/supabase/server-guest"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const isAuthenticated = searchParams.get("isAuthenticated") === "true"
  if (!userId) {
    return new Response(JSON.stringify({ error: "Missing userId" }), {
      status: 400,
    })
  }
  
  try {
    const supabase = await validateUserIdentity(userId, isAuthenticated)

    const { data, error } = await supabase
      .from("users")
      .select("daily_message_count")
      .eq("id", userId)
      .maybeSingle()

    if (error || !data) {
      return new Response(JSON.stringify({ error: error?.message }), {
        status: 500,
      })
    }

    const dailyLimit = isAuthenticated
      ? AUTH_DAILY_MESSAGE_LIMIT
      : NON_AUTH_DAILY_MESSAGE_LIMIT
    const dailyCount = data.daily_message_count || 0
    const remaining = dailyLimit - dailyCount

    return new Response(JSON.stringify({ dailyCount, dailyLimit, remaining }), {
      status: 200,
    })
  } catch (error: any) {
    // Handle the case of a missing guest user by creating one
    if (!isAuthenticated && error.message === "Invalid or missing guest user") {
      try {
        // Create the guest user record
        const supabase = await createGuestServerClient()
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            id: userId,
            email: `${userId}@anonymous.example`,
            anonymous: true,
            message_count: 0,
            daily_message_count: 0,
            premium: false,
            created_at: new Date().toISOString(),
          })
          .single()

        if (insertError) {
          return new Response(JSON.stringify({ error: insertError.message }), {
            status: 500,
          })
        }

        // Return default values for a new user
        return new Response(
          JSON.stringify({
            dailyCount: 0,
            dailyLimit: NON_AUTH_DAILY_MESSAGE_LIMIT,
            remaining: NON_AUTH_DAILY_MESSAGE_LIMIT,
          }),
          { status: 200 }
        )
      } catch (createError: any) {
        return new Response(
          JSON.stringify({ error: createError.message || "Failed to create guest user" }),
          { status: 500 }
        )
      }
    }

    // Return the original error for other cases
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500 }
    )
  }
}
