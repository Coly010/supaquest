// unequip-item Edge Function
// Removes an item from its equipment slot, returning it to unequipped inventory.

import { Effect } from "npm:effect@3"
import { authenticate } from "../_shared/auth.ts"
import { handleCors, error } from "../_shared/respond.ts"
import { runEffect } from "../_shared/effect-runner.ts"
import { AppLayer } from "../_shared/app-layer.ts"
import { InventoryService } from "../_shared/services/InventoryService.ts"

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let playerId: string
  try {
    playerId = await authenticate(req)
  } catch {
    return error("Unauthorized", 401)
  }

  // playerId is used implicitly — RLS on player_inventory ensures ownership.
  // We still authenticate to prevent unauthenticated calls.
  void playerId

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
      const inventorySvc = yield* InventoryService
      yield* inventorySvc.unequipItem(inventoryId)
      return { unequipped: true }
    }),
    AppLayer
  )
})
