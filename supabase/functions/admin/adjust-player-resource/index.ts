// Admin Edge Function: adjust-player-resource
// Adds or subtracts from a player's resource. Requires is_admin = true.
// delta > 0 adds; delta < 0 subtracts (floored at 0, capped at maximum).

import { Effect } from "npm:effect@3"
import { authenticate } from "../../_shared/auth.ts"
import { handleCors, error } from "../../_shared/respond.ts"
import { runEffect } from "../../_shared/effect-runner.ts"
import { AppLayer } from "../../_shared/app-layer.ts"
import { AdminService } from "../../_shared/services/AdminService.ts"

const ALLOWED_RESOURCE_TYPES = ["focus", "uptime", "credits"]

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let playerId: string
  try {
    playerId = await authenticate(req)
  } catch {
    return error("Unauthorized", 401)
  }

  let body: { targetPlayerId?: string; resourceType?: string; delta?: unknown }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { targetPlayerId, resourceType, delta } = body
  if (!targetPlayerId || typeof targetPlayerId !== "string") {
    return error("targetPlayerId is required", 400)
  }
  if (!resourceType || !ALLOWED_RESOURCE_TYPES.includes(resourceType)) {
    return error(`resourceType must be one of: ${ALLOWED_RESOURCE_TYPES.join(", ")}`, 400)
  }
  if (typeof delta !== "number" || delta === 0) {
    return error("delta must be a non-zero number", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const admin = yield* AdminService
      yield* admin.adjustResource(playerId, targetPlayerId, resourceType, delta)
      return { adjusted: true }
    }),
    AppLayer
  )
})
