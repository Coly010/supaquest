// Runs an Effect program and converts the result into an HTTP Response.
// Maps tagged errors to appropriate HTTP status codes.
// All Edge Functions use this helper — business logic never deals with HTTP directly.

import { Effect, Layer } from "npm:effect@3"
import { ok, error } from "./respond.ts"

type AnyLayer = Layer.Layer<unknown, unknown, never>

export async function runEffect<A>(
  program: Effect.Effect<A, unknown, unknown>,
  layer: AnyLayer
): Promise<Response> {
  const result = await Effect.runPromiseExit(
    program.pipe(Effect.provide(layer as Layer.Layer<never, never, never>))
  )

  if (result._tag === "Success") {
    return ok(result.value)
  }

  const cause = result.cause
  const failure =
    cause._tag === "Fail"
      ? (cause.error as { _tag?: string; message?: string })
      : null

  if (!failure) {
    console.error("Unexpected defect:", JSON.stringify(result.cause))
    return error("Internal server error", 500)
  }

  switch (failure._tag) {
    case "NotAuthorized":
      return error("Not authorized", 403)
    case "PlayerNotFound":
      return error("Player not found", 404)
    case "ItemNotFound":
    case "GemNotFound":
    case "BugNotFound":
    case "AreaNotFound":
    case "TaskDefinitionNotFound":
    case "InventoryItemNotFound":
    case "ShopNotFound":
      return error(`Resource not found: ${failure._tag}`, 404)
    case "UsernameTaken":
      return error("Username is already taken", 409)
    case "GemSlotOccupied":
      return error("Gem slot is already occupied", 409)
    case "SlotAlreadyOccupied":
      return error("Equipment slot is already occupied", 409)
    case "InsufficientResource":
      return error("Insufficient resource", 422)
    case "ItemNotEquippable":
      return error("Item cannot be equipped", 422)
    case "NoGemSlotsAvailable":
      return error("No gem slots available on this item", 422)
    case "LevelRequirementNotMet":
      return error("Level requirement not met", 422)
    case "OutOfStock":
      return error("Item is out of stock", 422)
    case "ItemNotInShop":
      return error("Item is not sold in this shop", 422)
    case "NoSpawnsInArea":
      return error("No bugs found in this area", 422)
    case "MessageTooLong":
      return error("Message exceeds maximum length of 280 characters", 400)
    case "InvalidChannel":
      return error("Invalid channel format", 400)
    case "DatabaseError":
      console.error("Database error:", failure.message)
      return error("Database error", 500)
    default:
      console.error("Unhandled error:", JSON.stringify(failure))
      return error("Internal server error", 500)
  }
}
