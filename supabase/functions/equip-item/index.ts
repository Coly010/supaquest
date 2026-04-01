// equip-item Edge Function
// Equips an inventory item into its equipment slot.
// Validates level requirement and slot availability.

import { Effect } from "npm:effect@3"
import { authenticate } from "../_shared/auth.ts"
import { handleCors, error } from "../_shared/respond.ts"
import { runEffect } from "../_shared/effect-runner.ts"
import { AppLayer } from "../_shared/app-layer.ts"
import { InventoryService } from "../_shared/services/InventoryService.ts"
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

  let body: { inventoryId?: string }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { inventoryId } = body
  if (!inventoryId || typeof inventoryId !== "string") {
    return error("inventoryId is required", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const playerSvc = yield* PlayerService
      const inventorySvc = yield* InventoryService

      const profile = yield* playerSvc.getProfile(playerId)
      const playerLevel = (profile as Record<string, unknown>)["level"] as number

      const result = yield* inventorySvc.equipItem(inventoryId, playerLevel)
      return { equippedSlot: result.equippedSlot }
    }),
    AppLayer
  )
})
