// Composed Layer for Edge Functions — provides all service dependencies.
// Dependencies are wired explicitly via Layer.provide to avoid ambiguity.
// Import this in every Edge Function and pass to runEffect().

import { Layer } from "npm:effect@3"
import { SupabaseClientLive } from "./services/SupabaseClient.ts"
import { ItemRegistryLive } from "./services/ItemRegistry.ts"
import { PlayerServiceLive } from "./services/PlayerService.ts"
import { InventoryServiceLive } from "./services/InventoryService.ts"
import { ShopServiceLive } from "./services/ShopService.ts"
import { TaskServiceLive } from "./services/TaskService.ts"
import { CombatServiceLive } from "./services/CombatService.ts"
import { ChatServiceLive } from "./services/ChatService.ts"
import { CronServiceLive } from "./services/CronService.ts"
import { AdminServiceLive } from "./services/AdminService.ts"

const supabaseLayer = SupabaseClientLive

const itemRegistryLayer = ItemRegistryLive.pipe(
  Layer.provide(supabaseLayer)
)

const playerLayer = PlayerServiceLive.pipe(
  Layer.provide(supabaseLayer)
)

// InventoryService depends on SupabaseClient + ItemRegistry
const inventoryLayer = InventoryServiceLive.pipe(
  Layer.provide(Layer.merge(supabaseLayer, itemRegistryLayer))
)

// ShopService only needs SupabaseClient (mutations via RPC)
const shopLayer = ShopServiceLive.pipe(
  Layer.provide(supabaseLayer)
)

// TaskService depends on all four
const taskLayer = TaskServiceLive.pipe(
  Layer.provide(
    Layer.mergeAll(supabaseLayer, itemRegistryLayer, playerLayer, inventoryLayer)
  )
)

// CombatService depends on all four
const combatLayer = CombatServiceLive.pipe(
  Layer.provide(
    Layer.mergeAll(supabaseLayer, itemRegistryLayer, playerLayer, inventoryLayer)
  )
)

// ChatService and CronService only depend on SupabaseClient
const chatLayer = ChatServiceLive.pipe(Layer.provide(supabaseLayer))
const cronLayer = CronServiceLive.pipe(Layer.provide(supabaseLayer))

// AdminService depends on SupabaseClient only (does its own player lookups internally)
const adminLayer = AdminServiceLive.pipe(Layer.provide(supabaseLayer))

export const AppLayer = Layer.mergeAll(
  itemRegistryLayer,
  playerLayer,
  inventoryLayer,
  shopLayer,
  taskLayer,
  combatLayer,
  chatLayer,
  cronLayer,
  adminLayer,
)
