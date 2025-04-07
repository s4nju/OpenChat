import { generateCsrfToken } from "@/lib/csrf" // Adjust path if lib is moved later
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

// Ensure this route is not cached
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Await the async token generation
    const token = await generateCsrfToken()
    // Await the cookies() call to get the actual store
    const cookieStore = await cookies() // Use the imported cookies function

    // Set the CSRF token cookie
    cookieStore.set("csrf_token", token, {
      httpOnly: false, // Must be false for JavaScript access (double-submit pattern)
      secure: process.env.NODE_ENV !== 'development', // Use secure flag in production
      path: "/",
      sameSite: 'lax', // Recommended for CSRF protection
      // Consider adding 'maxAge' or 'expires' if needed
    })

    // console.log("CSRF token set in cookie:", token); // Optional: for debugging
    return NextResponse.json({ ok: true }, { status: 200 })

  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return NextResponse.json({ error: "Failed to generate CSRF token" }, { status: 500 });
  }
}
