// ItemRegistry service — read-only queries for items, gems, bugs, tasks.
// No dependencies: implement first. All other services that need registry data depend on this.

import { Context, Effect, Layer } from "effect"
import type { Database } from "../lib/supabase/types"
import { SupabaseClient } from "./SupabaseClient"
import {
  AreaNotFound,
  BugNotFound,
  DatabaseError,
  GemNotFound,
  ItemNotFound,
  TaskDefinitionNotFound,
} from "./errors"

type ItemDefinition = Database["public"]["Tables"]["item_definitions"]["Row"]
type GemDefinition = Database["public"]["Tables"]["gem_definitions"]["Row"]
type NpcDefinition = Database["public"]["Tables"]["npc_definitions"]["Row"]
type NpcArea = Database["public"]["Tables"]["npc_areas"]["Row"]
type NpcAreaSpawn = Database["public"]["Tables"]["npc_area_spawns"]["Row"]
type TaskDefinition = Database["public"]["Tables"]["task_definitions"]["Row"]

export class ItemRegistry extends Context.Tag("ItemRegistry")<
  ItemRegistry,
  {
    readonly getItem: (
      itemDefId: string
    ) => Effect.Effect<ItemDefinition, ItemNotFound | DatabaseError>

    readonly getAllItems: () => Effect.Effect<ItemDefinition[], DatabaseError>

    readonly getGem: (
      gemDefId: string
    ) => Effect.Effect<GemDefinition, GemNotFound | DatabaseError>

    readonly getAllGems: () => Effect.Effect<GemDefinition[], DatabaseError>

    readonly getBug: (
      npcDefId: string
    ) => Effect.Effect<NpcDefinition, BugNotFound | DatabaseError>

    readonly getArea: (
      areaId: string
    ) => Effect.Effect<NpcArea, AreaNotFound | DatabaseError>

    readonly getAllAreas: () => Effect.Effect<NpcArea[], DatabaseError>

    readonly getAreaSpawns: (
      areaId: string
    ) => Effect.Effect<(NpcAreaSpawn & { npc: NpcDefinition })[], AreaNotFound | DatabaseError>

    readonly getTask: (
      taskDefId: string
    ) => Effect.Effect<TaskDefinition, TaskDefinitionNotFound | DatabaseError>

    readonly getAllTasks: (
      skillId?: string
    ) => Effect.Effect<TaskDefinition[], DatabaseError>
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
            if (error?.code === "PGRST116") {
              return yield* Effect.fail(new ItemNotFound({ itemDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: error?.message ?? "Unknown error", context: "getItem" })
            )
          }
          return data
        }),

      getAllItems: () =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.from("item_definitions").select("*").order("level_required")
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "getAllItems" })
            )
          }
          return data ?? []
        }),

      getGem: (gemDefId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("gem_definitions")
              .select("*")
              .eq("id", gemDefId)
              .single()
          )
          if (error || !data) {
            if (error?.code === "PGRST116") {
              return yield* Effect.fail(new GemNotFound({ gemDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: error?.message ?? "Unknown error", context: "getGem" })
            )
          }
          return data
        }),

      getAllGems: () =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.from("gem_definitions").select("*").order("tier")
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "getAllGems" })
            )
          }
          return data ?? []
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
            if (error?.code === "PGRST116") {
              return yield* Effect.fail(new BugNotFound({ npcDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: error?.message ?? "Unknown error", context: "getBug" })
            )
          }
          return data
        }),

      getArea: (areaId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.from("npc_areas").select("*").eq("id", areaId).single()
          )
          if (error || !data) {
            if (error?.code === "PGRST116") {
              return yield* Effect.fail(new AreaNotFound({ areaId }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: error?.message ?? "Unknown error", context: "getArea" })
            )
          }
          return data
        }),

      getAllAreas: () =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.from("npc_areas").select("*")
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "getAllAreas" })
            )
          }
          return data ?? []
        }),

      getAreaSpawns: (areaId) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("npc_area_spawns")
              .select("*, npc:npc_definitions(*)")
              .eq("area_id", areaId)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "getAreaSpawns" })
            )
          }
          if (!data || data.length === 0) {
            return yield* Effect.fail(new AreaNotFound({ areaId }))
          }
          return data as (NpcAreaSpawn & { npc: NpcDefinition })[]
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
            if (error?.code === "PGRST116") {
              return yield* Effect.fail(new TaskDefinitionNotFound({ taskDefId }))
            }
            return yield* Effect.fail(
              new DatabaseError({ message: error?.message ?? "Unknown error", context: "getTask" })
            )
          }
          return data
        }),

      getAllTasks: (skillId) =>
        Effect.gen(function* () {
          const query = supabase
            .from("task_definitions")
            .select("*")
            .order("level_required")

          const { data, error } = yield* Effect.promise(() =>
            skillId ? query.eq("skill_id", skillId) : query
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "getAllTasks" })
            )
          }
          return data ?? []
        }),
    }
  })
)
