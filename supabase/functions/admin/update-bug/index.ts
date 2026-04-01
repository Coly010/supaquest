// Admin Edge Function: update-bug
// Updates fields on an npc_definition. Requires is_admin = true.

import { Effect } from "npm:effect@3"
import { authenticate } from "../../_shared/auth.ts"
import { handleCors, error } from "../../_shared/respond.ts"
import { runEffect } from "../../_shared/effect-runner.ts"
import { AppLayer } from "../../_shared/app-layer.ts"
import { AdminService, type BugPatch } from "../../_shared/services/AdminService.ts"

const ALLOWED_BUG_KEYS: (keyof BugPatch)[] = [
  "name",
  "description",
  "level",
  "stats",
  "xp_reward",
  "uptime",
]

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let playerId: string
  try {
    playerId = await authenticate(req)
  } catch {
    return error("Unauthorized", 401)
  }

  let body: { bugDefId?: string; patches?: unknown }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { bugDefId, patches } = body
  if (!bugDefId || typeof bugDefId !== "string") {
    return error("bugDefId is required", 400)
  }
  if (!patches || typeof patches !== "object" || Array.isArray(patches)) {
    return error("patches must be an object", 400)
  }

  const safePatch: Record<string, unknown> = {}
  for (const key of ALLOWED_BUG_KEYS) {
    if (key in (patches as Record<string, unknown>)) {
      safePatch[key] = (patches as Record<string, unknown>)[key]
    }
  }
  if (Object.keys(safePatch).length === 0) {
    return error("No valid patch fields provided", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const admin = yield* AdminService
      yield* admin.updateBug(playerId, bugDefId, safePatch as BugPatch)
      return { updated: true }
    }),
    AppLayer
  )
})
