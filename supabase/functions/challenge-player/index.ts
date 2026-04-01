// challenge-player — initiate a PvP hackathon challenge against another developer.
// Both players take uptime damage. Winner gets XP. No loot is lost.

import { Effect } from "npm:effect@3"
import { AppLayer } from "../_shared/app-layer.ts"
import { runEffect } from "../_shared/effect-runner.ts"
import { authenticate } from "../_shared/auth.ts"
import { handleCors, error } from "../_shared/respond.ts"
import { CombatService } from "../_shared/services/CombatService.ts"

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let attackerId: string
  try {
    attackerId = await authenticate(req)
  } catch {
    return error("Unauthorized", 401)
  }

  let body: { targetPlayerId?: string }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { targetPlayerId } = body
  if (!targetPlayerId || typeof targetPlayerId !== "string") {
    return error("targetPlayerId is required", 400)
  }

  if (attackerId === targetPlayerId) {
    return error("Cannot challenge yourself", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const combat = yield* CombatService
      return yield* combat.challengePlayer(attackerId, targetPlayerId)
    }),
    AppLayer
  )
})
