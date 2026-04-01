// attempt-task Edge Function
// Spends Focus, rolls for success, and distributes rewards (credits, XP, skill XP, gems).
// Logs the attempt to task_logs regardless of outcome.

import { Effect } from "npm:effect@3"
import { authenticate } from "../_shared/auth.ts"
import { handleCors, error } from "../_shared/respond.ts"
import { runEffect } from "../_shared/effect-runner.ts"
import { AppLayer } from "../_shared/app-layer.ts"
import { TaskService } from "../_shared/services/TaskService.ts"

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let playerId: string
  try {
    playerId = await authenticate(req)
  } catch {
    return error("Unauthorized", 401)
  }

  let body: { taskDefId?: string }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { taskDefId } = body
  if (!taskDefId || typeof taskDefId !== "string") {
    return error("taskDefId is required", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const taskSvc = yield* TaskService
      const result = yield* taskSvc.attemptTask(playerId, taskDefId)
      return {
        outcome: result.outcome,
        rewardsGiven: result.rewardsGiven,
      }
    }),
    AppLayer
  )
})
