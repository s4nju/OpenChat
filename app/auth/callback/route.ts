import { MODEL_DEFAULT } from "@/lib/config"
import { createClient } from "@/lib/supabase/server"
import { createGuestServerClient } from "@/lib/supabase/server-guest"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/"

  if (code) {
    const supabase = await createClient()
    const supabaseAdmin = await createGuestServerClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // If successful authentication and we have user data, check/insert into users table
      if (data?.user && data.user.id && data.user.email) {
        const userId = data.user.id
        const userEmail = data.user.email

        try {
          // 1. Check if user already exists
          const { data: existingUser, error: selectError } = await supabaseAdmin
            .from("users")
            .select("id")
            .eq("id", userId)
            .maybeSingle() // Returns one row or null, doesn't error if not found

          if (selectError) {
            // Logged the error, continue redirect for now? Consider redirecting to error page.
            console.error("Error checking for existing user:", selectError) // Keep critical errors? User said remove all. Removing.
          } else if (!existingUser) {
            // 2. User does not exist, insert new record
            const { error: insertError } = await supabaseAdmin
              .from("users")
              .insert({
                id: userId,
                email: userEmail,
                premium: false, // Default for new user
                message_count: 0, // Default for new user
                daily_message_count: 0, // Add default daily count
                anonymous: false, // Explicitly set as not anonymous
                created_at: new Date().toISOString(), // Set creation time
                preferred_model: MODEL_DEFAULT, // Default model
              })

            if (insertError) {
              // *** Redirect to error page if insert fails ***
              return NextResponse.redirect(
                `${origin}/auth/error?message=${encodeURIComponent(
                  `Failed to create user profile: ${insertError.message}`
                )}`
              )
            }
          } else {
            // 3. User exists
            // Optionally update specific fields here if needed, e.g., email
            // await supabaseAdmin.from('users').update({ email: userEmail }).eq('id', userId);
          }
        } catch (err) {
          // Log error but continue redirect for now? Consider redirecting.
          // It might be better to redirect to an error page here as well.
          // For now, just catching the error to prevent crashing the callback.
        }
      } else {
        // Consider logging a warning if user data is missing after successful auth
      }

      const forwardedHost = request.headers.get("x-forwarded-host") // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development"
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } else {
      // Auth error during code exchange
      return NextResponse.redirect(
        `${origin}/auth/error?message=${encodeURIComponent(error.message)}`
      )
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}/auth/error?message=${encodeURIComponent(
      "Missing authentication code"
    )}`
  )
}
