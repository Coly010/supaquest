// buy-item Edge Function
// Atomically deducts credits from the player and adds the item to their inventory.
// Delegates to the buy_item PL/pgSQL RPC via ShopService.

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

  let body: { shopId?: string; itemDefId?: string }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { shopId, itemDefId } = body
  if (!shopId || typeof shopId !== "string") {
    return error("shopId is required", 400)
  }
  if (!itemDefId || typeof itemDefId !== "string") {
    return error("itemDefId is required", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const shop = yield* ShopService
      const result = yield* shop.buyItem(playerId, shopId, itemDefId)
      return { itemDefId, creditsPaid: result.creditsPaid }
    }),
    AppLayer
  )
})
