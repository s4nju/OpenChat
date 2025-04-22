import { MODEL_DEFAULT } from "@/lib/config"
import { createClient } from "@/lib/supabase/server"
import { createGuestServerClient } from "@/lib/supabase/server-guest"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/"

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Missing authentication code")}`
    )
  }

  const supabase = await createClient()
  const supabaseAdmin = await createGuestServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error("Auth error:", error)
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(error.message)}`
    )
  }

  const user = data?.user
  // console.log("User data:", user)
  if (!user || !user.id || !user.email) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent("Missing user info")}`
    )
  }

  try {
    // Initialize resets for new OAuth users
    const now = new Date()
    const isoNow = now.toISOString()
    const dailyResetDate = new Date(now.getTime()).toISOString()
    const monthlyResetDate = new Date(now.getTime()).toISOString()
    // Try to insert user only if not exists
    const { error: insertError } = await supabaseAdmin.from("users").insert({
      display_name: user.user_metadata.name,
      profile_image: user.user_metadata.avatar_url,
      id: user.id,
      email: user.email,
      created_at: isoNow,
      message_count: 0,
      daily_message_count: 0,
      monthly_message_count: 0,
      daily_reset: dailyResetDate,
      monthly_reset: monthlyResetDate,
      premium: false,
      preferred_model: MODEL_DEFAULT,
    })

    if (insertError && insertError.code !== "23505") {
      console.error("Error inserting user:", insertError)
    }
  } catch (err) {
    console.error("Unexpected user insert error:", err)
  }

  const forwardedHost = request.headers.get("x-forwarded-host")
  const isLocal = process.env.NODE_ENV === "development"

  const redirectUrl = isLocal
    ? `${origin}${next}`
    : forwardedHost
      ? `https://${forwardedHost}${next}`
      : `${origin}${next}`

  return NextResponse.redirect(redirectUrl)
}