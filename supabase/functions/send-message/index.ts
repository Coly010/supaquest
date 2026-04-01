// send-message — insert a chat message into the given channel.
// Validates channel format and content length before writing.

import { Effect } from "npm:effect@3"
import { AppLayer } from "../_shared/app-layer.ts"
import { runEffect } from "../_shared/effect-runner.ts"
import { authenticate } from "../_shared/auth.ts"
import { handleCors, error } from "../_shared/respond.ts"
import { ChatService } from "../_shared/services/ChatService.ts"

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  let playerId: string
  try {
    playerId = await authenticate(req)
  } catch {
    return error("Unauthorized", 401)
  }

  let body: { channel?: string; content?: string }
  try {
    body = await req.json()
  } catch {
    return error("Invalid JSON body", 400)
  }

  const { channel, content } = body
  if (!channel || typeof channel !== "string") {
    return error("channel is required", 400)
  }
  if (!content || typeof content !== "string") {
    return error("content is required", 400)
  }

  return runEffect(
    Effect.gen(function* () {
      const chat = yield* ChatService
      return yield* chat.sendMessage(playerId, channel, content)
    }),
    AppLayer
  )
})
