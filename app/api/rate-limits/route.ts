import {
  AUTH_DAILY_MESSAGE_LIMIT,
  NON_AUTH_DAILY_MESSAGE_LIMIT,
  PREMIUM_MONTHLY_MESSAGE_LIMIT,
  NON_PREMIUM_MONTHLY_MESSAGE_LIMIT,
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
      .select(
        "daily_message_count, daily_reset, monthly_message_count, monthly_reset, premium, anonymous"
      )
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

    const isPremium = data.premium || false  // Ensure boolean value
    const isAnonymous = data.anonymous || false
    
    // Get monthly limits
    const monthlyLimit = isPremium ? PREMIUM_MONTHLY_MESSAGE_LIMIT : NON_PREMIUM_MONTHLY_MESSAGE_LIMIT
    const monthlyCount = data.monthly_message_count || 0
    const monthlyRemaining = monthlyLimit - monthlyCount
    
    // Get daily limits (not applicable for premium users)
    let dailyLimit = Infinity
    let dailyCount = 0
    let dailyRemaining = Infinity
    
    if (!isPremium) {
      dailyLimit = isAnonymous ? NON_AUTH_DAILY_MESSAGE_LIMIT : AUTH_DAILY_MESSAGE_LIMIT
      dailyCount = data.daily_message_count || 0
      dailyRemaining = dailyLimit - dailyCount
    }
    
    // For premium users, only the monthly limit matters
    // For non-premium users, both daily and monthly limits apply
    const effectiveRemaining = isPremium 
      ? monthlyRemaining 
      : Math.min(dailyRemaining, monthlyRemaining)

    return new Response(
      JSON.stringify({
        isPremium,
        dailyCount,
        dailyLimit,
        dailyRemaining,
        monthlyCount,
        monthlyLimit,
        monthlyRemaining,
        effectiveRemaining,
        dailyReset: data.daily_reset,
        monthlyReset: data.monthly_reset,
      }), {
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
