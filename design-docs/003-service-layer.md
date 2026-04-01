# Service Layer — SupaQuest Effect-TS Reference

> Practical reference for the Effect-TS service layer implemented in `src/services/`.
> For design intent and composition patterns see `001-architecture.md §9`.
> For adding a new service see the **Adding a service** section at the bottom.

---

## Service inventory

| Service | File | Depends on | Status |
|---|---|---|---|
| `SupabaseClient` | `SupabaseClient.ts` | — | ✅ Phase 1 |
| `ItemRegistry` | `ItemRegistry.ts` | `SupabaseClient` | ✅ Phase 1 |
| `StatsCalculator` | `StatsCalculator.ts` | — (pure function) | ✅ Phase 1 |
| `PlayerService` | `PlayerService.ts` | `SupabaseClient` | ✅ Phase 1 |
| `InventoryService` | `InventoryService.ts` | `SupabaseClient`, `ItemRegistry` | ✅ Phase 1 |
| `ShopService` | `ShopService.ts` | `SupabaseClient` | ✅ Phase 2 |
| `TaskService` | `TaskService.ts` | `SupabaseClient`, `ItemRegistry`, `PlayerService`, `InventoryService` | ✅ Phase 2 |
| `CombatService` | `CombatService.ts` | `SupabaseClient`, `ItemRegistry`, `PlayerService`, `InventoryService` | ✅ Phase 3 |
| `ChatService` | `ChatService.ts` | `SupabaseClient` | ✅ Phase 4 |
| `CronService` | `CronService.ts` | `SupabaseClient` | ✅ Phase 4 |
| `AdminService` | `AdminService.ts` | `SupabaseClient`, `PlayerService` | ✅ Phase 5 |

---

## Error types (`src/services/errors.ts`)

All errors extend `Data.TaggedError`. The `_tag` field is used by `effect-runner.ts` to map errors to HTTP status codes.

```typescript
// 404
PlayerNotFound        { playerId: string }
ItemNotFound          { itemDefId: string }
GemNotFound           { gemDefId: string }
BugNotFound           { bugDefId: string }
AreaNotFound          { areaId: string }
TaskDefinitionNotFound { taskDefId: string }
ShopNotFound          { shopId: string }
InventoryItemNotFound  { inventoryId: string }

// 409 Conflict
UsernameTaken         { username: string }
SlotAlreadyOccupied   { slot: string }
GemSlotOccupied       { inventoryId: string; slotIndex: number }

// 422 Unprocessable
InsufficientResource  { playerId: string; resourceType: string; required: number; available: number }
ItemNotEquippable     { itemDefId: string; reason: string }
NoGemSlotsAvailable   { inventoryId: string }
LevelRequirementNotMet { required: number; current: number }
ItemNotInShop         { shopId: string; itemDefId: string }
OutOfStock            { shopId: string; itemDefId: string }

// 400 Bad Request
MessageTooLong        { length: number }
InvalidChannel        { channel: string }

// 422 Unprocessable (continued)
NoSpawnsInArea        { areaId: string }

// 500
DatabaseError         { message: string; context: string }
```

Error mapping in `_shared/effect-runner.ts`:

| `_tag` | HTTP status |
|---|---|
| `*NotFound` | 404 |
| `UsernameTaken`, `SlotAlreadyOccupied`, `GemSlotOccupied` | 409 |
| `InsufficientResource`, `ItemNotEquippable`, `NoGemSlotsAvailable`, `LevelRequirementNotMet`, `ItemNotInShop`, `OutOfStock`, `NoSpawnsInArea` | 422 |
| `MessageTooLong`, `InvalidChannel` | 400 |
| `DatabaseError` | 500 |

---

## Service reference

### SupabaseClient

```typescript
Context.Tag("SupabaseClient")<SupabaseClient, SupabaseClient<Database>>
```

Wraps the Supabase JS client as an Effect Layer. Used by every other service via `yield* SupabaseClient`.

The live layer reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from env. In Edge Functions the env vars are available automatically. In tests, provide a mock layer.

---

### ItemRegistry

Read-only queries for game content definitions. No writes — all content comes from the seed.

```typescript
getItem(itemDefId: string)
  → Effect<ItemDefinition, ItemNotFound | DatabaseError>

getAllItems()
  → Effect<ItemDefinition[], DatabaseError>

getGem(gemDefId: string)
  → Effect<GemDefinition, GemNotFound | DatabaseError>

getAllGems()
  → Effect<GemDefinition[], DatabaseError>

getBug(bugDefId: string)
  → Effect<NpcDefinition, BugNotFound | DatabaseError>

getArea(areaId: string)
  → Effect<NpcArea, AreaNotFound | DatabaseError>

getAllAreas()
  → Effect<NpcArea[], DatabaseError>

getAreaSpawns(areaId: string)
  → Effect<NpcAreaSpawn[], DatabaseError>

getTask(taskDefId: string)
  → Effect<TaskDefinition, TaskDefinitionNotFound | DatabaseError>

getAllTasks()
  → Effect<TaskDefinition[], DatabaseError>
```

---

### StatsCalculator

Pure function (not a service — no `Context.Tag`).

```typescript
calculateEffectiveStats(
  baseStats: BaseStats,
  equippedItems: EquippedItemEntry[],   // includes base_stats from item_definitions
  socketedGems: SocketedGemEntry[]       // includes stat_bonus from gem_definitions
): EffectiveStats
```

`EffectiveStats` = sum of base stats + all equipped item bonuses + all socketed gem bonuses.

Used by `PlayerService.getEffectiveStats`.

---

### PlayerService

```typescript
createProfile(userId: string, username: string, displayName: string)
  → Effect<{ playerId: string; username: string }, UsernameTaken | DatabaseError>
  -- Inserts player, player_stats, 3 player_skills, 3 player_resources

getProfile(playerId: string)
  → Effect<PlayerProfile, PlayerNotFound | DatabaseError>
  -- PlayerProfile: { player, stats, skills, resources } fetched concurrently

getEffectiveStats(playerId: string)
  → Effect<EffectiveStats, PlayerNotFound | DatabaseError>
  -- Fetches equipped items + socketed gems, runs through StatsCalculator

spendResource(playerId: string, resourceType: string, amount: number)
  → Effect<void, PlayerNotFound | InsufficientResource | DatabaseError>
  -- Validates current >= amount before deducting

gainResource(playerId: string, resourceType: string, amount: number)
  → Effect<void, PlayerNotFound | DatabaseError>
  -- Caps at maximum if the resource has one (focus, uptime); uncapped for credits

gainXp(playerId: string, amount: number)
  → Effect<void, PlayerNotFound | DatabaseError>
  -- Handles level-up loop; each level-up increases max_uptime by 10

gainSkillXp(playerId: string, skillId: string, amount: number)
  → Effect<void, PlayerNotFound | DatabaseError>
  -- Handles skill level-up loop

setAdmin(playerId: string, isAdmin: boolean)
  → Effect<void, PlayerNotFound | DatabaseError>
```

---

### InventoryService

```typescript
addItem(playerId: string, itemDefId: string, quantity?: number)
  → Effect<InventoryRow, ItemNotFound | DatabaseError>
  -- Stackable items: increments existing stack or inserts new row
  -- Non-stackable: always inserts new row

removeItem(playerId: string, inventoryId: string, quantity?: number)
  → Effect<void, InventoryItemNotFound | DatabaseError>
  -- Decrements quantity; deletes row when quantity reaches 0

getInventory(playerId: string)
  → Effect<InventoryRowWithItem[], DatabaseError>
  -- Joined with item_definitions; ordered by acquired_at

equipItem(inventoryId: string, playerLevel: number)
  → Effect<{ equippedSlot: string }, InventoryItemNotFound | ItemNotEquippable | SlotAlreadyOccupied | LevelRequirementNotMet | DatabaseError>
  -- Validates: item has a slot, item_type is not consumable/material/gem, playerLevel >= level_required
  -- Unique index on (player_id, equipped_slot) surfaces as SlotAlreadyOccupied (DB code 23505)

unequipItem(inventoryId: string)
  → Effect<void, InventoryItemNotFound | ItemNotEquippable | DatabaseError>
  -- Fails with ItemNotEquippable if item is not currently equipped

socketGem(inventoryId: string, gemInventoryId: string, slotIndex: number)
  → Effect<void, InventoryItemNotFound | NoGemSlotsAvailable | GemSlotOccupied | DatabaseError>
  -- inventoryId: the weapon/armor receiving the gem
  -- gemInventoryId: the gem in player_inventory (will be deleted)
  -- slotIndex: 0-based, must be < item.gem_slot_count
  -- Inserts into inventory_gems using gemInvItem.item_def_id as gem_def_id

getEquippedGems(inventoryId: string)
  → Effect<InventoryGem[], DatabaseError>
```

---

### ShopService

```typescript
getShop(shopId: string)
  → Effect<ShopWithInventory, ShopNotFound | DatabaseError>
  -- ShopWithInventory: { shop, items: (ShopInventoryRow & { item: ItemDefinition })[] }

getAllShops()
  → Effect<Shop[], DatabaseError>

buyItem(playerId: string, shopId: string, itemDefId: string)
  → Effect<{ creditsPaid: number }, ItemNotInShop | OutOfStock | InsufficientResource | DatabaseError>
  -- Delegates to buy_item() PL/pgSQL RPC for atomicity
  -- Detects RPC errors by checking error.message for tagged strings

sellItem(playerId: string, inventoryId: string)
  → Effect<{ creditsReceived: number }, InventoryItemNotFound | DatabaseError>
  -- Delegates to sell_item() PL/pgSQL RPC
  -- Sell price = MAX(shop_inventory.price_sell) or FLOOR(base_value / 2)
```

**Why RPCs?** `buyItem` and `sellItem` touch two tables (resources + inventory). Using PL/pgSQL RPCs ensures both writes happen in the same transaction. If the server crashes between them, neither write persists. See `002-database.md` for the full RPC logic.

---

### TaskService

```typescript
attemptTask(playerId: string, taskDefId: string)
  → Effect<TaskAttemptResult, TaskDefinitionNotFound | PlayerNotFound | InsufficientResource | LevelRequirementNotMet | DatabaseError>

interface TaskAttemptResult {
  outcome: "success" | "failure"
  rewardsGiven: {
    credits?: number    // random in [min, max] from task_definitions.rewards
    xp?: number
    skillXp?: number
    gems?: string[]     // gem_def_ids won this attempt
  }
}
```

**Attempt flow:**
1. Fetch task definition via `ItemRegistry.getTask`.
2. Fetch player profile via `PlayerService.getProfile`. Check `level >= task.level_required`.
3. Spend focus via `PlayerService.spendResource` (validates sufficiency).
4. Roll `Math.random() <= task.success_rate`.
5. On success: award credits (random in range), XP, skill XP. Roll each gem reward independently.
6. On failure: award `failure_penalty.xp` if defined (consolation XP only).
7. Insert row into `task_logs`.
8. Return `{ outcome, rewardsGiven }`.

---

### CombatService

```typescript
attackBug(playerId: string, areaId: string)
  → Effect<CombatResult, PlayerNotFound | AreaNotFound | NoSpawnsInArea | DatabaseError>

challengePlayer(attackerId: string, defenderId: string)
  → Effect<PvpResult, PlayerNotFound | DatabaseError>

interface CombatResult {
  outcome: "win" | "lose"
  bugId: string
  bugName: string
  damageDealt: number
  damageTaken: number
  xpGained: number
  creditsGained: number
  loot: { items: string[]; gems: string[] }
}

interface PvpResult {
  outcome: "win" | "lose"
  damageDealt: number
  damageTaken: number
  xpGained: number
}
```

**Combat resolution (`attackBug`):**
1. Fetch area spawns via `ItemRegistry.getAreaSpawns` (fails with `AreaNotFound` if area doesn't exist).
2. Weighted-random bug selection using `spawn_weight` values.
3. Fetch player effective stats via `PlayerService.getEffectiveStats`.
4. `successRate = clamp(playerLogic / (playerLogic + bugLogic), 0.1, 0.9)`.
5. Roll outcome. Apply uptime damage (`damageTaken`) regardless of outcome.
6. On **win**: award XP and credits (random in `credits_reward` range), roll `loot_table` and `gem_loot_table` independently, add drops to inventory.
7. Insert row into `combat_logs`.

**PvP (`challengePlayer`):** Same formula but uses defender's `getEffectiveStats` instead of bug stats. Both players take uptime damage. Winner gains 25 XP, loser gains 5 XP. No items or credits are transferred — thematically a hackathon competition, not theft.

**New error types:**
- `NoSpawnsInArea` (422) — area exists but has no configured spawns.

---

### ChatService

```typescript
getMessages(channel: string, limit?: number)
  → Effect<MessageWithSender[], DatabaseError>
  -- Joins chat_messages with players(display_name), ordered ASC, default limit 50

sendMessage(playerId: string, channel: string, content: string)
  → Effect<{ messageId: string }, MessageTooLong | InvalidChannel | DatabaseError>

interface MessageWithSender {
  id: string
  channel: string
  content: string
  createdAt: string
  senderId: string
  senderDisplayName: string
}
```

**Validation rules:**
- Content must be 1–280 characters (empty → `MessageTooLong`, over 280 → `MessageTooLong`).
- Channel must match `/^(general|environment:[a-z_]+|dm:[a-z0-9_-]+)$/` (fails with `InvalidChannel`).

**Realtime**: The `chat_messages` table has a Realtime publication configured in `007_chat.sql`. The client subscribes to `postgres_changes` for `INSERT` events filtered by `channel=eq.general`. Optimistic updates are applied immediately on send; the Realtime echo reconciles the state.

---

### CronService

```typescript
replenishAll()
  → Effect<void, DatabaseError>
  -- Calls replenish_all_focus() RPC — UPDATEs all player_resources rows where resource_type='focus'
  -- Equivalent to: UPDATE player_resources SET current = LEAST(current + 10, maximum) WHERE resource_type = 'focus'

replenishPlayer(playerId: string)
  → Effect<void, PlayerNotFound | DatabaseError>
  -- Calls replenish_player_focus(playerId) RPC — same logic for a single player
```

**pg_cron schedule**: Migration `009_focus_replenishment.sql` registers a cron job (`replenish-focus`) that fires every 10 minutes and calls `replenish_all_focus()`. In local dev the worker may not fire automatically; call `SELECT replenish_all_focus()` directly in Supabase Studio to test.

---

### AdminService

```typescript
requireAdmin(playerId: string)
  → Effect<void, PlayerNotFound | NotAuthorized | DatabaseError>
  -- Fetches player row and checks is_admin = true. Used internally by all other methods.

updateItem(adminId: string, itemDefId: string, patches: ItemPatch)
  → Effect<void, PlayerNotFound | NotAuthorized | ItemNotFound | DatabaseError>

updateBug(adminId: string, bugDefId: string, patches: BugPatch)
  → Effect<void, PlayerNotFound | NotAuthorized | BugNotFound | DatabaseError>

updateTask(adminId: string, taskDefId: string, patches: TaskPatch)
  → Effect<void, PlayerNotFound | NotAuthorized | TaskDefinitionNotFound | DatabaseError>

listPlayers(adminId: string)
  → Effect<PlayerSummary[], PlayerNotFound | NotAuthorized | DatabaseError>
  -- Returns all players joined with player_resources, ordered by level desc

grantAdmin(adminId: string, targetId: string)
  → Effect<void, PlayerNotFound | NotAuthorized | DatabaseError>

revokeAdmin(adminId: string, targetId: string)
  → Effect<void, PlayerNotFound | NotAuthorized | DatabaseError>

adjustResource(adminId: string, targetId: string, resourceType: string, delta: number)
  → Effect<void, PlayerNotFound | NotAuthorized | DatabaseError>
  -- Adds delta to current (delta can be negative). Clamps to [0, maximum].
  -- Bypasses InsufficientResource check — admin adjustments always succeed.
```

**Admin gate**: Every method calls `requireAdmin(adminId)` first. Non-admin callers receive `NotAuthorized` (403). The check is a direct DB read on `players.is_admin`, not a PlayerService call, to avoid circular dependencies.

**Patch allowlist**: Edge Functions validate incoming patch keys against an explicit allowlist before passing to the service. This prevents clients from patching protected columns like `id` or FK columns.

**Migration `010_admin_rls.sql`**: Adds a permissive SELECT policy on `players` for users where `is_admin = true`. Required so the admin `/players` server component can read all player rows using the user-scoped SSR Supabase client.

---

## Layer composition

### Source files (`src/services/AppLayer.ts`)

```typescript
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
```

This is a documentation artifact. It's not used directly at runtime — Edge Functions use the Deno version below.

### Deno Edge Functions (`supabase/functions/_shared/app-layer.ts`)

Dependencies are wired explicitly with `Layer.provide` because Deno Edge Functions can't rely on the same module resolution semantics as Node.js:

```typescript
const supabaseLayer = SupabaseClientLive

const itemRegistryLayer = ItemRegistryLive.pipe(
  Layer.provide(supabaseLayer)
)

const playerLayer = PlayerServiceLive.pipe(
  Layer.provide(supabaseLayer)
)

// InventoryService needs SupabaseClient + ItemRegistry
const inventoryLayer = InventoryServiceLive.pipe(
  Layer.provide(Layer.merge(supabaseLayer, itemRegistryLayer))
)

// ShopService uses RPCs — only needs SupabaseClient
const shopLayer = ShopServiceLive.pipe(
  Layer.provide(supabaseLayer)
)

// TaskService and CombatService both depend on all four
const taskLayer = TaskServiceLive.pipe(
  Layer.provide(
    Layer.mergeAll(supabaseLayer, itemRegistryLayer, playerLayer, inventoryLayer)
  )
)

const combatLayer = CombatServiceLive.pipe(
  Layer.provide(
    Layer.mergeAll(supabaseLayer, itemRegistryLayer, playerLayer, inventoryLayer)
  )
)

// ChatService and CronService only need SupabaseClient
const chatLayer = ChatServiceLive.pipe(
  Layer.provide(supabaseLayer)
)

const cronLayer = CronServiceLive.pipe(
  Layer.provide(supabaseLayer)
)

// AdminService depends on SupabaseClient only (does own player lookups internally)
const adminLayer = AdminServiceLive.pipe(
  Layer.provide(supabaseLayer)
)

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
```

Each variable is a self-contained layer (all dependencies satisfied). `AppLayer` merges them, making all services available in the program environment.

### How `runEffect` uses AppLayer

```typescript
// _shared/effect-runner.ts
export const runEffect = (program: Effect<unknown, AppError>, layer: AppLayer) =>
  Effect.runPromise(program.pipe(Effect.provide(layer)))
    .then(data => Response.json(data))
    .catch(error => /* map _tag to HTTP status */)
```

Each Edge Function calls `runEffect(program, AppLayer)`. The `AppLayer` is rebuilt per-request in Deno (stateless).

---

## Deno service files

Edge Functions can't import `src/services/*.ts` directly (different module system, can't import Next.js types). Each service has a Deno-compatible mirror in `supabase/functions/_shared/services/`:

| Deno file | Includes |
|---|---|
| `SupabaseClient.ts` | Full implementation (same pattern as src/) |
| `errors.ts` | All tagged error types |
| `PlayerService.ts` | `createProfile`, `getProfile`, `getEffectiveStats`, `spendResource`, `gainResource`, `gainXp`, `gainSkillXp` |
| `ItemRegistry.ts` | `getItem`, `getTask`, `getBug`, `getArea`, `getAllAreas`, `getAreaSpawns` |
| `InventoryService.ts` | `addItem`, `equipItem`, `unequipItem`, `socketGem` |
| `ShopService.ts` | `buyItem`, `sellItem` |
| `TaskService.ts` | `attemptTask` |
| `CombatService.ts` | `attackBug`, `challengePlayer` |
| `ChatService.ts` | `getMessages`, `sendMessage` |
| `CronService.ts` | `replenishAll`, `replenishPlayer` |

**Key difference from src/ versions**: Deno services use `Record<string, unknown>` for all DB row types (no import of `src/lib/supabase/types.ts`). Properties are accessed via `row["column_name"] as Type`.

---

## Adding a new service

1. **Define errors** — add tagged error classes to `src/services/errors.ts`.

2. **Write the service** in `src/services/MyService.ts`:

```typescript
import { Context, Effect, Layer } from "effect"
import { SupabaseClient } from "./SupabaseClient"
import { /* errors */ } from "./errors"

export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly doThing: (id: string) => Effect.Effect<Result, MyError | DatabaseError>
  }
>() {}

export const MyServiceLive = Layer.effect(
  MyService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient
    // yield* OtherService if needed

    return {
      doThing: (id) => Effect.gen(function* () {
        // ... implementation
      })
    }
  })
)
```

3. **Add to `src/services/AppLayer.ts`**.

4. **Write the Deno mirror** in `supabase/functions/_shared/services/MyService.ts` using `npm:effect@3` imports and `Record<string, unknown>` types.

5. **Wire the Deno layer** in `supabase/functions/_shared/app-layer.ts`:

```typescript
const myServiceLayer = MyServiceLive.pipe(
  Layer.provide(Layer.mergeAll(supabaseLayer, /* other deps */))
)

export const AppLayer = Layer.mergeAll(
  // ... existing layers
  myServiceLayer,
)
```

6. **Add error mappings** to `_shared/effect-runner.ts` if new error tags need specific HTTP status codes.

7. **Write the Edge Function** in `supabase/functions/my-action/index.ts` (see any Phase 2 function for the pattern).
