// ItemRegistry for Edge Functions (Deno).
// Read-only queries for item, task, bug, and area definitions.

import { Context, Effect, Layer } from "npm:effect@3"
import { SupabaseClient } from "./SupabaseClient.ts"
import {
  AreaNotFound,
  BugNotFound,
  DatabaseError,
  ItemNotFound,
  TaskDefinitionNotFound,
} from "./errors.ts"

export class ItemRegistry extends Context.Tag("ItemRegistry")<
  ItemRegistry,
  {
    readonly getItem: (
      itemDefId: string
    ) => Effect.Effect<Record<string, unknown>, ItemNotFound | DatabaseError>

    readonly getTask: (
      taskDefId: string
    ) => Effect.Effect<Record<string, unknown>, TaskDefinitionNotFound | DatabaseError>

    readonly getBug: (
      npcDefId: string
    ) => Effect.Effect<Record<string, unknown>, BugNotFound | DatabaseError>

    readonly getArea: (
      areaId: string
    ) => Effect.Effect<Record<string, unknown>, AreaNotFound | DatabaseError>

    readonly getAllAreas: () => Effect.Effect<Record<string, unknown>[], DatabaseError>

    readonly getAreaSpawns: (
      areaId: string
    ) => Effect.Effect<Record<string, unknown>[], AreaNotFound | DatabaseError>
  }
>() {}

export const ItemRegistryLive = Layer.effect(
  ItemRegistry,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient

    return {
      getItem: (itemDefId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("item_definitions")
              .select("*")
              .eq("id", itemDefId)
              .single()
          )
          if (error || !data) {
            if ((error as { code?: string })?.code === "PGRST116") {
              return yield* Effect.fail(new ItemNotFound({ itemDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Unknown error",
                context: "getItem",
              })
            )
          }
          return data as Record<string, unknown>
        }),

      getTask: (taskDefId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("task_definitions")
              .select("*")
              .eq("id", taskDefId)
              .single()
          )
          if (error || !data) {
            if ((error as { code?: string })?.code === "PGRST116") {
              return yield* Effect.fail(new TaskDefinitionNotFound({ taskDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Unknown error",
                context: "getTask",
              })
            )
          }
          return data as Record<string, unknown>
        }),

      getBug: (npcDefId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("npc_definitions")
              .select("*")
              .eq("id", npcDefId)
              .single()
          )
          if (error || !data) {
            if ((error as { code?: string })?.code === "PGRST116") {
              return yield* Effect.fail(new BugNotFound({ npcDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Unknown error",
                context: "getBug",
              })
            )
          }
          return data as Record<string, unknown>
        }),

      getArea: (areaId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.from("npc_areas").select("*").eq("id", areaId).single()
          )
          if (error || !data) {
            if ((error as { code?: string })?.code === "PGRST116") {
              return yield* Effect.fail(new AreaNotFound({ areaId }))
            }
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Unknown error",
                context: "getArea",
              })
            )
          }
          return data as Record<string, unknown>
        }),

      getAllAreas: () =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.from("npc_areas").select("*")
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Unknown error",
                context: "getAllAreas",
              })
            )
          }
          return (data ?? []) as Record<string, unknown>[]
        }),

      getAreaSpawns: (areaId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("npc_area_spawns")
              .select("area_id, npc_def_id, spawn_weight")
              .eq("area_id", areaId)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Unknown error",
                context: "getAreaSpawns",
              })
            )
          }
          if (!data || data.length === 0) {
            return yield* Effect.fail(new AreaNotFound({ areaId }))
          }
          return data as Record<string, unknown>[]
        }),
    }
  })
)
