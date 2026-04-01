// AdminService — admin-gated CRUD for game content and player management.
// Every method calls requireAdmin first; non-admin callers get NotAuthorized.

import { Context, Effect, Layer } from "effect"
import type { Database } from "../lib/supabase/types"
import { SupabaseClient } from "./SupabaseClient"
import { PlayerService } from "./PlayerService"
import {
  DatabaseError,
  ItemNotFound,
  BugNotFound,
  TaskDefinitionNotFound,
  NotAuthorized,
  PlayerNotFound,
} from "./errors"

type Player = Database["public"]["Tables"]["players"]["Row"]
type PlayerResource = Database["public"]["Tables"]["player_resources"]["Row"]

export interface PlayerSummary {
  readonly id: string
  readonly username: string
  readonly display_name: string
  readonly level: number
  readonly is_admin: boolean
  readonly resources: Array<Pick<PlayerResource, "resource_type" | "current" | "maximum">>
}

export interface ItemPatch {
  readonly name?: string
  readonly description?: string
  readonly base_stats?: Record<string, number>
  readonly base_value?: number
  readonly level_required?: number
  readonly gem_slot_count?: number
}

export interface BugPatch {
  readonly name?: string
  readonly description?: string
  readonly level?: number
  readonly stats?: Record<string, number>
  readonly xp_reward?: number
  readonly uptime?: number
}

export interface TaskPatch {
  readonly name?: string
  readonly description?: string
  readonly level_required?: number
  readonly focus_cost?: number
  readonly success_rate?: number
  readonly rewards?: Record<string, unknown>
}

export class AdminService extends Context.Tag("AdminService")<
  AdminService,
  {
    readonly requireAdmin: (
      playerId: string
    ) => Effect.Effect<void, PlayerNotFound | NotAuthorized | DatabaseError>

    readonly updateItem: (
      adminId: string,
      itemDefId: string,
      patches: ItemPatch
    ) => Effect.Effect<void, PlayerNotFound | NotAuthorized | ItemNotFound | DatabaseError>

    readonly updateBug: (
      adminId: string,
      bugDefId: string,
      patches: BugPatch
    ) => Effect.Effect<void, PlayerNotFound | NotAuthorized | BugNotFound | DatabaseError>

    readonly updateTask: (
      adminId: string,
      taskDefId: string,
      patches: TaskPatch
    ) => Effect.Effect<
      void,
      PlayerNotFound | NotAuthorized | TaskDefinitionNotFound | DatabaseError
    >

    readonly listPlayers: (
      adminId: string
    ) => Effect.Effect<PlayerSummary[], PlayerNotFound | NotAuthorized | DatabaseError>

    readonly grantAdmin: (
      adminId: string,
      targetId: string
    ) => Effect.Effect<void, PlayerNotFound | NotAuthorized | DatabaseError>

    readonly revokeAdmin: (
      adminId: string,
      targetId: string
    ) => Effect.Effect<void, PlayerNotFound | NotAuthorized | DatabaseError>

    readonly adjustResource: (
      adminId: string,
      targetId: string,
      resourceType: string,
      delta: number
    ) => Effect.Effect<void, PlayerNotFound | NotAuthorized | DatabaseError>
  }
>() {}

export const AdminServiceLive = Layer.effect(
  AdminService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient
    const playerSvc = yield* PlayerService

    const requireAdmin = (playerId: string) =>
      Effect.gen(function* () {
        const profile = yield* playerSvc.getProfile(playerId)
        if (!profile.player.is_admin) {
          return yield* Effect.fail(new NotAuthorized({ playerId }))
        }
      })

    return {
      requireAdmin,

      updateItem: (adminId, itemDefId, patches) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("item_definitions")
              .update(patches as Record<string, unknown>)
              .eq("id", itemDefId)
              .select("id")
              .single()
          )
          if (error || !data) {
            if (error?.code === "PGRST116") {
              return yield* Effect.fail(new ItemNotFound({ itemDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: error?.message ?? "Update failed", context: "updateItem" })
            )
          }
        }),

      updateBug: (adminId, bugDefId, patches) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("npc_definitions")
              .update(patches as Record<string, unknown>)
              .eq("id", bugDefId)
              .select("id")
              .single()
          )
          if (error || !data) {
            if (error?.code === "PGRST116") {
              return yield* Effect.fail(new BugNotFound({ npcDefId: bugDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: error?.message ?? "Update failed", context: "updateBug" })
            )
          }
        }),

      updateTask: (adminId, taskDefId, patches) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("task_definitions")
              .update(patches as Record<string, unknown>)
              .eq("id", taskDefId)
              .select("id")
              .single()
          )
          if (error || !data) {
            if (error?.code === "PGRST116") {
              return yield* Effect.fail(new TaskDefinitionNotFound({ taskDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({
                message: error?.message ?? "Update failed",
                context: "updateTask",
              })
            )
          }
        }),

      listPlayers: (adminId) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("players")
              .select("id, username, display_name, level, is_admin, player_resources(resource_type, current, maximum)")
              .order("level", { ascending: false })
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "listPlayers" })
            )
          }
          return (data ?? []).map((p) => ({
            id: p.id,
            username: p.username,
            display_name: p.display_name,
            level: p.level,
            is_admin: p.is_admin,
            resources: (p.player_resources as PlayerResource[]) ?? [],
          }))
        }),

      grantAdmin: (adminId, targetId) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          // Verify target exists
          yield* playerSvc.getProfile(targetId)
          const { error } = yield* Effect.promise(() =>
            supabase.from("players").update({ is_admin: true }).eq("id", targetId)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "grantAdmin" })
            )
          }
        }),

      revokeAdmin: (adminId, targetId) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          yield* playerSvc.getProfile(targetId)
          const { error } = yield* Effect.promise(() =>
            supabase.from("players").update({ is_admin: false }).eq("id", targetId)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "revokeAdmin" })
            )
          }
        }),

      adjustResource: (adminId, targetId, resourceType, delta) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          // Verify target player exists
          const { data: resource, error: fetchError } = yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .select("current, maximum")
              .eq("player_id", targetId)
              .eq("resource_type", resourceType)
              .single()
          )
          if (fetchError || !resource) {
            return yield* Effect.fail(new PlayerNotFound({ playerId: targetId }))
          }
          const newCurrent =
            resource.maximum !== null
              ? Math.max(0, Math.min(resource.current + delta, resource.maximum))
              : Math.max(0, resource.current + delta)
          const { error } = yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .update({ current: newCurrent })
              .eq("player_id", targetId)
              .eq("resource_type", resourceType)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "adjustResource" })
            )
          }
        }),
    }
  })
)
