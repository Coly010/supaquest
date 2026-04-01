// PlayerService — profile, stats, resources, skills, admin flag, XP/level management.
// Most depended-upon service — implement and test first.

import { Context, Effect, Layer } from "effect"
import type { Database } from "../lib/supabase/types"
import { SupabaseClient } from "./SupabaseClient"
import {
  DatabaseError,
  InsufficientResource,
  PlayerNotFound,
  UsernameTaken,
} from "./errors"
import {
  calculateEffectiveStats,
  type BaseStats,
  type EffectiveStats,
} from "./StatsCalculator"

type Player = Database["public"]["Tables"]["players"]["Row"]
type PlayerStats = Database["public"]["Tables"]["player_stats"]["Row"]
type PlayerSkill = Database["public"]["Tables"]["player_skills"]["Row"]
type PlayerResource = Database["public"]["Tables"]["player_resources"]["Row"]

export interface PlayerProfile {
  readonly player: Player
  readonly stats: PlayerStats
  readonly skills: PlayerSkill[]
  readonly resources: PlayerResource[]
}

// XP required to reach the next level — scales with level
const xpForNextLevel = (level: number): number => Math.floor(100 * Math.pow(1.5, level - 1))

// XP required for skill level-up
const skillXpForNextLevel = (level: number): number => Math.floor(50 * Math.pow(1.4, level - 1))

export class PlayerService extends Context.Tag("PlayerService")<
  PlayerService,
  {
    readonly createProfile: (
      userId: string,
      username: string,
      displayName: string
    ) => Effect.Effect<Player, UsernameTaken | DatabaseError>

    readonly getProfile: (
      playerId: string
    ) => Effect.Effect<PlayerProfile, PlayerNotFound | DatabaseError>

    readonly getEffectiveStats: (
      playerId: string
    ) => Effect.Effect<EffectiveStats, PlayerNotFound | DatabaseError>

    readonly getResource: (
      playerId: string,
      resourceType: string
    ) => Effect.Effect<PlayerResource, PlayerNotFound | DatabaseError>

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

    readonly setAdmin: (
      playerId: string,
      isAdmin: boolean
    ) => Effect.Effect<void, PlayerNotFound | DatabaseError>
  }
>() {}

export const PlayerServiceLive = Layer.effect(
  PlayerService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient

    const getPlayer = (playerId: string) =>
      Effect.gen(function* () {
        const { data, error } = yield* Effect.promise(() =>
          supabase.from("players").select("*").eq("id", playerId).single()
        )
        if (error || !data) {
          return yield* Effect.fail(new PlayerNotFound({ playerId }))
        }
        return data
      })

    return {
      createProfile: (userId, username, displayName) =>
        Effect.gen(function* () {
          // Check username availability
          const { data: existing } = yield* Effect.promise(() =>
            supabase.from("players").select("id").eq("username", username).maybeSingle()
          )
          if (existing) {
            return yield* Effect.fail(new UsernameTaken({ username }))
          }

          // Insert player
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

          // Insert player_stats (defaults)
          yield* Effect.promise(() =>
            supabase.from("player_stats").insert({ player_id: userId })
          )

          // Insert player_skills (one row per skill)
          yield* Effect.promise(() =>
            supabase.from("player_skills").insert([
              { player_id: userId, skill_id: "debugging" },
              { player_id: userId, skill_id: "data_mining" },
              { player_id: userId, skill_id: "architecture" },
            ])
          )

          // Insert player_resources
          yield* Effect.promise(() =>
            supabase.from("player_resources").insert([
              { player_id: userId, resource_type: "focus", current: 100, maximum: 100 },
              { player_id: userId, resource_type: "uptime", current: 100, maximum: 100 },
              { player_id: userId, resource_type: "credits", current: 50, maximum: null },
            ])
          )

          return player
        }),

      getProfile: (playerId) =>
        Effect.gen(function* () {
          const [playerRes, statsRes, skillsRes, resourcesRes] = yield* Effect.all(
            [
              Effect.promise(() =>
                supabase.from("players").select("*").eq("id", playerId).single()
              ),
              Effect.promise(() =>
                supabase.from("player_stats").select("*").eq("player_id", playerId).single()
              ),
              Effect.promise(() =>
                supabase.from("player_skills").select("*").eq("player_id", playerId)
              ),
              Effect.promise(() =>
                supabase.from("player_resources").select("*").eq("player_id", playerId)
              ),
            ],
            { concurrency: 4 }
          )

          if (playerRes.error || !playerRes.data) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }
          if (statsRes.error || !statsRes.data) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }

          return {
            player: playerRes.data,
            stats: statsRes.data,
            skills: skillsRes.data ?? [],
            resources: resourcesRes.data ?? [],
          }
        }),

      getEffectiveStats: (playerId) =>
        Effect.gen(function* () {
          // Fetch base stats
          const { data: stats, error: statsError } = yield* Effect.promise(() =>
            supabase.from("player_stats").select("*").eq("player_id", playerId).single()
          )
          if (statsError || !stats) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }

          // Fetch equipped items with their base_stats
          const { data: equipped } = yield* Effect.promise(() =>
            supabase
              .from("player_inventory")
              .select("id, item_def_id, item:item_definitions(base_stats)")
              .eq("player_id", playerId)
              .eq("is_equipped", true)
          )

          const base: BaseStats = {
            logic: stats.logic,
            resilience: stats.resilience,
            throughput: stats.throughput,
            serendipity: stats.serendipity,
            maxUptime: stats.max_uptime,
          }

          const equippedItems = (equipped ?? []).map((e) => ({
            baseStats: (e.item as { base_stats: Record<string, number> } | null)?.base_stats ?? {},
          }))

          // Fetch socketed gems for those equipped items
          const inventoryIds = (equipped ?? []).map((e) => e.id)
          if (inventoryIds.length === 0) {
            return calculateEffectiveStats(base, equippedItems, [])
          }

          const { data: gems } = yield* Effect.promise(() =>
            supabase
              .from("inventory_gems")
              .select("gem_def_id, gem:gem_definitions(stat_bonus)")
              .in("inventory_id", inventoryIds)
          )

          const socketedGems = (gems ?? []).map((g) => ({
            statBonus: (g.gem as { stat_bonus: Record<string, number> } | null)?.stat_bonus ?? {},
          }))

          return calculateEffectiveStats(base, equippedItems, socketedGems)
        }),

      getResource: (playerId, resourceType) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .select("*")
              .eq("player_id", playerId)
              .eq("resource_type", resourceType)
              .single()
          )
          if (error || !data) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }
          return data
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
          if (resource.current < amount) {
            return yield* Effect.fail(
              new InsufficientResource({
                playerId,
                resourceType,
                required: amount,
                available: resource.current,
              })
            )
          }
          const { error: updateError } = yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .update({ current: resource.current - amount })
              .eq("player_id", playerId)
              .eq("resource_type", resourceType)
          )
          if (updateError) {
            return yield* Effect.fail(
              new DatabaseError({ message: updateError.message, context: "spendResource" })
            )
          }
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
          const newCurrent =
            resource.maximum !== null
              ? Math.min(resource.current + amount, resource.maximum)
              : resource.current + amount

          const { error: updateError } = yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .update({ current: newCurrent })
              .eq("player_id", playerId)
              .eq("resource_type", resourceType)
          )
          if (updateError) {
            return yield* Effect.fail(
              new DatabaseError({ message: updateError.message, context: "gainResource" })
            )
          }
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

          let { level } = player
          let newXp = player.xp + xp
          let xpToNext = player.xp_to_next
          let leveled = false

          while (newXp >= xpToNext) {
            newXp -= xpToNext
            level += 1
            xpToNext = xpForNextLevel(level)
            leveled = true
          }

          const { error: updateError } = yield* Effect.promise(() =>
            supabase
              .from("players")
              .update({ level, xp: newXp, xp_to_next: xpToNext })
              .eq("id", playerId)
          )
          if (updateError) {
            return yield* Effect.fail(
              new DatabaseError({ message: updateError.message, context: "gainXp" })
            )
          }
          // If leveled up, also increase max_uptime by 10
          if (leveled) {
            const { data: currentStats } = yield* Effect.promise(() =>
              supabase
                .from("player_stats")
                .select("max_uptime")
                .eq("player_id", playerId)
                .single()
            )
            if (currentStats) {
              yield* Effect.promise(() =>
                supabase
                  .from("player_stats")
                  .update({ max_uptime: currentStats.max_uptime + 10 })
                  .eq("player_id", playerId)
              )
            }
          }

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

          let { level } = skill
          let newXp = skill.xp + xp
          let xpToNext = skill.xp_to_next
          let leveled = false

          while (newXp >= xpToNext) {
            newXp -= xpToNext
            level += 1
            xpToNext = skillXpForNextLevel(level)
            leveled = true
          }

          const { error: updateError } = yield* Effect.promise(() =>
            supabase
              .from("player_skills")
              .update({ level, xp: newXp, xp_to_next: xpToNext })
              .eq("player_id", playerId)
              .eq("skill_id", skillId)
          )
          if (updateError) {
            return yield* Effect.fail(
              new DatabaseError({ message: updateError.message, context: "gainSkillXp" })
            )
          }

          return { leveled, newLevel: level }
        }),

      setAdmin: (playerId, isAdmin) =>
        Effect.gen(function* () {
          const { error } = yield* Effect.promise(() =>
            supabase
              .from("players")
              .update({ is_admin: isAdmin })
              .eq("id", playerId)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "setAdmin" })
            )
          }
        }),
    }
  })
)
