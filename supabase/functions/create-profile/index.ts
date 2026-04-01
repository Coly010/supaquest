// create-profile Edge Function
// Called after Supabase Auth signup to initialise the player's profile, stats, skills, and resources.
// The client calls this immediately after successful sign-up.

import { Effect } from "npm:effect@3"
import { authenticate } from "../_shared/auth.ts"
import { handleCors, error } from "../_shared/respond.ts"
import { runEffect } from "../_shared/effect-runner.ts"
import { AppLayer } from "../_shared/app-layer.ts"
import { PlayerService } from "../_shared/services/PlayerService.ts"

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let playerId: string
  try {
    playerId = await authenticate(req)
  } catch {
    return error("Unauthorized", 401)
  }

  let body: { username?: string; displayName?: string }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { username, displayName } = body

  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return error("username must be at least 3 characters", 400)
  }
  if (!displayName || typeof displayName !== "string" || displayName.trim().length < 1) {
    return error("displayName is required", 400)
  }

  // Sanitise: alphanumeric + underscores only for username
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return error("username may only contain letters, numbers, and underscores", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const player = yield* PlayerService
      const profile = yield* player.createProfile(
        playerId,
        username.trim().toLowerCase(),
        displayName.trim()
      )
      return { playerId: profile["id"], username: profile["username"] }
    }),
    AppLayer
  )
})
