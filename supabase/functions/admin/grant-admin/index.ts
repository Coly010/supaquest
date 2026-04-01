// Admin Edge Function: grant-admin
// Sets is_admin = true on a target player. Requires is_admin = true.

import { Effect } from "npm:effect@3"
import { authenticate } from "../../_shared/auth.ts"
import { handleCors, error } from "../../_shared/respond.ts"
import { runEffect } from "../../_shared/effect-runner.ts"
import { AppLayer } from "../../_shared/app-layer.ts"
import { AdminService } from "../../_shared/services/AdminService.ts"

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let playerId: string
  try {
    playerId = await authenticate(req)
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

  return runEffect(
    Effect.gen(function* () {
      const admin = yield* AdminService
      yield* admin.grantAdmin(playerId, targetPlayerId)
      return { granted: true }
    }),
    AppLayer
  )
})
