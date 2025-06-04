import { auth } from "@/convex/auth"

/**
 * Validates the user's identity
 * @param userId - The ID of the user.
 * @param isAuthenticated - Whether the user is authenticated.
 * @returns The Supabase client.
 */
export async function validateUserIdentity(userId: string) {
  const { session } = await auth.validateRequest()
  if (!session) {
    throw new Error("Unauthorized")
  }
  if (session.user._id !== userId) {
    throw new Error("User ID does not match authenticated user")
  }
}
