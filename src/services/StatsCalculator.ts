// Pure function: BaseStats + equipped items + socketed gems → EffectiveStats.
// Lives outside PlayerService and InventoryService to break the circular dependency.
// Neither service imports the other for stat logic — they both call this utility.

export interface BaseStats {
  readonly logic: number
  readonly resilience: number
  readonly throughput: number
  readonly serendipity: number
  readonly maxUptime: number
}

export interface EffectiveStats extends BaseStats {}

export interface ItemStatBonus {
  readonly logic?: number
  readonly resilience?: number
  readonly throughput?: number
  readonly serendipity?: number
  readonly max_uptime?: number
}

export interface EquippedItemEntry {
  readonly baseStats: ItemStatBonus
}

export interface SocketedGemEntry {
  readonly statBonus: ItemStatBonus
}

export const calculateEffectiveStats = (
  base: BaseStats,
  equippedItems: EquippedItemEntry[],
  socketedGems: SocketedGemEntry[]
): EffectiveStats => {
  let logic = base.logic
  let resilience = base.resilience
  let throughput = base.throughput
  let serendipity = base.serendipity
  let maxUptime = base.maxUptime

  for (const item of equippedItems) {
    logic += item.baseStats.logic ?? 0
    resilience += item.baseStats.resilience ?? 0
    throughput += item.baseStats.throughput ?? 0
    serendipity += item.baseStats.serendipity ?? 0
    maxUptime += item.baseStats.max_uptime ?? 0
  }

  for (const gem of socketedGems) {
    logic += gem.statBonus.logic ?? 0
    resilience += gem.statBonus.resilience ?? 0
    throughput += gem.statBonus.throughput ?? 0
    serendipity += gem.statBonus.serendipity ?? 0
    maxUptime += gem.statBonus.max_uptime ?? 0
  }

  return { logic, resilience, throughput, serendipity, maxUptime }
}
