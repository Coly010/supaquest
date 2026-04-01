// InventoryService — item storage, equip/unequip, gem socketing.
// Depends on: ItemRegistry (for item/gem definitions).
// Stat calculation is handled by StatsCalculator (pure function) to avoid circular deps with PlayerService.

import { Context, Effect, Layer } from "effect"
import type { Database } from "../lib/supabase/types"
import { SupabaseClient } from "./SupabaseClient"
import { ItemRegistry } from "./ItemRegistry"
import {
  DatabaseError,
  GemSlotOccupied,
  InventoryItemNotFound,
  ItemNotEquippable,
  ItemNotFound,
  LevelRequirementNotMet,
  NoGemSlotsAvailable,
  SlotAlreadyOccupied,
} from "./errors"

type PlayerInventory = Database["public"]["Tables"]["player_inventory"]["Row"]
type InventoryGem = Database["public"]["Tables"]["inventory_gems"]["Row"]

export interface InventoryItemWithDefinition extends PlayerInventory {
  item: Database["public"]["Tables"]["item_definitions"]["Row"]
}

export class InventoryService extends Context.Tag("InventoryService")<
  InventoryService,
  {
    readonly addItem: (
      playerId: string,
      itemDefId: string,
      quantity?: number
    ) => Effect.Effect<PlayerInventory, ItemNotFound | DatabaseError>

    readonly removeItem: (
      inventoryId: string,
      quantity?: number
    ) => Effect.Effect<void, InventoryItemNotFound | DatabaseError>

    readonly getInventory: (
      playerId: string
    ) => Effect.Effect<InventoryItemWithDefinition[], DatabaseError>

    readonly equipItem: (
      inventoryId: string,
      playerLevel: number
    ) => Effect.Effect<
      { equippedSlot: string },
      InventoryItemNotFound | ItemNotEquippable | SlotAlreadyOccupied | LevelRequirementNotMet | DatabaseError
    >

    readonly unequipItem: (
      inventoryId: string
    ) => Effect.Effect<void, InventoryItemNotFound | ItemNotEquippable | DatabaseError>

    readonly socketGem: (
      inventoryId: string,
      gemInventoryId: string,
      slotIndex: number
    ) => Effect.Effect<
      void,
      InventoryItemNotFound | NoGemSlotsAvailable | GemSlotOccupied | DatabaseError
    >

    readonly getEquippedGems: (
      inventoryId: string
    ) => Effect.Effect<InventoryGem[], DatabaseError>
  }
>() {}

export const InventoryServiceLive = Layer.effect(
  InventoryService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient
    const registry = yield* ItemRegistry

    return {
      addItem: (playerId, itemDefId, quantity = 1) =>
        Effect.gen(function* () {
          const itemDef = yield* registry.getItem(itemDefId)

          if (itemDef.stackable) {
            // For stackable items, increment existing stack or create new
            const { data: existing } = yield* Effect.promise(() =>
              supabase
                .from("player_inventory")
                .select("id, quantity")
                .eq("player_id", playerId)
                .eq("item_def_id", itemDefId)
                .maybeSingle()
            )

            if (existing) {
              const { data, error } = yield* Effect.promise(() =>
                supabase
                  .from("player_inventory")
                  .update({ quantity: existing.quantity + quantity })
                  .eq("id", existing.id)
                  .select()
                  .single()
              )
              if (error || !data) {
                return yield* Effect.fail(
                  new DatabaseError({ message: error?.message ?? "Failed to update stack", context: "addItem" })
                )
              }
              return data
            }
          }

          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .insert({ player_id: playerId, item_def_id: itemDefId, quantity })
              .select()
              .single()
          )
          if (error || !data) {
            return yield* Effect.fail(
              new DatabaseError({
                message: error?.message ?? "Failed to add item",
                context: "addItem",
              })
            )
          }
          return data
        }),

      removeItem: (inventoryId, quantity = 1) =>
        Effect.gen(function* () {
          const { data: item, error: fetchError } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .select("quantity")
              .eq("id", inventoryId)
              .single()
          )
          if (fetchError || !item) {
            return yield* Effect.fail(new InventoryItemNotFound({ inventoryId }))
          }

          if (item.quantity > quantity) {
            const { error } = yield* Effect.promise(() =>
              supabase
                .from("player_inventory")
                .update({ quantity: item.quantity - quantity })
                .eq("id", inventoryId)
            )
            if (error) {
              return yield* Effect.fail(
                new DatabaseError({ message: error.message, context: "removeItem" })
              )
            }
          } else {
            const { error } = yield* Effect.promise(() =>
              supabase.from("player_inventory").delete().eq("id", inventoryId)
            )
            if (error) {
              return yield* Effect.fail(
                new DatabaseError({ message: error.message, context: "removeItem" })
              )
            }
          }
        }),

      getInventory: (playerId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .select("*, item:item_definitions(*)")
              .eq("player_id", playerId)
              .order("acquired_at")
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "getInventory" })
            )
          }
          return (data ?? []) as InventoryItemWithDefinition[]
        }),

      equipItem: (inventoryId, playerLevel) =>
        Effect.gen(function* () {
          const { data: invItem, error: fetchError } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .select("*, item:item_definitions(*)")
              .eq("id", inventoryId)
              .single()
          )
          if (fetchError || !invItem) {
            return yield* Effect.fail(new InventoryItemNotFound({ inventoryId }))
          }

          const item = invItem.item as Database["public"]["Tables"]["item_definitions"]["Row"] | null
          if (!item || !item.slot) {
            return yield* Effect.fail(
              new ItemNotEquippable({
                itemDefId: invItem.item_def_id,
                reason: "Item has no equipment slot",
              })
            )
          }

          if (item.item_type === "consumable" || item.item_type === "material") {
            return yield* Effect.fail(
              new ItemNotEquippable({
                itemDefId: item.id,
                reason: "Consumables and materials cannot be equipped",
              })
            )
          }

          if (playerLevel < item.level_required) {
            return yield* Effect.fail(
              new LevelRequirementNotMet({
                required: item.level_required,
                current: playerLevel,
              })
            )
          }

          const { error: updateError } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .update({ is_equipped: true, equipped_slot: item.slot })
              .eq("id", inventoryId)
          )
          if (updateError) {
            // Unique constraint violation means slot is occupied
            if (updateError.code === "23505") {
              return yield* Effect.fail(new SlotAlreadyOccupied({ slot: item.slot! }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: updateError.message, context: "equipItem" })
            )
          }

          return { equippedSlot: item.slot! }
        }),

      unequipItem: (inventoryId) =>
        Effect.gen(function* () {
          const { data: invItem, error: fetchError } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .select("is_equipped, item_def_id")
              .eq("id", inventoryId)
              .single()
          )
          if (fetchError || !invItem) {
            return yield* Effect.fail(new InventoryItemNotFound({ inventoryId }))
          }
          if (!invItem.is_equipped) {
            return yield* Effect.fail(
              new ItemNotEquippable({
                itemDefId: invItem.item_def_id,
                reason: "Item is not equipped",
              })
            )
          }

          const { error } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .update({ is_equipped: false, equipped_slot: null })
              .eq("id", inventoryId)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "unequipItem" })
            )
          }
        }),

      socketGem: (inventoryId, gemInventoryId, slotIndex) =>
        Effect.gen(function* () {
          // Verify the target inventory item exists and get its gem slot count
          const { data: invItem, error: itemError } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .select("item_def_id, item:item_definitions(gem_slot_count)")
              .eq("id", inventoryId)
              .single()
          )
          if (itemError || !invItem) {
            return yield* Effect.fail(new InventoryItemNotFound({ inventoryId }))
          }

          const gemSlotCount =
            (invItem.item as { gem_slot_count: number } | null)?.gem_slot_count ?? 0

          if (gemSlotCount === 0) {
            return yield* Effect.fail(new NoGemSlotsAvailable({ inventoryId }))
          }

          if (slotIndex >= gemSlotCount) {
            return yield* Effect.fail(new NoGemSlotsAvailable({ inventoryId }))
          }

          // Check slot is not already occupied
          const { data: existing } = yield* Effect.promise(() =>
            supabase
              .from("inventory_gems")
              .select("id")
              .eq("inventory_id", inventoryId)
              .eq("slot_index", slotIndex)
              .maybeSingle()
          )
          if (existing) {
            return yield* Effect.fail(new GemSlotOccupied({ inventoryId, slotIndex }))
          }

          // Verify the gem inventory item belongs to the same player and get its gem_def_id
          const { data: gemInvItem, error: gemItemError } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .select("item_def_id, player_id")
              .eq("id", gemInventoryId)
              .single()
          )
          if (gemItemError || !gemInvItem) {
            return yield* Effect.fail(new InventoryItemNotFound({ inventoryId: gemInventoryId }))
          }

          // Insert the gem socket record
          const { error: insertError } = yield* Effect.promise(() =>
            supabase.from("inventory_gems").insert({
              inventory_id: inventoryId,
              gem_def_id: gemInvItem.item_def_id,
              slot_index: slotIndex,
            })
          )
          if (insertError) {
            return yield* Effect.fail(
              new DatabaseError({ message: insertError.message, context: "socketGem" })
            )
          }

          // Consume the gem from inventory
          yield* Effect.promise(() =>
            supabase.from("player_inventory").delete().eq("id", gemInventoryId)
          )
        }),

      getEquippedGems: (inventoryId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("inventory_gems")
              .select("*")
              .eq("inventory_id", inventoryId)
              .order("slot_index")
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "getEquippedGems" })
            )
          }
          return data ?? []
        }),
    }
  })
)
