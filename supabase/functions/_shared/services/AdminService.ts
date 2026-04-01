// AdminService for Edge Functions (Deno).
// Mirrors src/services/AdminService.ts — uses npm:effect@3 and direct supabase calls.

import { Context, Effect, Layer } from "npm:effect@3"
import { SupabaseClient } from "./SupabaseClient.ts"
import {
  DatabaseError,
  ItemNotFound,
  BugNotFound,
  TaskDefinitionNotFound,
  NotAuthorized,
  PlayerNotFound,
} from "./errors.ts"

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
    ) => Effect.Effect<Record<string, unknown>[], PlayerNotFound | NotAuthorized | DatabaseError>

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

    // ---- Helpers ----

    const checkExists = (playerId: string) =>
      Effect.gen(function* () {
        const { data, error } = yield* Effect.promise(() =>
          supabase.from("players").select("id, is_admin").eq("id", playerId).single()
        )
        if (error || !data) {
          return yield* Effect.fail(new PlayerNotFound({ playerId }))
        }
        return data as { id: string; is_admin: boolean }
      })

    const requireAdmin = (playerId: string) =>
      Effect.gen(function* () {
        const player = yield* checkExists(playerId)
        if (!player.is_admin) {
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
              .update(patches)
              .eq("id", itemDefId)
              .select("id")
              .single()
          )
          if (error || !data) {
            if ((error as { code?: string } | null)?.code === "PGRST116") {
              return yield* Effect.fail(new ItemNotFound({ itemDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string } | null)?.message ?? "Update failed",
                context: "updateItem",
              })
            )
          }
        }),

      updateBug: (adminId, bugDefId, patches) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("npc_definitions")
              .update(patches)
              .eq("id", bugDefId)
              .select("id")
              .single()
          )
          if (error || !data) {
            if ((error as { code?: string } | null)?.code === "PGRST116") {
              return yield* Effect.fail(new BugNotFound({ npcDefId: bugDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string } | null)?.message ?? "Update failed",
                context: "updateBug",
              })
            )
          }
        }),

      updateTask: (adminId, taskDefId, patches) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("task_definitions")
              .update(patches)
              .eq("id", taskDefId)
              .select("id")
              .single()
          )
          if (error || !data) {
            if ((error as { code?: string } | null)?.code === "PGRST116") {
              return yield* Effect.fail(new TaskDefinitionNotFound({ taskDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string } | null)?.message ?? "Update failed",
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
              .select(
                "id, username, display_name, level, is_admin, player_resources(resource_type, current, maximum)"
              )
              .order("level", { ascending: false })
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string }).message,
                context: "listPlayers",
              })
            )
          }
          return (data ?? []) as unknown as Record<string, unknown>[]
        }),

      grantAdmin: (adminId, targetId) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          yield* checkExists(targetId)
          const { error } = yield* Effect.promise(() =>
            supabase.from("players").update({ is_admin: true }).eq("id", targetId)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string }).message,
                context: "grantAdmin",
              })
            )
          }
        }),

      revokeAdmin: (adminId, targetId) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
          yield* checkExists(targetId)
          const { error } = yield* Effect.promise(() =>
            supabase.from("players").update({ is_admin: false }).eq("id", targetId)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string }).message,
                context: "revokeAdmin",
              })
            )
          }
        }),

      adjustResource: (adminId, targetId, resourceType, delta) =>
        Effect.gen(function* () {
          yield* requireAdmin(adminId)
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
          const r = resource as { current: number; maximum: number | null }
          const newCurrent =
            r.maximum !== null
              ? Math.max(0, Math.min(r.current + delta, r.maximum))
              : Math.max(0, r.current + delta)
          const { error } = yield* Effect.promise(() =>
            supabase
              .from("player_resources")
              .update({ current: newCurrent })
              .eq("player_id", targetId)
              .eq("resource_type", resourceType)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string }).message,
                context: "adjustResource",
              })
            )
          }
        }),
    }
  })
)
