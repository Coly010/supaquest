// TaskService for Edge Functions (Deno).
// Handles task attempts: focus cost, success roll, rewards, logging.

import { Context, Effect, Layer } from "npm:effect@3"
import { SupabaseClient } from "./SupabaseClient.ts"
import { ItemRegistry } from "./ItemRegistry.ts"
import { PlayerService } from "./PlayerService.ts"
import { InventoryService } from "./InventoryService.ts"
import {
  DatabaseError,
  InsufficientResource,
  LevelRequirementNotMet,
  PlayerNotFound,
  TaskDefinitionNotFound,
} from "./errors.ts"

export interface TaskAttemptResult {
  readonly outcome: "success" | "failure"
  readonly rewardsGiven: {
    readonly credits?: number
    readonly xp?: number
    readonly skillXp?: number
    readonly gems?: string[]
  }
}

export class TaskService extends Context.Tag("TaskService")<
  TaskService,
  {
    readonly attemptTask: (
      playerId: string,
      taskDefId: string
    ) => Effect.Effect<
      TaskAttemptResult,
      | TaskDefinitionNotFound
      | PlayerNotFound
      | InsufficientResource
      | LevelRequirementNotMet
      | DatabaseError
    >
  }
>() {}

export const TaskServiceLive = Layer.effect(
  TaskService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient
    const registry = yield* ItemRegistry
    const playerSvc = yield* PlayerService
    const inventorySvc = yield* InventoryService

    return {
      attemptTask: (playerId, taskDefId) =>
        Effect.gen(function* () {
          const task = yield* registry.getTask(taskDefId)
          const profile = yield* playerSvc.getProfile(playerId)
          const playerLevel = (profile as Record<string, unknown>)["level"] as number

          const levelRequired = task["level_required"] as number
          if (playerLevel < levelRequired) {
            return yield* Effect.fail(
              new LevelRequirementNotMet({ required: levelRequired, current: playerLevel })
            )
          }

          const focusCost = task["focus_cost"] as number
          yield* playerSvc.spendResource(playerId, "focus", focusCost)

          const successRate = task["success_rate"] as number
          const success = Math.random() <= successRate
          const outcome: "success" | "failure" = success ? "success" : "failure"
          const rewardsGiven: TaskAttemptResult["rewardsGiven"] = {}

          if (success) {
            const rewards = task["rewards"] as {
              credits?: [number, number]
              xp?: number
              skill_xp?: number
            }

            if (rewards.credits) {
              const [min, max] = rewards.credits
              const creditsEarned = Math.floor(Math.random() * (max - min + 1)) + min
              yield* playerSvc.gainResource(playerId, "credits", creditsEarned)
              ;(rewardsGiven as Record<string, unknown>)["credits"] = creditsEarned
            }

            if (rewards.xp) {
              yield* playerSvc.gainXp(playerId, rewards.xp)
              ;(rewardsGiven as Record<string, unknown>)["xp"] = rewards.xp
            }

            if (rewards.skill_xp) {
              const skillId = task["skill_id"] as string
              yield* playerSvc.gainSkillXp(playerId, skillId, rewards.skill_xp)
              ;(rewardsGiven as Record<string, unknown>)["skillXp"] = rewards.skill_xp
            }

            const gemRewardsRaw = task["gem_rewards"]
            if (gemRewardsRaw) {
              const gemRewards = gemRewardsRaw as Array<{ gem_def_id: string; chance: number }>
              const wonGems: string[] = []
              for (const gr of gemRewards) {
                if (Math.random() <= gr.chance) {
                  yield* inventorySvc.addItem(playerId, gr.gem_def_id)
                  wonGems.push(gr.gem_def_id)
                }
              }
              if (wonGems.length > 0) {
                ;(rewardsGiven as Record<string, unknown>)["gems"] = wonGems
              }
            }
          } else {
            const penaltyRaw = task["failure_penalty"]
            if (penaltyRaw) {
              const penalty = penaltyRaw as { credits?: number; xp?: number }
              if (penalty.xp) {
                yield* playerSvc.gainXp(playerId, penalty.xp)
                ;(rewardsGiven as Record<string, unknown>)["xp"] = penalty.xp
              }
            }
          }

          yield* Effect.promise(() =>
            supabase.from("task_logs").insert({
              player_id: playerId,
              task_def_id: taskDefId,
              outcome,
              rewards_given: rewardsGiven,
            })
          )

          return { outcome, rewardsGiven }
        }),
    }
  })
)
