import {
  AUTH_DAILY_MESSAGE_LIMIT,
  NON_AUTH_DAILY_MESSAGE_LIMIT,
} from "@/lib/config"
import { validateUserIdentity } from "../../../lib/server/api"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const isAuthenticated = searchParams.get("isAuthenticated") === "true"
    if (!userId) {
      return new Response(JSON.stringify({ error: "Missing userId" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }
    const supabase = await validateUserIdentity(userId, isAuthenticated)

    const { data, error } = await supabase
      .from("users")
      .select("daily_message_count")
      .eq("id", userId)
      .maybeSingle()

    if (error || !data) {
      return new Response(
        JSON.stringify({
          error: error?.message || "Failed to retrieve user data for rate limit check.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      )
    }

    const dailyLimit = isAuthenticated
      ? AUTH_DAILY_MESSAGE_LIMIT
      : NON_AUTH_DAILY_MESSAGE_LIMIT
    const dailyCount = data.daily_message_count || 0
    const remaining = dailyLimit - dailyCount

    return new Response(JSON.stringify({ dailyCount, dailyLimit, remaining }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err: any) {
    console.error("Error in /api/rate-limits:", err)
    const statusCode =
      err.message === "Invalid or missing guest user" ||
      err.message === "User ID does not match authenticated user" ||
      err.message === "Unable to get authenticated user"
        ? 403
        : 500
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
