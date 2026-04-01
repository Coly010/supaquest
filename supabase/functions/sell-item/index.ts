// sell-item Edge Function
// Atomically removes an item from the player's inventory and credits them.
// Delegates to the sell_item PL/pgSQL RPC via ShopService.

import { Effect } from "npm:effect@3"
import { authenticate } from "../_shared/auth.ts"
import { handleCors, error } from "../_shared/respond.ts"
import { runEffect } from "../_shared/effect-runner.ts"
import { AppLayer } from "../_shared/app-layer.ts"
import { ShopService } from "../_shared/services/ShopService.ts"

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
      const shop = yield* ShopService
      const result = yield* shop.sellItem(playerId, inventoryId)
      return { creditsReceived: result.creditsReceived }
    }),
    AppLayer
  )
})
