// PlayerService for Edge Functions (Deno).
// Mirrors src/services/PlayerService.ts but uses Deno-compatible npm/jsr imports.

import { Context, Effect, Layer } from "npm:effect@3"
import { SupabaseClient } from "./SupabaseClient.ts"
import {
  DatabaseError,
  InsufficientResource,
  PlayerNotFound,
  UsernameTaken,
} from "./errors.ts"

const xpForNextLevel = (level: number): number => Math.floor(100 * Math.pow(1.5, level - 1))
const skillXpForNextLevel = (level: number): number => Math.floor(50 * Math.pow(1.4, level - 1))

export interface EffectiveStats {
  logic: number
  resilience: number
  throughput: number
  serendipity: number
  maxUptime: number
}

export class PlayerService extends Context.Tag("PlayerService")<
  PlayerService,
  {
    readonly createProfile: (
      userId: string,
      username: string,
      displayName: string
    ) => Effect.Effect<Record<string, unknown>, UsernameTaken | DatabaseError>

    readonly getProfile: (
      playerId: string
    ) => Effect.Effect<Record<string, unknown>, PlayerNotFound | DatabaseError>

    readonly getEffectiveStats: (
      playerId: string
    ) => Effect.Effect<EffectiveStats, PlayerNotFound | DatabaseError>

    readonly spendResource: (
      playerId: string,
      resourceType: string,
      amount: number
    ) => Effect.Effect<void, PlayerNotFound | InsufficientResource | DatabaseError>

    readonly gainResource: (
      playerId: string,
      resourceType: string,
      amount: number
    ) => Effect.Effect<void, PlayerNotFound | DatabaseError>

    readonly gainXp: (
      playerId: string,
      xp: number
    ) => Effect.Effect<{ leveled: boolean; newLevel: number }, PlayerNotFound | DatabaseError>

    readonly gainSkillXp: (
      playerId: string,
      skillId: string,
      xp: number
    ) => Effect.Effect<{ leveled: boolean; newLevel: number }, PlayerNotFound | DatabaseError>
  }
>() {}

export const PlayerServiceLive = Layer.effect(
  PlayerService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient

    return {
      createProfile: (userId, username, displayName) =>
        Effect.gen(function* () {
          const { data: existing } = yield* Effect.promise(() =>
            supabase.from("players").select("id").eq("username", username).maybeSingle()
          )
          if (existing) {
            return yield* Effect.fail(new UsernameTaken({ username }))
          }

          const { data: player, error: playerError } = yield* Effect.promise(() =>
            supabase
              .from("players")
              .insert({ id: userId, username, display_name: displayName })
              .select()
              .single()
          )
          if (playerError || !player) {
            return yield* Effect.fail(
              new DatabaseError({
                message: playerError?.message ?? "Failed to create player",
                context: "createProfile",
              })
            )
          }

          yield* Effect.promise(() =>
            supabase.from("player_stats").insert({ player_id: userId })
          )
          yield* Effect.promise(() =>
            supabase.from("player_skills").insert([
              { player_id: userId, skill_id: "debugging" },
              { player_id: userId, skill_id: "data_mining" },
              { player_id: userId, skill_id: "architecture" },
            ])
          )
          yield* Effect.promise(() =>
            supabase.from("player_resources").insert([
              { player_id: userId, resource_type: "focus", current: 100, maximum: 100 },
              { player_id: userId, resource_type: "uptime", current: 100, maximum: 100 },
              { player_id: userId, resource_type: "credits", current: 50, maximum: null },
            ])
          )

          return player as Record<string, unknown>
        }),

      getProfile: (playerId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.from("players").select("*").eq("id", playerId).single()
          )
          if (error || !data) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }
          return data as Record<string, unknown>
        }),

      getEffectiveStats: (playerId) =>
        Effect.gen(function* () {
          const { data: stats, error: statsError } = yield* Effect.promise(() =>
            supabase.from("player_stats").select("*").eq("player_id", playerId).single()
          )
          if (statsError || !stats) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }
          const s = stats as {
            logic: number; resilience: number; throughput: number
            serendipity: number; max_uptime: number
          }

          // Fetch equipped items with base_stats
          const { data: equipped } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .select("id, item_definitions(base_stats)")
              .eq("player_id", playerId)
              .eq("is_equipped", true)
          )

          // Sum item bonuses
          let logic = s.logic
          let resilience = s.resilience
          let throughput = s.throughput
          let serendipity = s.serendipity
          let maxUptime = s.max_uptime

          const inventoryIds: string[] = []
          for (const row of (equipped ?? [])) {
            inventoryIds.push((row as { id: string }).id)
            const itemDef = (row as { item_definitions: unknown }).item_definitions as {
              base_stats: Record<string, number>
            } | null
            const bs = itemDef?.base_stats ?? {}
            logic += bs["logic"] ?? 0
            resilience += bs["resilience"] ?? 0
            throughput += bs["throughput"] ?? 0
            serendipity += bs["serendipity"] ?? 0
            maxUptime += bs["max_uptime"] ?? 0
          }

          // Sum gem bonuses
          if (inventoryIds.length > 0) {
            const { data: gems } = yield* Effect.promise(() =>
              supabase
                .from("inventory_gems")
                .select("gem_definitions(stat_bonus)")
                .in("inventory_id", inventoryIds)
            )
            for (const g of (gems ?? [])) {
              const gemDef = (g as { gem_definitions: unknown }).gem_definitions as {
                stat_bonus: Record<string, number>
              } | null
              const sb = gemDef?.stat_bonus ?? {}
              logic += sb["logic"] ?? 0
              resilience += sb["resilience"] ?? 0
              throughput += sb["throughput"] ?? 0
              serendipity += sb["serendipity"] ?? 0
              maxUptime += sb["max_uptime"] ?? 0
            }
          }

          return { logic, resilience, throughput, serendipity, maxUptime }
        }),

      spendResource: (playerId, resourceType, amount) =>
        Effect.gen(function* () {
          const { data: resource, error } = yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .select("current")
              .eq("player_id", playerId)
              .eq("resource_type", resourceType)
              .single()
          )
          if (error || !resource) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }
          if ((resource as { current: number }).current < amount) {
            return yield* Effect.fail(
              new InsufficientResource({
                playerId,
                resourceType,
                required: amount,
                available: (resource as { current: number }).current,
              })
            )
          }
          yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .update({ current: (resource as { current: number }).current - amount })
              .eq("player_id", playerId)
              .eq("resource_type", resourceType)
          )
        }),

      gainResource: (playerId, resourceType, amount) =>
        Effect.gen(function* () {
          const { data: resource, error } = yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .select("current, maximum")
              .eq("player_id", playerId)
              .eq("resource_type", resourceType)
              .single()
          )
          if (error || !resource) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }
          const r = resource as { current: number; maximum: number | null }
          const newCurrent =
            r.maximum !== null
              ? Math.min(r.current + amount, r.maximum)
              : r.current + amount
          yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .update({ current: newCurrent })
              .eq("player_id", playerId)
              .eq("resource_type", resourceType)
          )
        }),

      gainXp: (playerId, xp) =>
        Effect.gen(function* () {
          const { data: player, error } = yield* Effect.promise(() =>
            supabase
              .from("players")
              .select("level, xp, xp_to_next")
              .eq("id", playerId)
              .single()
          )
          if (error || !player) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }
          const p = player as { level: number; xp: number; xp_to_next: number }
          let level = p.level
          let newXp = p.xp + xp
          let xpToNext = p.xp_to_next
          let leveled = false

          while (newXp >= xpToNext) {
            newXp -= xpToNext
            level += 1
            xpToNext = xpForNextLevel(level)
            leveled = true
          }

          yield* Effect.promise(() =>
            supabase
              .from("players")
              .update({ level, xp: newXp, xp_to_next: xpToNext })
              .eq("id", playerId)
          )

          return { leveled, newLevel: level }
        }),

      gainSkillXp: (playerId, skillId, xp) =>
        Effect.gen(function* () {
          const { data: skill, error } = yield* Effect.promise(() =>
            supabase
              .from("player_skills")
              .select("level, xp, xp_to_next")
              .eq("player_id", playerId)
              .eq("skill_id", skillId)
              .single()
          )
          if (error || !skill) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }
          const s = skill as { level: number; xp: number; xp_to_next: number }
          let level = s.level
          let newXp = s.xp + xp
          let xpToNext = s.xp_to_next
          let leveled = false

          while (newXp >= xpToNext) {
            newXp -= xpToNext
            level += 1
            xpToNext = skillXpForNextLevel(level)
            leveled = true
          }

          yield* Effect.promise(() =>
            supabase
              .from("player_skills")
              .update({ level, xp: newXp, xp_to_next: xpToNext })
              .eq("player_id", playerId)
              .eq("skill_id", skillId)
          )

          return { leveled, newLevel: level }
        }),
    }
  })
)
