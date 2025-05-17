import { APP_DOMAIN } from "@/lib/config"
import { SupabaseClient } from "@supabase/supabase-js"
import {
  AUTH_DAILY_MESSAGE_LIMIT,
  NON_AUTH_DAILY_MESSAGE_LIMIT,
  PREMIUM_MONTHLY_MESSAGE_LIMIT,
  NON_PREMIUM_MONTHLY_MESSAGE_LIMIT,
} from "./config"
import { fetchClient } from "./fetch"
import { API_ROUTE_CREATE_GUEST, API_ROUTE_UPDATE_CHAT_MODEL } from "./routes"

/**
 * Creates a guest user record on the server
 */
export async function createGuestUser(guestId: string) {
  try {
    const res = await fetchClient(API_ROUTE_CREATE_GUEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: guestId }),
    })
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to create guest user: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (err) {
    console.error("Error creating guest user:", err)
    throw err
  }
}

export class UsageLimitError extends Error {
  code: string
  constructor(message: string) {
    super(message)
    this.code = "DAILY_LIMIT_REACHED"
  }
}

/**
 * Checks the user's daily usage to see if they've reached their limit.
 * Uses the `anonymous` flag from the user record to decide which daily limit applies.
 *
 * @param supabase - Your Supabase client.
 * @param userId - The ID of the user.
 * @throws UsageLimitError if the daily limit is reached, or a generic Error if checking fails.
 * @returns User data including message counts and reset date
 */
export async function checkUsage(supabase: SupabaseClient, userId: string) {
  const { data: userData, error: userDataError } = await supabase
    .from("users")
    .select(
      "message_count, daily_message_count, daily_reset, monthly_message_count, monthly_reset, anonymous, premium"
    )
    .eq("id", userId)
    .maybeSingle()

  if (userDataError) {
    throw new Error("Error fetching user data: " + userDataError.message)
  }
  if (!userData) {
    throw new Error("User record not found for id: " + userId)
  }

  const isAnonymous = userData.anonymous
  const isPremium = userData.premium || false  // Ensure boolean value
  const now = new Date()

  // Sliding window monthly reset
  let monthlyCount = userData.monthly_message_count || 0
  const lastMonthlyReset = userData.monthly_reset ? new Date(userData.monthly_reset) : null
  const monthlyResetInterval = 30 * 24 * 60 * 60 * 1000
  if (!lastMonthlyReset || now.getTime() - lastMonthlyReset.getTime() >= monthlyResetInterval) {
    monthlyCount = 0
    // next reset at last reset + interval
    const nextMonthlyReset = new Date((lastMonthlyReset || now).getTime() + monthlyResetInterval)
    const { error: monthlyResetError } = await supabase
      .from("users")
      .update({ monthly_message_count: 0, monthly_reset: nextMonthlyReset.toISOString() })
      .eq("id", userId)
    if (monthlyResetError) {
      throw new Error("Failed to reset monthly count: " + monthlyResetError.message)
    }
  }

  // Check monthly limit for all users
  const monthlyLimit = isPremium ? PREMIUM_MONTHLY_MESSAGE_LIMIT : NON_PREMIUM_MONTHLY_MESSAGE_LIMIT
  if (monthlyCount >= monthlyLimit) {
    throw new UsageLimitError("Monthly message limit reached.")
  }

  // For premium users, skip daily limit check
  if (isPremium) {
    return {
      userData,
      dailyCount: 0,
      dailyLimit: Infinity,
      monthlyCount,
      monthlyLimit,
    }
  }

  // For non-premium users, check daily limits
  const dailyLimit = isAnonymous
    ? NON_AUTH_DAILY_MESSAGE_LIMIT
    : AUTH_DAILY_MESSAGE_LIMIT

  // Sliding window daily reset
  let dailyCount = userData.daily_message_count || 0
  const lastDailyReset = userData.daily_reset ? new Date(userData.daily_reset) : null
  const dailyResetInterval = 24 * 60 * 60 * 1000
  
  if (!lastDailyReset || now.getTime() - lastDailyReset.getTime() >= dailyResetInterval) {
    dailyCount = 0
    // next reset at last reset + interval
    const nextDailyReset = new Date((lastDailyReset || now).getTime() + dailyResetInterval)
    const { error: resetError } = await supabase
      .from("users")
      .update({ daily_message_count: 0, daily_reset: nextDailyReset.toISOString() })
      .eq("id", userId)
    if (resetError) {
      throw new Error("Failed to reset daily count: " + resetError.message)
    }
  }

  // Check if the daily limit is reached.
  if (dailyCount >= dailyLimit) {
    throw new UsageLimitError("Daily message limit reached.")
  }

  return {
    userData,
    dailyCount,
    dailyLimit,
    monthlyCount,
    monthlyLimit,
  }
}

/**
 * Increments overall, daily, and monthly message counters for a user.
 *
 * @param supabase - Your Supabase client.
 * @param userId - The ID of the user.
 * @param currentCounts - Current message counts (optional, will be fetched if not provided)
 * @throws Error if updating fails.
 */
export async function incrementUsage(
  supabase: SupabaseClient,
  userId: string,
  currentCounts?: { messageCount: number; dailyCount: number; monthlyCount?: number }
): Promise<void> {
  let messageCount: number
  let dailyCount: number
  let monthlyCount: number

  if (currentCounts && currentCounts.monthlyCount !== undefined) {
    messageCount = currentCounts.messageCount
    dailyCount = currentCounts.dailyCount
    monthlyCount = currentCounts.monthlyCount
  } else {
    // If counts weren't provided, fetch them
    const { data: userData, error: userDataError } = await supabase
      .from("users")
      .select("message_count, daily_message_count, monthly_message_count, premium")
      .eq("id", userId)
      .maybeSingle()

    if (userDataError || !userData) {
      throw new Error(
        "Error fetching user data: " +
          (userDataError?.message || "User not found")
      )
    }

    messageCount = userData.message_count || 0
    dailyCount = userData.daily_message_count || 0
    monthlyCount = userData.monthly_message_count || 0
  }

  // Increment overall, daily, and monthly message counts
  const newOverallCount = messageCount + 1
  const newDailyCount = dailyCount + 1
  const newMonthlyCount = monthlyCount + 1

  // For premium users, we don't increment the daily count as there's no daily limit
  const { data: userData, error: userDataError } = await supabase
    .from("users")
    .select("premium")
    .eq("id", userId)
    .maybeSingle()
    
  if (userDataError) {
    throw new Error("Error fetching user premium status: " + userDataError.message)
  }
  
  const isPremium = userData?.premium || false
  
  const updateObj: Record<string, number> = {
    message_count: newOverallCount,
    monthly_message_count: newMonthlyCount,
  }
  
  // Only increment daily count for non-premium users
  if (!isPremium) {
    updateObj.daily_message_count = newDailyCount
  }
  
  const { error: updateError } = await supabase
    .from("users")
    .update(updateObj)
    .eq("id", userId)

  if (updateError) {
    throw new Error("Failed to update usage data: " + updateError.message)
  }
}

/**
 * Checks the user's daily usage and increments both overall and daily counters.
 * Resets the daily counter if a new day (UTC) is detected.
 * Uses the `anonymous` flag from the user record to decide which daily limit applies.
 *
 * @param supabase - Your Supabase client.
 * @param userId - The ID of the user.
 * @throws UsageLimitError if the daily limit is reached, or a generic Error if updating fails.
 */
export async function checkAndIncrementUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { userData, dailyCount } = await checkUsage(supabase, userId)

  await incrementUsage(supabase, userId, {
    messageCount: userData.message_count || 0,
    dailyCount,
  })
}

/**
 * Checks the user's daily usage and increments both overall and daily counters.
 * Resets the daily counter if a new day (UTC) is detected.
 * Uses the `anonymous` flag from the user record to decide which daily limit applies.
 *
 * @param supabase - Your Supabase client.
 * @param userId - The ID of the user.
 * @returns The remaining daily limit.
 */
export async function checkRateLimits(
  userId: string,
  isAuthenticated: boolean
) {
  try {
    const res = await fetchClient(
      `/api/rate-limits?userId=${userId}&isAuthenticated=${isAuthenticated}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    )
    const responseData = await res.json()
    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to check rate limits: ${res.status} ${res.statusText}`
      )
    }
    return responseData
  } catch (err) {
    console.error("Error checking rate limits:", err)
    throw err
  }
}

/**
 * Updates the model for an existing chat
 */
export async function updateChatModel(chatId: string, model: string) {
  try {
    const res = await fetchClient(API_ROUTE_UPDATE_CHAT_MODEL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chatId, model }),
    })
    const responseData = await res.json()

    if (!res.ok) {
      throw new Error(
        responseData.error ||
          `Failed to update chat model: ${res.status} ${res.statusText}`
      )
    }

    return responseData
  } catch (error) {
    console.error("Error updating chat model:", error)
    throw error
  }
}

/**
 * Signs in user with Google OAuth via Supabase
 */
export async function signInWithGoogle(supabase: SupabaseClient) {
  try {
    const isDev = process.env.NODE_ENV === "development"

    // Get base URL dynamically (will work in both browser and server environments)
    let baseUrl = isDev
      ? "http://localhost:3000"
      : typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_VERCEL_URL
          ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
          : APP_DOMAIN

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${baseUrl}/auth/callback`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    })

    if (error) {
      throw error
    }

    // Return the provider URL
    return data
  } catch (err) {
    console.error("Error signing in with Google:", err)
    throw err
  }
}
