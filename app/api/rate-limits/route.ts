import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";

export async function GET() {
  try {
    const token = await convexAuthNextjsToken();

    // If no valid token, the user is not authenticated
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const rateLimitStatus = await fetchQuery(
      api.users.getRateLimitStatus,
      {},
      { token }
    );

    return new Response(JSON.stringify(rateLimitStatus), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error in /api/rate-limits:", err);

    const message = err?.message || "Internal server error";

    // Determine if error relates to authentication/authorization
    const authErrorPatterns = [
      "Unauthorized",
      "unauthorized",
      "invalid token",
      "jwt",
      "token",
    ];

    const isAuthError = authErrorPatterns.some((p) =>
      message.toLowerCase().includes(p.toLowerCase())
    );

    const statusCode = isAuthError ? 401 : 500;

    return new Response(
      JSON.stringify({ error: message }),
      {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
