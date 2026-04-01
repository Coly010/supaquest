// socket-gem Edge Function
// Consumes a gem from inventory and sockets it into an equipped item's gem slot.

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

  void playerId

  let body: { inventoryId?: string; gemInventoryId?: string; slotIndex?: number }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { inventoryId, gemInventoryId, slotIndex } = body
  if (!inventoryId || typeof inventoryId !== "string") {
    return error("inventoryId is required", 400)
  }
  if (!gemInventoryId || typeof gemInventoryId !== "string") {
    return error("gemInventoryId is required", 400)
  }
  if (typeof slotIndex !== "number" || slotIndex < 0) {
    return error("slotIndex must be a non-negative integer", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const inventorySvc = yield* InventoryService
      yield* inventorySvc.socketGem(inventoryId, gemInventoryId, Math.floor(slotIndex))
      return { socketed: true }
    }),
    AppLayer
  )
})
