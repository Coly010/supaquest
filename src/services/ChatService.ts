// ChatService — message storage for the in-game chat system.
// Realtime subscriptions are handled client-side; this service covers server-side reads and writes.
//
// Channel format:
//   "general"               — global chat visible to all players
//   "environment:{area_id}" — area-specific chat
//   "dm:{id1}_{id2}"        — direct message (ids sorted alphabetically)

import { Context, Effect, Layer } from "effect"
import type { Database } from "../lib/supabase/types"
import { SupabaseClient } from "./SupabaseClient"
import { DatabaseError, InvalidChannel, MessageTooLong } from "./errors"

type ChatMessageRow = Database["public"]["Tables"]["chat_messages"]["Row"]

const MAX_MESSAGE_LENGTH = 280
const CHANNEL_RE = /^(general|environment:[a-z_]+|dm:[a-z0-9_-]+)$/

export interface MessageWithSender {
  readonly id: string
  readonly channel: string
  readonly content: string
  readonly createdAt: string
  readonly senderId: string
  readonly senderDisplayName: string
}

export class ChatService extends Context.Tag("ChatService")<
  ChatService,
  {
    readonly getMessages: (
      channel: string,
      limit?: number
    ) => Effect.Effect<MessageWithSender[], DatabaseError>

    readonly sendMessage: (
      playerId: string,
      channel: string,
      content: string
    ) => Effect.Effect<{ messageId: string }, MessageTooLong | InvalidChannel | DatabaseError>
  }
>() {}

export const ChatServiceLive = Layer.effect(
  ChatService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient

    return {
      getMessages: (channel, limit = 50) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("chat_messages")
              .select("*, sender:players!sender_id(display_name)")
              .eq("channel", channel)
              .order("created_at", { ascending: true })
              .limit(limit)
          )
          if (error) {
            return yield* Effect.fail(
              new DatabaseError({ message: error.message, context: "getMessages" })
            )
          }
          return (data ?? []).map((row) => {
            const r = row as ChatMessageRow & {
              sender: { display_name: string } | null
            }
            return {
              id: r.id,
              channel: r.channel,
              content: r.content,
              createdAt: r.created_at,
              senderId: r.sender_id,
              senderDisplayName: r.sender?.display_name ?? "Unknown",
            }
          })
        }),

      sendMessage: (playerId, channel, content) =>
        Effect.gen(function* () {
          // Validate content length
          if (content.length === 0 || content.length > MAX_MESSAGE_LENGTH) {
            return yield* Effect.fail(
              new MessageTooLong({ maxLength: MAX_MESSAGE_LENGTH, actualLength: content.length })
            )
          }

          // Validate channel format
          if (!CHANNEL_RE.test(channel)) {
            return yield* Effect.fail(new InvalidChannel({ channel }))
          }

          const { data, error } = yield* Effect.promise(() =>
            supabase
              .from("chat_messages")
              .insert({ channel, sender_id: playerId, content })
              .select("id")
              .single()
          )
          if (error || !data) {
            return yield* Effect.fail(
              new DatabaseError({ message: error?.message ?? "Insert failed", context: "sendMessage" })
            )
          }
          return { messageId: data.id }
        }),
    }
  })
)
