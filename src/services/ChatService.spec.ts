// Unit tests for ChatService validation logic.
// These test the pure validation rules without a database connection.

import { describe, it, expect } from "vitest"
import { Effect, Layer } from "effect"
import { ChatService, ChatServiceLive } from "./ChatService"
import { SupabaseClient } from "./SupabaseClient"

// ---- Mock Supabase client that captures inserts ----

interface InsertedMessage {
  channel: string
  sender_id: string
  content: string
}

function makeMockLayer(insertedMessages: InsertedMessage[]) {
  const mockClient = {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () =>
              Promise.resolve({ data: [], error: null }),
          }),
        }),
      }),
      insert: (row: InsertedMessage) => ({
        select: () => ({
          single: () => {
            insertedMessages.push(row)
            return Promise.resolve({ data: { id: "mock-id" }, error: null })
          },
        }),
      }),
    }),
  }

  return Layer.succeed(SupabaseClient, mockClient as unknown as typeof SupabaseClient.Service)
}

function runWith<A, E>(
  effect: Effect.Effect<A, E, ChatService>,
  mockLayer: Layer.Layer<SupabaseClient>
) {
  const layer = ChatServiceLive.pipe(Layer.provide(mockLayer))
  return Effect.runPromiseExit(Effect.provide(effect, layer))
}

// ---- Tests ----

describe("ChatService.sendMessage — validation", () => {
  it("rejects empty content", async () => {
    const captured: InsertedMessage[] = []
    const result = await runWith(
      Effect.gen(function* () {
        const chat = yield* ChatService
        return yield* chat.sendMessage("player-id", "general", "")
      }),
      makeMockLayer(captured)
    )
    expect(result._tag).toBe("Failure")
    if (result._tag === "Failure") {
      const err = (result.cause as { _tag: string; error?: { _tag: string } }).error
      expect(err?._tag).toBe("MessageTooLong")
    }
  })

  it("rejects content over 280 characters", async () => {
    const captured: InsertedMessage[] = []
    const longContent = "a".repeat(281)
    const result = await runWith(
      Effect.gen(function* () {
        const chat = yield* ChatService
        return yield* chat.sendMessage("player-id", "general", longContent)
      }),
      makeMockLayer(captured)
    )
    expect(result._tag).toBe("Failure")
    if (result._tag === "Failure") {
      const err = (result.cause as { _tag: string; error?: { _tag: string } }).error
      expect(err?._tag).toBe("MessageTooLong")
    }
  })

  it("rejects invalid channel format", async () => {
    const captured: InsertedMessage[] = []
    const result = await runWith(
      Effect.gen(function* () {
        const chat = yield* ChatService
        return yield* chat.sendMessage("player-id", "invalid channel!", "hello")
      }),
      makeMockLayer(captured)
    )
    expect(result._tag).toBe("Failure")
    if (result._tag === "Failure") {
      const err = (result.cause as { _tag: string; error?: { _tag: string } }).error
      expect(err?._tag).toBe("InvalidChannel")
    }
  })

  it("accepts valid 'general' channel", async () => {
    const captured: InsertedMessage[] = []
    const result = await runWith(
      Effect.gen(function* () {
        const chat = yield* ChatService
        return yield* chat.sendMessage("player-id", "general", "Hello, world!")
      }),
      makeMockLayer(captured)
    )
    expect(result._tag).toBe("Success")
    expect(captured).toHaveLength(1)
    expect(captured[0].channel).toBe("general")
    expect(captured[0].content).toBe("Hello, world!")
  })

  it("accepts valid 'environment:{id}' channel", async () => {
    const captured: InsertedMessage[] = []
    const result = await runWith(
      Effect.gen(function* () {
        const chat = yield* ChatService
        return yield* chat.sendMessage("player-id", "environment:local_dev", "anyone here?")
      }),
      makeMockLayer(captured)
    )
    expect(result._tag).toBe("Success")
    expect(captured[0].channel).toBe("environment:local_dev")
  })

  it("accepts exactly 280-character message", async () => {
    const captured: InsertedMessage[] = []
    const maxContent = "a".repeat(280)
    const result = await runWith(
      Effect.gen(function* () {
        const chat = yield* ChatService
        return yield* chat.sendMessage("player-id", "general", maxContent)
      }),
      makeMockLayer(captured)
    )
    expect(result._tag).toBe("Success")
  })
})
