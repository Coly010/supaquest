// All tagged error types for the SupaQuest service layer.
// Using Data.TaggedError ensures errors are pattern-matchable via error._tag in Edge Function handlers.

import { Data } from "effect"

// ---- Player errors ----

export class PlayerNotFound extends Data.TaggedError("PlayerNotFound")<{
  readonly playerId: string
}> {}

export class UsernameTaken extends Data.TaggedError("UsernameTaken")<{
  readonly username: string
}> {}

export class NotAuthorized extends Data.TaggedError("NotAuthorized")<{
  readonly playerId: string
  readonly reason?: string
}> {}

// ---- Resource errors ----

export class InsufficientResource extends Data.TaggedError("InsufficientResource")<{
  readonly playerId: string
  readonly resourceType: string
  readonly required: number
  readonly available: number
}> {}

// ---- Inventory errors ----

export class InventoryItemNotFound extends Data.TaggedError("InventoryItemNotFound")<{
  readonly inventoryId: string
}> {}

export class ItemNotEquippable extends Data.TaggedError("ItemNotEquippable")<{
  readonly itemDefId: string
  readonly reason: string
}> {}

export class SlotAlreadyOccupied extends Data.TaggedError("SlotAlreadyOccupied")<{
  readonly slot: string
}> {}

export class GemSlotOccupied extends Data.TaggedError("GemSlotOccupied")<{
  readonly inventoryId: string
  readonly slotIndex: number
}> {}

export class NoGemSlotsAvailable extends Data.TaggedError("NoGemSlotsAvailable")<{
  readonly inventoryId: string
}> {}

export class LevelRequirementNotMet extends Data.TaggedError("LevelRequirementNotMet")<{
  readonly required: number
  readonly current: number
}> {}

// ---- Registry errors ----

export class ItemNotFound extends Data.TaggedError("ItemNotFound")<{
  readonly itemDefId: string
}> {}

export class GemNotFound extends Data.TaggedError("GemNotFound")<{
  readonly gemDefId: string
}> {}

export class BugNotFound extends Data.TaggedError("BugNotFound")<{
  readonly npcDefId: string
}> {}

export class AreaNotFound extends Data.TaggedError("AreaNotFound")<{
  readonly areaId: string
}> {}

export class TaskDefinitionNotFound extends Data.TaggedError("TaskDefinitionNotFound")<{
  readonly taskDefId: string
}> {}

// ---- Shop errors ----

export class ShopNotFound extends Data.TaggedError("ShopNotFound")<{
  readonly shopId: string
}> {}

export class ItemNotInShop extends Data.TaggedError("ItemNotInShop")<{
  readonly shopId: string
  readonly itemDefId: string
}> {}

export class OutOfStock extends Data.TaggedError("OutOfStock")<{
  readonly shopId: string
  readonly itemDefId: string
}> {}

// ---- Combat errors ----

export class NoSpawnsInArea extends Data.TaggedError("NoSpawnsInArea")<{
  readonly areaId: string
}> {}

// ---- Chat errors ----

export class MessageTooLong extends Data.TaggedError("MessageTooLong")<{
  readonly maxLength: number
  readonly actualLength: number
}> {}

export class InvalidChannel extends Data.TaggedError("InvalidChannel")<{
  readonly channel: string
}> {}

// ---- Database errors ----

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly message: string
  readonly context?: string
}> {}
