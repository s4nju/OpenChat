import { fetchQuery } from "convex/nextjs";
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { api } from "@/convex/_generated/api";

export async function GET() {
  try {
    const token = await convexAuthNextjsToken();
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
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
