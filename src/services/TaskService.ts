// TaskService — developer task attempts, focus costs, randomised rewards.
// Depends on: ItemRegistry (task definitions), PlayerService (resources/XP),
//             InventoryService (gem rewards).

import { Context, Effect, Layer } from "effect"
import { SupabaseClient } from "./SupabaseClient"
import { ItemRegistry } from "./ItemRegistry"
import { PlayerService } from "./PlayerService"
import { InventoryService } from "./InventoryService"
import {
  DatabaseError,
  InsufficientResource,
  LevelRequirementNotMet,
  PlayerNotFound,
  TaskDefinitionNotFound,
} from "./errors"

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

          if (profile.player.level < task.level_required) {
            return yield* Effect.fail(
              new LevelRequirementNotMet({
                required: task.level_required,
                current: profile.player.level,
              })
            )
          }

          // Deduct focus (spendResource validates sufficiency)
          yield* playerSvc.spendResource(playerId, "focus", task.focus_cost)

          const success = Math.random() <= task.success_rate
          const outcome: "success" | "failure" = success ? "success" : "failure"
          const rewardsGiven: TaskAttemptResult["rewardsGiven"] = {}

          if (success) {
            const rewards = task.rewards as {
              credits?: [number, number]
              xp?: number
              skill_xp?: number
            }

            if (rewards.credits) {
              const [min, max] = rewards.credits
              const creditsEarned = Math.floor(Math.random() * (max - min + 1)) + min
              yield* playerSvc.gainResource(playerId, "credits", creditsEarned)
              rewardsGiven.credits = creditsEarned
            }

            if (rewards.xp) {
              yield* playerSvc.gainXp(playerId, rewards.xp)
              rewardsGiven.xp = rewards.xp
            }

            if (rewards.skill_xp) {
              yield* playerSvc.gainSkillXp(playerId, task.skill_id, rewards.skill_xp)
              rewardsGiven.skillXp = rewards.skill_xp
            }

            if (task.gem_rewards) {
              const gemRewards = task.gem_rewards as Array<{
                gem_def_id: string
                chance: number
              }>
              const wonGems: string[] = []
              for (const gemReward of gemRewards) {
                if (Math.random() <= gemReward.chance) {
                  yield* inventorySvc.addItem(playerId, gemReward.gem_def_id)
                  wonGems.push(gemReward.gem_def_id)
                }
              }
              if (wonGems.length > 0) {
                rewardsGiven.gems = wonGems
              }
            }
          } else {
            // Failure: award consolation XP if penalty defined
            if (task.failure_penalty) {
              const penalty = task.failure_penalty as { credits?: number; xp?: number }
              if (penalty.xp) {
                yield* playerSvc.gainXp(playerId, penalty.xp)
                rewardsGiven.xp = penalty.xp
              }
            }
          }

          // Log the attempt
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
