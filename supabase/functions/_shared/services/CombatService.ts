// CombatService for Edge Functions (Deno).
// Mirrors src/services/CombatService.ts with Deno-compatible imports.

import { Context, Effect, Layer } from "npm:effect@3"
import { SupabaseClient } from "./SupabaseClient.ts"
import { PlayerService } from "./PlayerService.ts"
import { InventoryService } from "./InventoryService.ts"
import { ItemRegistry } from "./ItemRegistry.ts"
import { AreaNotFound, DatabaseError, NoSpawnsInArea, PlayerNotFound } from "./errors.ts"

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

type Spawn = { npc_def_id: string; spawn_weight: number }

function weightedRandom(spawns: Spawn[]): string {
  const total = spawns.reduce((sum, s) => sum + s.spawn_weight, 0)
  let roll = Math.random() * total
  for (const s of spawns) {
    roll -= s.spawn_weight
    if (roll <= 0) return s.npc_def_id
  }
  return spawns[spawns.length - 1].npc_def_id
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
          // 1. Fetch area spawns (errors if area not found)
          const rawSpawns = yield* itemRegistry.getAreaSpawns(areaId)
          const spawns = rawSpawns as Spawn[]
          if (spawns.length === 0) {
            return yield* Effect.fail(new NoSpawnsInArea({ areaId }))
          }

          // 2. Weighted random bug selection
          const bugId = weightedRandom(spawns)
          const bug = yield* itemRegistry.getBug(bugId)
          const bugStats = bug["stats"] as {
            logic: number; resilience: number; throughput: number; serendipity: number
          }

          // 3. Player effective stats
          const effectiveStats = yield* playerSvc.getEffectiveStats(playerId)

          // 4. Combat resolution
          const successRate = Math.min(0.9, Math.max(0.1,
            effectiveStats.logic / (effectiveStats.logic + bugStats.logic)
          ))
          const outcome = (Math.random() <= successRate ? "win" : "lose") as "win" | "lose"

          const damageDealt = Math.max(1, Math.floor(
            effectiveStats.logic * 2 - bugStats.resilience + Math.random() * Math.max(1, effectiveStats.serendipity)
          ))
          const damageTaken = Math.max(1, Math.floor(
            bugStats.logic * 1.5 - effectiveStats.resilience + Math.random() * Math.max(1, bugStats.serendipity)
          ))

          // 5. Apply uptime damage (always)
          yield* playerSvc.gainResource(playerId, "uptime", -damageTaken)

          // 6. Rewards on win
          let xpGained = 0
          let creditsGained = 0
          const lootItems: string[] = []
          const lootGems: string[] = []

          if (outcome === "win") {
            xpGained = bug["xp_reward"] as number
            const creditsReward = bug["credits_reward"] as number[]
            creditsGained = Math.floor(
              Math.random() * (creditsReward[1] - creditsReward[0] + 1) + creditsReward[0]
            )

            yield* playerSvc.gainXp(playerId, xpGained)
            yield* playerSvc.gainResource(playerId, "credits", creditsGained)

            const itemDrops = rollItemLoot(bug["loot_table"])
            const gemDrops = rollGemLoot(bug["gem_loot_table"])

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
              defender_id: bugId,
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
            bugId,
            bugName: bug["name"] as string,
            damageDealt,
            damageTaken,
            xpGained,
            creditsGained,
            loot: { items: lootItems, gems: lootGems },
          }
        }),

      challengePlayer: (attackerId, defenderId) =>
        Effect.gen(function* () {
          const [attackerStats, defenderStats] = yield* Effect.all([
            playerSvc.getEffectiveStats(attackerId),
            playerSvc.getEffectiveStats(defenderId),
          ])

          const successRate = Math.min(0.9, Math.max(0.1,
            attackerStats.logic / (attackerStats.logic + defenderStats.logic)
          ))
          const outcome = (Math.random() <= successRate ? "win" : "lose") as "win" | "lose"

          const damageDealt = Math.max(1, Math.floor(
            attackerStats.logic * 2 - defenderStats.resilience + Math.random() * 10
          ))
          const damageTaken = Math.max(1, Math.floor(
            defenderStats.logic * 1.5 - attackerStats.resilience + Math.random() * 10
          ))

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
