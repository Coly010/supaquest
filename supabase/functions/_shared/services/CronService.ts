// CronService for Edge Functions (Deno).
// Mirrors src/services/CronService.ts with Deno-compatible imports.

import { Context, Effect, Layer } from "npm:effect@3"
import { SupabaseClient } from "./SupabaseClient.ts"
import { DatabaseError, PlayerNotFound } from "./errors.ts"

export class CronService extends Context.Tag("CronService")<
  CronService,
  {
    readonly replenishAll: () => Effect.Effect<void, DatabaseError>
    readonly replenishPlayer: (
      playerId: string
    ) => Effect.Effect<void, PlayerNotFound | DatabaseError>
  }
>() {}

export const CronServiceLive = Layer.effect(
  CronService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient

    return {
      replenishAll: () =>
        Effect.gen(function* () {
          const { error } = yield* Effect.promise(() =>
            // deno-lint-ignore no-explicit-any
            (supabase as any).rpc("replenish_all_focus")
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Unknown error",
                context: "replenishAll",
              })
            )
          }
        }),

      replenishPlayer: (playerId) =>
        Effect.gen(function* () {
          const { data: player } = yield* Effect.promise(() =>
            supabase.from("players").select("id").eq("id", playerId).maybeSingle()
          )
          if (!player) {
            return yield* Effect.fail(new PlayerNotFound({ playerId }))
          }

          const { error } = yield* Effect.promise(() =>
            // deno-lint-ignore no-explicit-any
            (supabase as any).rpc("replenish_player_focus", { p_player_id: playerId })
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Unknown error",
                context: "replenishPlayer",
              })
            )
          }
        }),
    }
  })
)
