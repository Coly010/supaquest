// ChatService for Edge Functions (Deno).
// Mirrors src/services/ChatService.ts with Deno-compatible imports.

import { Context, Effect, Layer } from "npm:effect@3"
import { SupabaseClient } from "./SupabaseClient.ts"
import { DatabaseError, InvalidChannel, MessageTooLong } from "./errors.ts"

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
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Unknown error",
                context: "getMessages",
              })
            )
          }
          return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
            id: row["id"] as string,
            channel: row["channel"] as string,
            content: row["content"] as string,
            createdAt: row["created_at"] as string,
            senderId: row["sender_id"] as string,
            senderDisplayName:
              ((row["sender"] as { display_name?: string } | null)?.display_name) ?? "Unknown",
          }))
        }),

      sendMessage: (playerId, channel, content) =>
        Effect.gen(function* () {
          if (content.length === 0 || content.length > MAX_MESSAGE_LENGTH) {
            return yield* Effect.fail(
              new MessageTooLong({ maxLength: MAX_MESSAGE_LENGTH, actualLength: content.length })
            )
          }

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
              new DatabaseError({
                message: (error as { message?: string })?.message ?? "Insert failed",
                context: "sendMessage",
              })
            )
          }
          return { messageId: (data as { id: string }).id }
        }),
    }
  })
)
