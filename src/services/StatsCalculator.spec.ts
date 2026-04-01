import { describe, it, expect } from "vitest"
import { calculateEffectiveStats } from "./StatsCalculator"
import type { BaseStats, EquippedItemEntry, SocketedGemEntry } from "./StatsCalculator"

const BASE: BaseStats = {
  logic: 10,
  resilience: 8,
  throughput: 6,
  serendipity: 4,
  maxUptime: 100,
}

const ZERO_BASE: BaseStats = {
  logic: 0,
  resilience: 0,
  throughput: 0,
  serendipity: 0,
  maxUptime: 0,
}

describe("calculateEffectiveStats", () => {
  it("returns base stats unchanged when no items or gems are equipped", () => {
    const result = calculateEffectiveStats(BASE, [], [])
    expect(result).toEqual({
      logic: 10,
      resilience: 8,
      throughput: 6,
      serendipity: 4,
      maxUptime: 100,
    })
  })

  it("adds all bonuses from a single fully-specified item", () => {
    const item: EquippedItemEntry = {
      baseStats: { logic: 2, resilience: 1, throughput: 3, serendipity: 1, max_uptime: 10 },
    }
    const result = calculateEffectiveStats(BASE, [item], [])
    expect(result).toEqual({
      logic: 12,
      resilience: 9,
      throughput: 9,
      serendipity: 5,
      maxUptime: 110,
    })
  })

  it("treats undefined stat bonuses on an item as zero (no change to that stat)", () => {
    const item: EquippedItemEntry = {
      baseStats: { logic: 5 }, // only logic specified
    }
    const result = calculateEffectiveStats(BASE, [item], [])
    expect(result.logic).toBe(15)
    expect(result.resilience).toBe(BASE.resilience)
    expect(result.throughput).toBe(BASE.throughput)
    expect(result.serendipity).toBe(BASE.serendipity)
    expect(result.maxUptime).toBe(BASE.maxUptime)
  })

  it("stacks bonuses from multiple equipped items", () => {
    const items: EquippedItemEntry[] = [
      { baseStats: { logic: 2, resilience: 1 } },
      { baseStats: { logic: 3, throughput: 2 } },
      { baseStats: { serendipity: 4, max_uptime: 20 } },
    ]
    const result = calculateEffectiveStats(BASE, items, [])
    expect(result).toEqual({
      logic: 15,       // 10 + 2 + 3
      resilience: 9,   // 8 + 1
      throughput: 8,   // 6 + 2
      serendipity: 8,  // 4 + 4
      maxUptime: 120,  // 100 + 20
    })
  })

  it("adds bonuses from a single gem", () => {
    const gem: SocketedGemEntry = {
      statBonus: { logic: 1, resilience: 2 },
    }
    const result = calculateEffectiveStats(BASE, [], [gem])
    expect(result.logic).toBe(11)
    expect(result.resilience).toBe(10)
    expect(result.throughput).toBe(BASE.throughput)
  })

  it("stacks bonuses from both equipped items and socketed gems", () => {
    const item: EquippedItemEntry = { baseStats: { logic: 3, max_uptime: 10 } }
    const gem: SocketedGemEntry = { statBonus: { logic: 1, serendipity: 2 } }
    const result = calculateEffectiveStats(BASE, [item], [gem])
    expect(result).toEqual({
      logic: 14,       // 10 + 3 + 1
      resilience: 8,
      throughput: 6,
      serendipity: 6,  // 4 + 2
      maxUptime: 110,  // 100 + 10
    })
  })

  it("treats undefined stat bonuses on a gem as zero", () => {
    const gem: SocketedGemEntry = {
      statBonus: { serendipity: 3 }, // only serendipity
    }
    const result = calculateEffectiveStats(BASE, [], [gem])
    expect(result.serendipity).toBe(7)
    expect(result.logic).toBe(BASE.logic)
    expect(result.resilience).toBe(BASE.resilience)
  })

  it("handles items and gems with empty stat objects without crashing", () => {
    const item: EquippedItemEntry = { baseStats: {} }
    const gem: SocketedGemEntry = { statBonus: {} }
    const result = calculateEffectiveStats(BASE, [item], [gem])
    expect(result).toEqual(BASE)
  })

  it("correctly accumulates bonuses on top of zero base stats", () => {
    const item: EquippedItemEntry = { baseStats: { logic: 5, max_uptime: 20 } }
    const gem: SocketedGemEntry = { statBonus: { resilience: 3 } }
    const result = calculateEffectiveStats(ZERO_BASE, [item], [gem])
    expect(result).toEqual({
      logic: 5,
      resilience: 3,
      throughput: 0,
      serendipity: 0,
      maxUptime: 20,
    })
  })

  it("correctly sums a large number of items each contributing +1", () => {
    const items: EquippedItemEntry[] = Array.from({ length: 20 }, () => ({
      baseStats: { logic: 1, resilience: 1, throughput: 1, serendipity: 1, max_uptime: 1 },
    }))
    const result = calculateEffectiveStats(ZERO_BASE, items, [])
    expect(result).toEqual({
      logic: 20,
      resilience: 20,
      throughput: 20,
      serendipity: 20,
      maxUptime: 20,
    })
  })

  it("produces the same result regardless of item order", () => {
    const itemA: EquippedItemEntry = { baseStats: { logic: 2 } }
    const itemB: EquippedItemEntry = { baseStats: { logic: 5, resilience: 1 } }
    const resultAB = calculateEffectiveStats(BASE, [itemA, itemB], [])
    const resultBA = calculateEffectiveStats(BASE, [itemB, itemA], [])
    expect(resultAB).toEqual(resultBA)
  })
})
