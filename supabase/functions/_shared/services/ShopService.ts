// ShopService for Edge Functions (Deno).
// Uses supabase.rpc() for atomic buy/sell transactions.

import { Context, Effect, Layer } from "npm:effect@3"
import { SupabaseClient } from "./SupabaseClient.ts"
import {
  DatabaseError,
  InventoryItemNotFound,
  InsufficientResource,
  ItemNotInShop,
  OutOfStock,
} from "./errors.ts"

export class ShopService extends Context.Tag("ShopService")<
  ShopService,
  {
    readonly buyItem: (
      playerId: string,
      shopId: string,
      itemDefId: string
    ) => Effect.Effect<
      { creditsPaid: number },
      ItemNotInShop | OutOfStock | InsufficientResource | DatabaseError
    >

    readonly sellItem: (
      playerId: string,
      inventoryId: string
    ) => Effect.Effect<{ creditsReceived: number }, InventoryItemNotFound | DatabaseError>
  }
>() {}

export const ShopServiceLive = Layer.effect(
  ShopService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient

    return {
      buyItem: (playerId, shopId, itemDefId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.rpc("buy_item", {
              p_player_id: playerId,
              p_shop_id: shopId,
              p_item_def_id: itemDefId,
            })
          )

          if (error) {
            const msg = (error as { message?: string }).message ?? ""
            if (msg.includes("ItemNotInShop")) {
              return yield* Effect.fail(new ItemNotInShop({ shopId, itemDefId }))
            }
            if (msg.includes("OutOfStock")) {
              return yield* Effect.fail(new OutOfStock({ shopId, itemDefId }))
            }
            if (msg.includes("InsufficientResource")) {
              return yield* Effect.fail(
                new InsufficientResource({ playerId, resourceType: "credits", required: 0, available: 0 })
              )
            }
            return yield* Effect.fail(
              new DatabaseError({ message: msg, context: "buyItem" })
            )
          }

          return { creditsPaid: data as number }
        }),

      sellItem: (playerId, inventoryId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.rpc("sell_item", {
              p_player_id: playerId,
              p_inventory_id: inventoryId,
            })
          )

          if (error) {
            const msg = (error as { message?: string }).message ?? ""
            if (msg.includes("InventoryItemNotFound")) {
              return yield* Effect.fail(new InventoryItemNotFound({ inventoryId }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: msg, context: "sellItem" })
            )
          }

          return { creditsReceived: data as number }
        }),
    }
  })
)
