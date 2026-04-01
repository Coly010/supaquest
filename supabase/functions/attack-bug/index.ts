// attack-bug — attack a random bug in the given environment area.
// Returns combat result: outcome, damage, XP/credits gained, loot.

import { Effect } from "npm:effect@3"
import { AppLayer } from "../_shared/app-layer.ts"
import { runEffect } from "../_shared/effect-runner.ts"
import { authenticate } from "../_shared/auth.ts"
import { handleCors, error } from "../_shared/respond.ts"
import { CombatService } from "../_shared/services/CombatService.ts"

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let playerId: string
  try {
    playerId = await authenticate(req)
  } catch {
    return error("Unauthorized", 401)
  }

  let body: { areaId?: string }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { areaId } = body
  if (!areaId || typeof areaId !== "string") {
    return error("areaId is required", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const combat = yield* CombatService
      return yield* combat.attackBug(playerId, areaId)
    }),
    AppLayer
  )
})
