// Admin Edge Function: update-item
// Updates fields on an item_definition. Requires is_admin = true.

import { Effect } from "npm:effect@3"
import { authenticate } from "../../_shared/auth.ts"
import { handleCors, error } from "../../_shared/respond.ts"
import { runEffect } from "../../_shared/effect-runner.ts"
import { AppLayer } from "../../_shared/app-layer.ts"
import { AdminService, type ItemPatch } from "../../_shared/services/AdminService.ts"

const ALLOWED_ITEM_KEYS: (keyof ItemPatch)[] = [
  "name",
  "description",
  "base_stats",
  "base_value",
  "level_required",
  "gem_slot_count",
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

  let body: { itemDefId?: string; patches?: unknown }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { itemDefId, patches } = body
  if (!itemDefId || typeof itemDefId !== "string") {
    return error("itemDefId is required", 400)
  }
  if (!patches || typeof patches !== "object" || Array.isArray(patches)) {
    return error("patches must be an object", 400)
  }

  // Allowlist: only let clients patch known, safe columns
  const safePatch: Record<string, unknown> = {}
  for (const key of ALLOWED_ITEM_KEYS) {
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
      yield* admin.updateItem(playerId, itemDefId, safePatch as ItemPatch)
      return { updated: true }
    }),
    AppLayer
  )
})
