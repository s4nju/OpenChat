import { generateCsrfToken } from "@/lib/csrf"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  const token = await generateCsrfToken(process.env.CSRF_SECRET!);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("csrf_token", token, {
    httpOnly: false, // CSRF tokens are usually readable by JS
    secure: true,
    path: "/",
  });
  return response;
}
