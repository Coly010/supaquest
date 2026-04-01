// InventoryService for Edge Functions (Deno).
// Item storage, equip/unequip, gem socketing.
// Only includes methods needed by Phase 2 Edge Functions.

import { Context, Effect, Layer } from "npm:effect@3"
import { SupabaseClient } from "./SupabaseClient.ts"
import { ItemRegistry } from "./ItemRegistry.ts"
import {
  DatabaseError,
  GemSlotOccupied,
  InventoryItemNotFound,
  ItemNotEquippable,
  ItemNotFound,
  LevelRequirementNotMet,
  NoGemSlotsAvailable,
  SlotAlreadyOccupied,
} from "./errors.ts"

export class InventoryService extends Context.Tag("InventoryService")<
  InventoryService,
  {
    readonly addItem: (
      playerId: string,
      itemDefId: string,
      quantity?: number
    ) => Effect.Effect<Record<string, unknown>, ItemNotFound | DatabaseError>

    readonly equipItem: (
      inventoryId: string,
      playerLevel: number
    ) => Effect.Effect<
      { equippedSlot: string },
      | InventoryItemNotFound
      | ItemNotEquippable
      | SlotAlreadyOccupied
      | LevelRequirementNotMet
      | DatabaseError
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
          const stackable = itemDef["stackable"] as boolean

          if (stackable) {
            const { data: existing } = yield* Effect.promise(() =>
              supabase
                .from("player_inventory")
                .select("id, quantity")
                .eq("player_id", playerId)
                .eq("item_def_id", itemDefId)
                .maybeSingle()
            )

            if (existing) {
              const row = existing as { id: string; quantity: number }
              const { data, error } = yield* Effect.promise(() =>
                supabase
                  .from("player_inventory")
                  .update({ quantity: row.quantity + quantity })
                  .eq("id", row.id)
                  .select()
                  .single()
              )
              if (error || !data) {
                return yield* Effect.fail(
                  new DatabaseError({ message: (error as { message?: string })?.message ?? "Failed to update stack", context: "addItem" })
                )
              }
              return data as Record<string, unknown>
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
              new DatabaseError({ message: (error as { message?: string })?.message ?? "Failed to add item", context: "addItem" })
            )
          }
          return data as Record<string, unknown>
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

          const row = invItem as Record<string, unknown>
          const item = row["item"] as Record<string, unknown> | null

          if (!item || !item["slot"]) {
            return yield* Effect.fail(
              new ItemNotEquippable({
                itemDefId: row["item_def_id"] as string,
                reason: "Item has no equipment slot",
              })
            )
          }

          const itemType = item["item_type"] as string
          if (itemType === "consumable" || itemType === "material" || itemType === "gem") {
            return yield* Effect.fail(
              new ItemNotEquippable({
                itemDefId: item["id"] as string,
                reason: "This item type cannot be equipped",
              })
            )
          }

          const levelRequired = item["level_required"] as number
          if (playerLevel < levelRequired) {
            return yield* Effect.fail(
              new LevelRequirementNotMet({ required: levelRequired, current: playerLevel })
            )
          }

          const { error: updateError } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .update({ is_equipped: true, equipped_slot: item["slot"] })
              .eq("id", inventoryId)
          )
          if (updateError) {
            const err = updateError as { code?: string; message?: string }
            if (err.code === "23505") {
              return yield* Effect.fail(new SlotAlreadyOccupied({ slot: item["slot"] as string }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: err.message ?? "Failed to equip", context: "equipItem" })
            )
          }

          return { equippedSlot: item["slot"] as string }
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

          const row = invItem as { is_equipped: boolean; item_def_id: string }
          if (!row.is_equipped) {
            return yield* Effect.fail(
              new ItemNotEquippable({ itemDefId: row.item_def_id, reason: "Item is not equipped" })
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
              new DatabaseError({ message: (error as { message?: string }).message ?? "Failed to unequip", context: "unequipItem" })
            )
          }
        }),

      socketGem: (inventoryId, gemInventoryId, slotIndex) =>
        Effect.gen(function* () {
          // Verify the target item exists and get its gem slot count
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

          const row = invItem as Record<string, unknown>
          const itemDef = row["item"] as Record<string, unknown> | null
          const gemSlotCount = (itemDef?.["gem_slot_count"] as number) ?? 0

          if (gemSlotCount === 0 || slotIndex >= gemSlotCount) {
            return yield* Effect.fail(new NoGemSlotsAvailable({ inventoryId }))
          }

          // Check slot not already occupied
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

          // Verify gem inventory item exists and get its gem_def_id
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

          const gemRow = gemInvItem as { item_def_id: string; player_id: string }

          // Socket the gem
          const { error: insertError } = yield* Effect.promise(() =>
            supabase.from("inventory_gems").insert({
              inventory_id: inventoryId,
              gem_def_id: gemRow.item_def_id,
              slot_index: slotIndex,
            })
          )
          if (insertError) {
            return yield* Effect.fail(
              new DatabaseError({ message: (insertError as { message?: string }).message ?? "Failed to socket gem", context: "socketGem" })
            )
          }

          // Consume the gem from inventory
          yield* Effect.promise(() =>
            supabase.from("player_inventory").delete().eq("id", gemInventoryId)
          )
        }),
    }
  })
)
