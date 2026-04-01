// JWT authentication helper for Edge Functions.
// Validates the Authorization header and returns the authenticated player's UUID.

import { createClient } from "jsr:@supabase/supabase-js@2"

export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthError"
  }
}

/**
 * Extracts and validates the Bearer token from the Authorization header.
 * Returns the authenticated user's UUID on success, throws AuthError on failure.
 */
export async function authenticate(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AuthError("Missing or invalid Authorization header")
  }

  const token = authHeader.replace("Bearer ", "")

  // Use a per-request client scoped to this user's JWT
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw new AuthError("Invalid or expired token")
  }

  return user.id
}
