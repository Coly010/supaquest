// Edge Function call helpers.
// All game mutations go through these helpers — never write game state directly from the client.

import { createClient } from "./supabase/client"

type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status: number }

async function callFunction<T>(
  name: string,
  body: Record<string, unknown>
): Promise<ApiResult<T>> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke<T>(name, { body })

  if (error) {
    return { ok: false, error: error.message, status: 500 }
  }

  return { ok: true, data: data as T }
}

// ---- Profile ----

export const createProfile = (username: string, displayName: string) =>
  callFunction<{ playerId: string }>("create-profile", {
    username,
    displayName,
  })

// ---- Shop ----

export const buyItem = (shopId: string, itemDefId: string) =>
  callFunction<{ itemDefId: string; creditsPaid: number }>("buy-item", {
    shopId,
    itemDefId,
  })

export const sellItem = (inventoryId: string) =>
  callFunction<{ creditsReceived: number }>("sell-item", { inventoryId })

// ---- Inventory ----

export const equipItem = (inventoryId: string) =>
  callFunction<{ equippedSlot: string }>("equip-item", { inventoryId })

export const unequipItem = (inventoryId: string) =>
  callFunction<{ unequipped: boolean }>("unequip-item", { inventoryId })

export const socketGem = (inventoryId: string, gemInventoryId: string, slotIndex: number) =>
  callFunction<{ socketed: boolean }>("socket-gem", {
    inventoryId,
    gemInventoryId,
    slotIndex,
  })

// ---- Tasks ----

export const attemptTask = (taskDefId: string) =>
  callFunction<{
    outcome: "success" | "failure"
    rewardsGiven: Record<string, unknown>
  }>("attempt-task", { taskDefId })

// ---- Combat ----

export const attackBug = (areaId: string) =>
  callFunction<{
    outcome: "win" | "lose" | "flee"
    damageDealt: number
    damageTaken: number
    xpGained: number
    creditsGained: number
    loot: unknown
  }>("attack-bug", { areaId })

export const challengePlayer = (targetPlayerId: string) =>
  callFunction<{
    outcome: "win" | "lose"
    damageDealt: number
    damageTaken: number
  }>("challenge-player", { targetPlayerId })

// ---- Chat ----

export const sendMessage = (channel: string, content: string) =>
  callFunction<{ messageId: string }>("send-message", { channel, content })

// ---- Admin ----

export const adminUpdateItem = (itemDefId: string, patches: Record<string, unknown>) =>
  callFunction<{ updated: boolean }>("admin/update-item", { itemDefId, patches })

export const adminUpdateBug = (bugDefId: string, patches: Record<string, unknown>) =>
  callFunction<{ updated: boolean }>("admin/update-bug", { bugDefId, patches })

export const adminUpdateTask = (taskDefId: string, patches: Record<string, unknown>) =>
  callFunction<{ updated: boolean }>("admin/update-task", { taskDefId, patches })

export const adminGrantAdmin = (targetPlayerId: string) =>
  callFunction<{ granted: boolean }>("admin/grant-admin", { targetPlayerId })

export const adminRevokeAdmin = (targetPlayerId: string) =>
  callFunction<{ revoked: boolean }>("admin/revoke-admin", { targetPlayerId })

export const adminAdjustResource = (
  targetPlayerId: string,
  resourceType: string,
  delta: number
) =>
  callFunction<{ adjusted: boolean }>("admin/adjust-player-resource", {
    targetPlayerId,
    resourceType,
    delta,
  })
