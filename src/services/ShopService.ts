// ShopService — shop browsing and item transactions.
// Uses supabase.rpc() for buy/sell to ensure atomicity (per CLAUDE.md).
// No dependency on PlayerService or InventoryService — those mutations happen
// inside the PL/pgSQL RPCs directly.

import { Context, Effect, Layer } from "effect"
import type { Database } from "../lib/supabase/types"
import { SupabaseClient } from "./SupabaseClient"
import {
  DatabaseError,
  InventoryItemNotFound,
  InsufficientResource,
  ItemNotInShop,
  OutOfStock,
  ShopNotFound,
} from "./errors"

type Shop = Database["public"]["Tables"]["shops"]["Row"]
type ShopInventoryRow = Database["public"]["Tables"]["shop_inventory"]["Row"]
type ItemDefinition = Database["public"]["Tables"]["item_definitions"]["Row"]

export interface ShopInventoryItem extends ShopInventoryRow {
  item: ItemDefinition
}

export interface ShopWithInventory {
  shop: Shop
  items: ShopInventoryItem[]
}

export class ShopService extends Context.Tag("ShopService")<
  ShopService,
  {
    readonly getShop: (
      shopId: string
    ) => Effect.Effect<ShopWithInventory, ShopNotFound | DatabaseError>

    readonly getAllShops: () => Effect.Effect<Shop[], DatabaseError>

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
      getShop: (shopId) =>
        Effect.gen(function* () {
          const { data: shop, error: shopError } = yield* Effect.promise(() =>
            supabase.from("shops").select("*").eq("id", shopId).single()
          )
          if (shopError || !shop) {
            return yield* Effect.fail(new ShopNotFound({ shopId }))
          }

          const { data: items, error: itemsError } = yield* Effect.promise(() =>
            supabase
              .from("shop_inventory")
              .select("*, item:item_definitions(*)")
              .eq("shop_id", shopId)
              .order("item_def_id")
          )
          if (itemsError) {
            return yield* Effect.fail(
              new DatabaseError({ message: itemsError.message, context: "getShop" })
            )
          }

          return { shop, items: (items ?? []) as ShopInventoryItem[] }
        }),

      getAllShops: () =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.from("shops").select("*")
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "getAllShops" })
            )
          }
          return data ?? []
        }),

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
            const msg = error.message
            if (msg.includes("ItemNotInShop")) {
              return yield* Effect.fail(new ItemNotInShop({ shopId, itemDefId }))
            }
            if (msg.includes("OutOfStock")) {
              return yield* Effect.fail(new OutOfStock({ shopId, itemDefId }))
            }
            if (msg.includes("InsufficientResource")) {
              return yield* Effect.fail(
                new InsufficientResource({
                  playerId,
                  resourceType: "credits",
                  required: 0,
                  available: 0,
                })
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
            if (error.message.includes("InventoryItemNotFound")) {
              return yield* Effect.fail(new InventoryItemNotFound({ inventoryId }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "sellItem" })
            )
          }

          return { creditsReceived: data as number }
        }),
    }
  })
)
