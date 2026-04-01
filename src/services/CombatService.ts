// CombatService — PvE bug encounters and PvP hackathon challenges.
// Combat is instant: stats are compared, outcome is rolled, rewards are applied.

import { Context, Effect, Layer } from "effect"
import type { Database } from "../lib/supabase/types"
import { SupabaseClient } from "./SupabaseClient"
import { PlayerService } from "./PlayerService"
import { InventoryService } from "./InventoryService"
import { ItemRegistry } from "./ItemRegistry"
import { AreaNotFound, DatabaseError, NoSpawnsInArea, PlayerNotFound } from "./errors"

type NpcAreaSpawn = Database["public"]["Tables"]["npc_area_spawns"]["Row"]
type NpcDefinition = Database["public"]["Tables"]["npc_definitions"]["Row"]

export interface CombatResult {
  readonly outcome: "win" | "lose"
  readonly bugId: string
  readonly bugName: string
  readonly damageDealt: number
  readonly damageTaken: number
  readonly xpGained: number
  readonly creditsGained: number
  readonly loot: {
    readonly items: string[]
    readonly gems: string[]
  }
}

export interface PvpResult {
  readonly outcome: "win" | "lose"
  readonly damageDealt: number
  readonly damageTaken: number
  readonly xpGained: number
}

// ---- Helpers ----

function weightedRandom(spawns: (NpcAreaSpawn & { npc: NpcDefinition })[]): NpcAreaSpawn & { npc: NpcDefinition } {
  const total = spawns.reduce((sum, s) => sum + s.spawn_weight, 0)
  let roll = Math.random() * total
  for (const s of spawns) {
    roll -= s.spawn_weight
    if (roll <= 0) return s
  }
  return spawns[spawns.length - 1]
}

function rollItemLoot(lootTable: unknown): string[] {
  if (!Array.isArray(lootTable)) return []
  const results: string[] = []
  for (const entry of lootTable as Array<{ item_def_id: string; chance: number; qty?: [number, number] }>) {
    if (Math.random() <= (entry.chance ?? 0)) {
      const qty = entry.qty
        ? Math.floor(Math.random() * (entry.qty[1] - entry.qty[0] + 1)) + entry.qty[0]
        : 1
      for (let i = 0; i < qty; i++) results.push(entry.item_def_id)
    }
  }
  return results
}

function rollGemLoot(gemLootTable: unknown): string[] {
  if (!Array.isArray(gemLootTable)) return []
  const results: string[] = []
  for (const entry of gemLootTable as Array<{ gem_def_id: string; chance: number }>) {
    if (Math.random() <= (entry.chance ?? 0)) results.push(entry.gem_def_id)
  }
  return results
}

// ---- Service ----

export class CombatService extends Context.Tag("CombatService")<
  CombatService,
  {
    readonly attackBug: (
      playerId: string,
      areaId: string
    ) => Effect.Effect<CombatResult, PlayerNotFound | AreaNotFound | NoSpawnsInArea | DatabaseError>

    readonly challengePlayer: (
      attackerId: string,
      defenderId: string
    ) => Effect.Effect<PvpResult, PlayerNotFound | DatabaseError>
  }
>() {}

export const CombatServiceLive = Layer.effect(
  CombatService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient
    const playerSvc = yield* PlayerService
    const inventorySvc = yield* InventoryService
    const itemRegistry = yield* ItemRegistry

    return {
      attackBug: (playerId, areaId) =>
        Effect.gen(function* () {
          // 1. Fetch area spawns (validates area exists)
          const spawns = yield* itemRegistry.getAreaSpawns(areaId)
          if (spawns.length === 0) {
            return yield* Effect.fail(new NoSpawnsInArea({ areaId }))
          }

          // 2. Pick random bug (weighted selection)
          const spawn = weightedRandom(spawns)
          const bug = spawn.npc
          const bugStats = bug.stats as {
            logic: number; resilience: number; throughput: number; serendipity: number
          }

          // 3. Fetch player effective stats
          const effectiveStats = yield* playerSvc.getEffectiveStats(playerId)

          // 4. Combat resolution
          // Success chance is bounded [0.1, 0.9] so there's always some risk/reward
          const successRate = Math.min(0.9, Math.max(0.1,
            effectiveStats.logic / (effectiveStats.logic + bugStats.logic)
          ))
          const outcome: "win" | "lose" = Math.random() <= successRate ? "win" : "lose"

          const damageDealt = Math.max(1, Math.floor(
            effectiveStats.logic * 2 - bugStats.resilience + Math.random() * Math.max(1, effectiveStats.serendipity)
          ))
          const damageTaken = Math.max(1, Math.floor(
            bugStats.logic * 1.5 - effectiveStats.resilience + Math.random() * Math.max(1, bugStats.serendipity)
          ))

          // 5. Apply uptime damage (always, regardless of outcome)
          yield* playerSvc.gainResource(playerId, "uptime", -damageTaken)

          // 6. Apply rewards on win
          let xpGained = 0
          let creditsGained = 0
          const lootItems: string[] = []
          const lootGems: string[] = []

          if (outcome === "win") {
            xpGained = bug.xp_reward
            const [minC, maxC] = bug.credits_reward as number[]
            creditsGained = Math.floor(Math.random() * (maxC - minC + 1) + minC)

            yield* playerSvc.gainXp(playerId, xpGained)
            yield* playerSvc.gainResource(playerId, "credits", creditsGained)

            const itemDrops = rollItemLoot(bug.loot_table)
            const gemDrops = rollGemLoot(bug.gem_loot_table)

            for (const itemDefId of itemDrops) {
              yield* inventorySvc.addItem(playerId, itemDefId)
              lootItems.push(itemDefId)
            }
            for (const gemDefId of gemDrops) {
              yield* inventorySvc.addItem(playerId, gemDefId)
              lootGems.push(gemDefId)
            }
          }

          // 7. Log combat
          yield* Effect.promise(() =>
            supabase.from("combat_logs").insert({
              attacker_id: playerId,
              defender_type: "npc",
              defender_id: bug.id,
              outcome,
              damage_dealt: damageDealt,
              damage_taken: damageTaken,
              xp_gained: xpGained,
              credits_gained: creditsGained,
              loot: { items: lootItems, gems: lootGems },
            })
          )

          return {
            outcome,
            bugId: bug.id,
            bugName: bug.name,
            damageDealt,
            damageTaken,
            xpGained,
            creditsGained,
            loot: { items: lootItems, gems: lootGems },
          }
        }),

      challengePlayer: (attackerId, defenderId) =>
        Effect.gen(function* () {
          // Fetch both players' effective stats concurrently
          const [attackerStats, defenderStats] = yield* Effect.all([
            playerSvc.getEffectiveStats(attackerId),
            playerSvc.getEffectiveStats(defenderId),
          ])

          const successRate = Math.min(0.9, Math.max(0.1,
            attackerStats.logic / (attackerStats.logic + defenderStats.logic)
          ))
          const outcome: "win" | "lose" = Math.random() <= successRate ? "win" : "lose"

          const damageDealt = Math.max(1, Math.floor(
            attackerStats.logic * 2 - defenderStats.resilience + Math.random() * 10
          ))
          const damageTaken = Math.max(1, Math.floor(
            defenderStats.logic * 1.5 - attackerStats.resilience + Math.random() * 10
          ))

          // Both players take damage — hackathon competition is taxing
          yield* Effect.all([
            playerSvc.gainResource(attackerId, "uptime", -damageTaken),
            playerSvc.gainResource(defenderId, "uptime", -damageDealt),
          ])

          const xpGained = outcome === "win" ? 25 : 5
          yield* playerSvc.gainXp(attackerId, xpGained)

          yield* Effect.promise(() =>
            supabase.from("combat_logs").insert({
              attacker_id: attackerId,
              defender_type: "player",
              defender_id: defenderId,
              outcome,
              damage_dealt: damageDealt,
              damage_taken: damageTaken,
              xp_gained: xpGained,
              credits_gained: 0,
              loot: null,
            })
          )

          return { outcome, damageDealt, damageTaken, xpGained }
        }),
    }
  })
)
