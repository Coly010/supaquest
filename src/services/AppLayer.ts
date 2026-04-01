// AppLayer — wires together all services into a single composable Layer.
// Import this in Edge Functions to provide all service dependencies at once.
// Note: the Deno-compatible version lives in supabase/functions/_shared/app-layer.ts

import { Layer } from "effect"
import { ItemRegistryLive } from "./ItemRegistry"
import { PlayerServiceLive } from "./PlayerService"
import { InventoryServiceLive } from "./InventoryService"
import { ShopServiceLive } from "./ShopService"
import { TaskServiceLive } from "./TaskService"
import { CombatServiceLive } from "./CombatService"
import { ChatServiceLive } from "./ChatService"
import { CronServiceLive } from "./CronService"
import { AdminServiceLive } from "./AdminService"

export const AppLayer = Layer.mergeAll(
  ItemRegistryLive,
  PlayerServiceLive,
  InventoryServiceLive,
  ShopServiceLive,
  TaskServiceLive,
  CombatServiceLive,
  ChatServiceLive,
  CronServiceLive,
  AdminServiceLive,
)
