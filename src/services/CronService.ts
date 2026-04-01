// CronService — programmatic access to scheduled maintenance jobs.
// The actual cron scheduling lives in migration 009 (pg_cron).
// This service provides manual triggers for admin tooling and E2E testing.

import { Context, Effect, Layer } from "effect"
import { SupabaseClient } from "./SupabaseClient"
import { DatabaseError, PlayerNotFound } from "./errors"

export class CronService extends Context.Tag("CronService")<
  CronService,
  {
    // Replenish focus for all players — same logic as the pg_cron job
    readonly replenishAll: () => Effect.Effect<void, DatabaseError>

    // Replenish focus for a single player — useful for admin tools and testing
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
            supabase.rpc("replenish_all_focus")
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "replenishAll" })
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            supabase.rpc("replenish_player_focus" as any, { p_player_id: playerId })
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "replenishPlayer" })
            )
          }
        }),
    }
  })
)
