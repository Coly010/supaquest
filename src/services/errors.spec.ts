import { describe, it, expect } from "vitest"
import {
  PlayerNotFound,
  UsernameTaken,
  NotAuthorized,
  InsufficientResource,
  InventoryItemNotFound,
  ItemNotEquippable,
  SlotAlreadyOccupied,
  GemSlotOccupied,
  NoGemSlotsAvailable,
  LevelRequirementNotMet,
  ItemNotFound,
  GemNotFound,
  BugNotFound,
  AreaNotFound,
  TaskDefinitionNotFound,
  ShopNotFound,
  ItemNotInShop,
  OutOfStock,
  NoSpawnsInArea,
  DatabaseError,
} from "./errors"

// Edge Function handlers route errors by error._tag — these tests confirm
// every tag string matches the class name exactly as declared.

describe("Tagged errors", () => {
  describe("_tag values match class names", () => {
    it("PlayerNotFound", () => {
      expect(new PlayerNotFound({ playerId: "x" })._tag).toBe("PlayerNotFound")
    })
    it("UsernameTaken", () => {
      expect(new UsernameTaken({ username: "x" })._tag).toBe("UsernameTaken")
    })
    it("NotAuthorized", () => {
      expect(new NotAuthorized({ playerId: "x" })._tag).toBe("NotAuthorized")
    })
    it("InsufficientResource", () => {
      expect(
        new InsufficientResource({ playerId: "x", resourceType: "credits", required: 10, available: 5 })._tag
      ).toBe("InsufficientResource")
    })
    it("InventoryItemNotFound", () => {
      expect(new InventoryItemNotFound({ inventoryId: "x" })._tag).toBe("InventoryItemNotFound")
    })
    it("ItemNotEquippable", () => {
      expect(new ItemNotEquippable({ itemDefId: "x", reason: "no slot" })._tag).toBe("ItemNotEquippable")
    })
    it("SlotAlreadyOccupied", () => {
      expect(new SlotAlreadyOccupied({ slot: "weapon" })._tag).toBe("SlotAlreadyOccupied")
    })
    it("GemSlotOccupied", () => {
      expect(new GemSlotOccupied({ inventoryId: "x", slotIndex: 0 })._tag).toBe("GemSlotOccupied")
    })
    it("NoGemSlotsAvailable", () => {
      expect(new NoGemSlotsAvailable({ inventoryId: "x" })._tag).toBe("NoGemSlotsAvailable")
    })
    it("LevelRequirementNotMet", () => {
      expect(new LevelRequirementNotMet({ required: 10, current: 5 })._tag).toBe("LevelRequirementNotMet")
    })
    it("ItemNotFound", () => {
      expect(new ItemNotFound({ itemDefId: "x" })._tag).toBe("ItemNotFound")
    })
    it("GemNotFound", () => {
      expect(new GemNotFound({ gemDefId: "x" })._tag).toBe("GemNotFound")
    })
    it("BugNotFound", () => {
      expect(new BugNotFound({ npcDefId: "x" })._tag).toBe("BugNotFound")
    })
    it("AreaNotFound", () => {
      expect(new AreaNotFound({ areaId: "x" })._tag).toBe("AreaNotFound")
    })
    it("TaskDefinitionNotFound", () => {
      expect(new TaskDefinitionNotFound({ taskDefId: "x" })._tag).toBe("TaskDefinitionNotFound")
    })
    it("ShopNotFound", () => {
      expect(new ShopNotFound({ shopId: "x" })._tag).toBe("ShopNotFound")
    })
    it("ItemNotInShop", () => {
      expect(new ItemNotInShop({ shopId: "x", itemDefId: "y" })._tag).toBe("ItemNotInShop")
    })
    it("OutOfStock", () => {
      expect(new OutOfStock({ shopId: "x", itemDefId: "y" })._tag).toBe("OutOfStock")
    })
    it("NoSpawnsInArea", () => {
      expect(new NoSpawnsInArea({ areaId: "x" })._tag).toBe("NoSpawnsInArea")
    })
    it("DatabaseError", () => {
      expect(new DatabaseError({ message: "oops" })._tag).toBe("DatabaseError")
    })
  })

  describe("payload fields are accessible", () => {
    it("PlayerNotFound carries playerId", () => {
      const err = new PlayerNotFound({ playerId: "abc-123" })
      expect(err.playerId).toBe("abc-123")
    })

    it("InsufficientResource carries all fields", () => {
      const err = new InsufficientResource({
        playerId: "p1",
        resourceType: "focus",
        required: 50,
        available: 20,
      })
      expect(err.playerId).toBe("p1")
      expect(err.resourceType).toBe("focus")
      expect(err.required).toBe(50)
      expect(err.available).toBe(20)
    })

    it("NotAuthorized optional reason field", () => {
      const withReason = new NotAuthorized({ playerId: "p1", reason: "not admin" })
      const withoutReason = new NotAuthorized({ playerId: "p1" })
      expect(withReason.reason).toBe("not admin")
      expect(withoutReason.reason).toBeUndefined()
    })

    it("DatabaseError optional context field", () => {
      const withCtx = new DatabaseError({ message: "fail", context: "createProfile" })
      const withoutCtx = new DatabaseError({ message: "fail" })
      expect(withCtx.context).toBe("createProfile")
      expect(withoutCtx.context).toBeUndefined()
    })
  })

  describe("error identity and equality", () => {
    it("errors are instances of Error (throwable/catchable)", () => {
      const err = new PlayerNotFound({ playerId: "x" })
      expect(err).toBeInstanceOf(Error)
    })

    it("two instances with the same payload are structurally equal (Effect Data.TaggedError)", () => {
      const a = new PlayerNotFound({ playerId: "same-id" })
      const b = new PlayerNotFound({ playerId: "same-id" })
      expect(a).toEqual(b)
    })

    it("two instances with different payloads are not equal", () => {
      const a = new PlayerNotFound({ playerId: "id-1" })
      const b = new PlayerNotFound({ playerId: "id-2" })
      expect(a).not.toEqual(b)
    })

    it("errors with different tags are distinguishable", () => {
      const a = new PlayerNotFound({ playerId: "x" })
      const b = new ItemNotFound({ itemDefId: "x" })
      expect(a._tag).not.toBe(b._tag)
    })
  })
})
