# Architecture — SupaQuest: A Developer's MMORPG

> Effect-TS + Supabase exploration project.  
> This document is the single source of truth for system design decisions.  
> **Theme**: You're a developer learning Supabase. Fight bugs, mine data, architect schemas, and compete in hackathons.

---

## 1. Project goals

- **Primary**: Learn and dogfood Supabase (Auth, Realtime, RLS, Edge Functions, CLI, pg_cron) and Effect-TS (Services, Layers, typed errors, pipelines).
- **Secondary**: Build a playable text-based MMORPG where interconnected game systems exercise real-world patterns — transactional writes, service composition, cron scheduling, real-time pub/sub, and admin tooling.
- **Philosophy**: Each game system exposes a typed service interface. Other systems interact through that interface, never through raw DB queries scattered across features.

---

## 2. Theme mapping

The game world is a developer's journey learning Supabase. Every game concept maps to a programming metaphor:

### 2.1 Vocabulary

| Game concept | Themed as | Examples |
|---|---|---|
| Player | Developer | — |
| Stats | Dev attributes | Logic (STR), Resilience (DEF), Throughput (SPD), Serendipity (LCK) |
| Health | Uptime | Server uptime — when it hits zero, you crash |
| Energy | Focus | Mental stamina for tasks — replenishes over time |
| Gold | Credits | Cloud compute credits — the universal currency |
| Skills | Disciplines | Debugging, Data Mining, Architecture |
| XP | Experience points | Same — fits naturally |
| Level | Seniority | Junior → Mid → Senior → Staff → Principal |
| Items (weapons) | Dev tools | Debugger, Linter, Profiler, Query Optimizer |
| Items (armor) | Frameworks & infra | Type Checker, CI Pipeline, Load Balancer, Test Suite |
| Items (consumable) | Quick fixes | Stack Overflow Answer, Coffee, Hot Fix Script |
| Equip slots | Dev setup | IDE (main_hand), Terminal (off_hand), Framework (chest), CI/CD (legs), Monitoring (head), Hosting (feet) |
| Gems | Enhancement modules | Ruby (+Logic), Sapphire (+Resilience), Diamond (+Uptime), Emerald (+Serendipity) |
| NPCs (enemies) | Bugs | Typo Bug, Off-by-One, Race Condition, Memory Leak, Heisenbug, Deadlock |
| NPC areas | Environments | Local Dev, Staging, Production, Legacy Codebase |
| Tasks | Dev work | Write Migration, Review PR, Run Query, Analyze Logs, Configure RLS |
| Shops | Tool sources | Package Registry, Extension Marketplace, Cloud Console |
| PvP | Hackathon battles | Developers competing head-to-head |
| Chat channels | Comms | #general, #environment:{area}, DMs |
| Admin | Admin role | `is_admin` flag on the player — same user, elevated access |

### 2.2 Skill → Task mapping

| Skill | Tasks | Primary resource produced |
|---|---|---|
| Debugging | Review Pull Request, Write Unit Test, Trace Stack Trace, Fix Type Error | Credits, XP |
| Data Mining | Run Database Query, Analyze Server Logs, Export Dataset, Profile Slow Query | Credits, Gems (primary gem source) |
| Architecture | Write DB Migration, Configure RLS Policy, Design API Schema, Set Up Edge Function | Credits, XP |

### 2.3 Bug bestiary (NPC examples)

| Bug | Area | Level | Notable mechanic |
|---|---|---|---|
| Typo Bug | Local Dev | 1–3 | Low stats, common. Training dummy. |
| Missing Semicolon | Local Dev | 2–4 | Slightly evasive (higher speed). |
| Off-by-One Error | Local Dev / Staging | 3–6 | Moderate all-round. Drops data mining materials. |
| Null Reference | Staging | 5–8 | Hits hard (high logic), low resilience. Glass cannon. |
| Race Condition | Staging | 7–10 | High speed, unpredictable. Chance to dodge attacks. |
| Memory Leak | Staging / Production | 8–12 | Grows stronger each turn (stacking buff). |
| Unhandled Promise | Production | 10–14 | Spawns additional bugs on defeat. |
| N+1 Query | Production | 12–16 | High HP, slow. Endurance fight. |
| Deadlock | Production | 15–18 | Locks you out of actions for a turn. |
| Heisenbug | Legacy Codebase | 18–25 | Changes stats when observed. Boss-tier. Rare gem drops. |

### 2.4 Item examples

**Weapons (Dev tools)**:
- Basic Linter (lvl 1) — +2 Logic, 0 gem slots
- Debugger Pro (lvl 5) — +5 Logic, +2 Throughput, 1 gem slot
- Advanced Profiler (lvl 10) — +8 Logic, +4 Throughput, 2 gem slots
- Query Optimizer (lvl 15) — +12 Logic, +3 Serendipity, 2 gem slots

**Armor (Frameworks & infra)**:
- Type Checker (chest, lvl 1) — +3 Resilience, 0 gem slots
- CI Pipeline (legs, lvl 5) — +5 Resilience, +2 Throughput, 1 gem slot
- Load Balancer (head, lvl 10) — +8 Resilience, +20 Max Uptime, 1 gem slot
- Test Suite (chest, lvl 15) — +12 Resilience, +4 Logic, 2 gem slots

---

## 3. Tech stack

| Layer | Technology | Role |
|---|---|---|
| Client | Next.js (App Router) | Thin display layer — reads game state, sends actions |
| Auth | Supabase Auth | Session management, JWT, user identity |
| API | Supabase Edge Functions (Deno) | HTTP handlers for all game mutations |
| Service layer | Effect-TS | Typed service interfaces, dependency injection, error handling, pipelines |
| Database | Supabase PostgreSQL | All persistent game state |
| Security | Row Level Security (RLS) | Client-side reads scoped to the authenticated player |
| Real-time | Supabase Realtime | Chat messages, combat notifications, live game events |
| Scheduling | pg_cron (via Supabase) | Resource (Focus) replenishment ticks |
| Types | Supabase CLI (`supabase gen types`) | Auto-generated TypeScript types from DB schema |

---

## 4. Architecture layers

### 4.1 Client (Next.js)

The client is deliberately thin. It does two things:

1. **Reads** game state directly from Supabase using the JS client, protected by RLS. This includes the player's profile, inventory, stats, chat messages, and shop listings.
2. **Sends actions** to Edge Functions for all mutations (attack bug, buy tool, equip framework, attempt task). The client never writes game state directly.

Supabase Realtime subscriptions provide live updates for chat and combat events without polling.

### 4.2 Edge Functions (Deno)

Each Edge Function is a thin HTTP handler. It:

1. Authenticates the request (Supabase Auth JWT).
2. Extracts and validates parameters.
3. Delegates to the Effect-TS service layer.
4. Returns the result or a typed error response.

An Edge Function should be 10–30 lines of plumbing. Business logic does not live here.

```
POST /functions/v1/shop-buy
  → authenticate
  → extract { itemId }
  → ShopService.buyItem(playerId, itemId)
  → return result or error
```

### 4.3 Effect-TS service layer

This is the core of the application. Each game system is an Effect-TS `Service` with:

- A **typed interface** defined via `Context.Tag` — the contract other services depend on.
- A **concrete implementation** provided as a `Layer` — the wiring that connects the interface to Supabase queries.
- **Tagged error types** via `Data.TaggedError` — failures are explicit, typed, and pattern-matchable.

Services compose through Effect's dependency system. When `ShopService.buyItem` needs to deduct credits and add a tool, it calls `PlayerService.spendResource` and `InventoryService.addItem` — declared as dependencies, resolved at startup via Layer composition.

The return type of every composed Effect automatically tracks:
- The **success** type (what you get back).
- The **error** union (every way it can fail).
- The **requirements** (which services must be provided).

### 4.4 Database (PostgreSQL via Supabase)

All persistent state lives in PostgreSQL. Key principles:

- **Base data vs computed data**: The DB stores base values (base stats, base item definitions). Computed values (effective stats with equipment and gem bonuses) are derived at runtime by the service layer and never persisted.
- **Reference data pattern**: Items, gems, bugs, tasks, and shop inventories have a base definition table (the "registry") and per-player instance tables. This lets items have a shared base definition while allowing per-instance customization (gem slots, socketed gems).
- **Transactional writes**: Operations that touch multiple tables (buy item = deduct credits + add inventory row) use database transactions via `supabase.rpc()` calling PL/pgSQL functions, ensuring atomicity.
- **RLS for reads**: Row Level Security policies ensure the client can only SELECT rows belonging to the authenticated player. All INSERT/UPDATE/DELETE goes through Edge Functions using the service role key.
- **Admin access**: Admin-scoped Edge Functions check `is_admin` on the player row before proceeding. Admin operations use the service role key and bypass RLS.

---

## 5. Service map

### 5.1 Services and their responsibilities

| Service | Owns | Depends on |
|---|---|---|
| **PlayerService** | Profile (identity, seniority/level, XP), base stats (Logic, Resilience, Throughput, Serendipity), skills (Debugging, Data Mining, Architecture) & skill XP, resources (Focus, Uptime, Credits), admin flag | InventoryService (for effective stat calculation via StatsCalculator) |
| **InventoryService** | Item storage (unlimited capacity), equipped items, equip/unequip logic, gem socketing | PlayerService (for stat caps/validation), ItemRegistry (for base item/gem data) |
| **ItemRegistry** | Base item definitions (tools, frameworks, consumables), gem definitions (Ruby/Sapphire/Diamond/Emerald), bug templates, task definitions, shop inventories | None (read-only reference data) |
| **ShopService** | Shop listings (Package Registry, Extension Marketplace, Cloud Console), buy/sell transactions, price validation | PlayerService (credits checks), InventoryService (add/remove items), ItemRegistry (shop stock) |
| **CombatService** | PvE (bug encounters, damage calc, loot/gem drops) and PvP (hackathon challenges, damage calc with effective stats). Open PvP — any developer can challenge any other. | PlayerService (effective stats, uptime deduction), InventoryService (loot drops) |
| **TaskService** | Task attempts (instant), success/fail rolls, resource production, skill XP rewards. Data Mining tasks are primary gem source. | PlayerService (focus costs, skill checks, XP awards), InventoryService (item rewards) |
| **ChatService** | Message storage, channel management (#general, #environment, DMs), Realtime broadcasting | PlayerService (display names only) |
| **CronService** | Focus replenishment scheduling, tick execution | PlayerService (batch resource updates) |
| **AdminService** | Content management (items, gems, bugs, tasks, shops), user management, game state inspection. Checks `is_admin` flag — not a separate auth system. | All other services (read/write access for admin operations) |

### 5.2 Service dependency rules

1. **No circular dependencies.** The circular dependency between PlayerService and InventoryService is resolved by extracting a `StatsCalculator` utility (see §5.3).
2. **ItemRegistry has no dependencies.** It is pure reference data and should be the simplest service to implement and test.
3. **PlayerService is the most depended-upon service.** It should be implemented first and tested thoroughly.
4. **AdminService is gated by a flag, not a separate auth flow.** It checks `players.is_admin = true` before allowing admin operations.

### 5.3 Resolved: PlayerService ↔ InventoryService circular dependency

**Solution: Extract a StatsCalculator utility.**

`getEffectiveStats` becomes a pure function:

```typescript
const calculateEffectiveStats = (
  baseStats: BaseStats,
  equippedItems: EquippedItem[],   // includes base_stats from item_definitions
  socketedGems: SocketedGem[]       // includes bonuses from gem_definitions
): EffectiveStats => { ... }
```

This lives outside both services as a shared utility. PlayerService calls it by fetching base stats (own data) and equipped items + gems (from InventoryService). Neither service depends on the other for stat logic.

---

## 6. Admin system & seeding

### 6.1 Admin role

Admin is not a separate user type — it's a boolean flag on the `players` table:

```sql
ALTER TABLE players ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
```

Admin-scoped Edge Functions check this flag after authentication:

```typescript
const requireAdmin = (playerId: string) =>
  Effect.gen(function* () {
    const player = yield* PlayerService
    const profile = yield* player.getProfile(playerId)
    if (!profile.isAdmin) {
      return yield* Effect.fail(new NotAuthorized({ playerId }))
    }
  })
```

This means:
- The admin can play the game as a normal developer.
- Admin endpoints are separate Edge Functions (e.g. `/functions/v1/admin/create-item`) that require the `is_admin` check.
- The admin UI is a separate route group in Next.js (e.g. `/admin/*`) that calls admin Edge Functions.
- No special auth flow — same Supabase Auth, same JWT, just an extra permission check.

### 6.2 Seed data strategy

Supabase supports `supabase/seed.sql`, which runs automatically on `supabase db reset`. This seeds both the admin user and all game content.

**Admin user seed**: Create an auth user and corresponding player record with `is_admin = true`. The seed uses a well-known email and password for local dev (these never reach production).

**Content seed order** (respects FK constraints):
1. `item_definitions` — all tools, frameworks, consumables, materials
2. `gem_definitions` — Ruby, Sapphire, Diamond, Emerald across all tiers
3. `npc_definitions` — all bugs with stats, loot tables, gem loot tables
4. `npc_areas` — Local Dev, Staging, Production, Legacy Codebase
5. `npc_area_spawns` — which bugs appear in which environments
6. `task_definitions` — all tasks mapped to skills
7. `shops` — Package Registry, Extension Marketplace, Cloud Console
8. `shop_inventory` — which items each shop sells and at what price

**The seed file is the game's content database.** Balancing (drop rates, prices, stat bonuses) happens by editing `seed.sql` and running `supabase db reset`. AdminService can override seed values at runtime for live tuning once the admin UI exists.

---

## 7. Core data models

### 7.1 Player

```
players
  id            UUID (PK, FK → auth.users)
  username      TEXT UNIQUE
  display_name  TEXT
  level         INT (default 1)              -- "Seniority" in theme
  xp            INT (default 0)
  xp_to_next    INT (default 100)
  is_admin      BOOLEAN (default false)
  created_at    TIMESTAMPTZ
  updated_at    TIMESTAMPTZ

player_stats
  player_id     UUID (PK, FK → players)
  logic         INT (default 10)             -- Strength → Logic
  resilience    INT (default 10)             -- Defense → Resilience
  throughput    INT (default 10)             -- Speed → Throughput
  serendipity   INT (default 10)             -- Luck → Serendipity
  max_uptime    INT (default 100)            -- Max Health → Max Uptime

player_skills
  player_id     UUID (FK → players)
  skill_id      TEXT                          -- "debugging", "data_mining", "architecture"
  level         INT (default 1)
  xp            INT (default 0)
  xp_to_next    INT (default 50)
  PRIMARY KEY (player_id, skill_id)

  -- Seeded with 3 rows per player on profile creation:
  -- ("debugging", 1, 0, 50)
  -- ("data_mining", 1, 0, 50)
  -- ("architecture", 1, 0, 50)

player_resources
  player_id       UUID (FK → players)
  resource_type   TEXT                        -- "focus", "uptime", "credits"
  current         INT
  maximum         INT | NULL                  -- NULL = uncapped (credits)
  last_replenish  TIMESTAMPTZ                 -- for cron delta calculation
  PRIMARY KEY (player_id, resource_type)

  -- Defaults on profile creation:
  -- ("focus", 100, 100, now())
  -- ("uptime", 100, 100, now())
  -- ("credits", 50, NULL, now())
```

### 7.2 Items, gems & inventory

```
item_definitions                    -- Registry: base item data
  id              TEXT (PK)         -- e.g. "basic_linter", "type_checker"
  name            TEXT              -- e.g. "Basic Linter", "Type Checker"
  description     TEXT
  item_type       TEXT              -- "weapon", "armor", "consumable", "material"
  slot            TEXT | NULL       -- "main_hand", "off_hand", "head", "chest", "legs", "feet"
  base_stats      JSONB             -- { "logic": 5, "resilience": 0, ... }
  level_required  INT (default 1)   -- minimum player level to equip/use
  base_value      INT               -- default buy/sell price in credits
  stackable       BOOLEAN
  max_stack       INT | NULL
  gem_slot_count  INT (default 0)   -- how many gems can be socketed
  metadata        JSONB             -- extensible per-type data

gem_definitions                     -- Registry: gem types and their bonuses
  id              TEXT (PK)         -- e.g. "ruby_t1", "sapphire_t2", "diamond_t3"
  name            TEXT              -- e.g. "Rough Ruby", "Cut Sapphire", "Flawless Diamond"
  description     TEXT
  gem_type        TEXT              -- "ruby", "sapphire", "diamond", "emerald"
  stat_bonus      JSONB             -- the bonus this gem provides when socketed
  tier            INT (default 1)   -- 1 = Rough, 2 = Cut, 3 = Flawless
  base_value      INT               -- sell price in credits
  metadata        JSONB

  -- Gem bonuses (N scales with tier: T1=+2, T2=+5, T3=+10):
  -- Ruby:     { "logic": N }         — offensive power
  -- Sapphire: { "resilience": N }    — damage reduction
  -- Diamond:  { "max_uptime": N }    — survivability
  -- Emerald:  { "serendipity": N }   — better drops / crit chance

player_inventory
  id              UUID (PK)
  player_id       UUID (FK → players)
  item_def_id     TEXT (FK → item_definitions)
  quantity        INT (default 1)
  is_equipped     BOOLEAN (default false)
  equipped_slot   TEXT | NULL       -- which slot it's equipped in
  acquired_at     TIMESTAMPTZ

  UNIQUE (player_id, equipped_slot) WHERE is_equipped = true

inventory_gems                      -- Gems socketed into inventory items
  id              UUID (PK)
  inventory_id    UUID (FK → player_inventory)
  gem_def_id      TEXT (FK → gem_definitions)
  slot_index      INT               -- 0-based index into the item's gem slots
  socketed_at     TIMESTAMPTZ

  UNIQUE (inventory_id, slot_index)
```

### 7.3 Shops

```
shops
  id              TEXT (PK)         -- "package_registry", "extension_marketplace", "cloud_console"
  name            TEXT              -- "Package Registry", "Extension Marketplace", "Cloud Console"
  description     TEXT

shop_inventory
  shop_id         TEXT (FK → shops)
  item_def_id     TEXT (FK → item_definitions)
  price_buy       INT               -- credits to buy
  price_sell      INT               -- credits received when selling
  stock           INT | NULL         -- NULL = unlimited
  PRIMARY KEY (shop_id, item_def_id)
```

### 7.4 Bugs & combat

```
npc_definitions                     -- Registry: Bug templates
  id              TEXT (PK)         -- e.g. "typo_bug", "race_condition", "heisenbug"
  name            TEXT              -- e.g. "Typo Bug", "Race Condition", "Heisenbug"
  description     TEXT              -- flavour text
  level           INT
  stats           JSONB             -- { "logic": 15, "resilience": 10, "throughput": 8, "serendipity": 3 }
  uptime          INT               -- bug's health pool
  loot_table      JSONB             -- [{ "item_def_id": "...", "chance": 0.3, "qty": [1,3] }]
  gem_loot_table  JSONB | NULL      -- [{ "gem_def_id": "ruby_t1", "chance": 0.1 }]
  xp_reward       INT
  credits_reward  INT[]             -- [min, max]

npc_areas                           -- Environments
  id              TEXT (PK)         -- "local_dev", "staging", "production", "legacy_codebase"
  name            TEXT              -- "Local Dev", "Staging", "Production", "Legacy Codebase"
  description     TEXT              -- flavour text
  level_range     INT[]             -- [min_level, max_level] recommendation

npc_area_spawns
  area_id         TEXT (FK → npc_areas)
  npc_def_id      TEXT (FK → npc_definitions)
  spawn_weight    INT               -- relative probability
  PRIMARY KEY (area_id, npc_def_id)

combat_logs
  id              UUID (PK)
  attacker_id     UUID (FK → players)
  defender_type   TEXT              -- "npc" | "player"
  defender_id     TEXT              -- npc_def_id or player UUID
  outcome         TEXT              -- "win", "lose", "flee"
  damage_dealt    INT
  damage_taken    INT
  xp_gained       INT
  credits_gained  INT
  loot            JSONB | NULL      -- items and gems received
  created_at      TIMESTAMPTZ
```

**Open PvP (Hackathon battles)**: Any developer can challenge any other developer. Uses the same CombatService damage formulas as PvE but with the defender's effective stats (including equipment and gems). Defender loses uptime but not items or credits on defeat. Thematically: you're competing at a hackathon, not stealing each other's laptops.

### 7.5 Tasks

```
task_definitions                    -- Registry: Dev work templates
  id              TEXT (PK)         -- e.g. "write_migration", "review_pr"
  name            TEXT              -- e.g. "Write DB Migration", "Review Pull Request"
  description     TEXT              -- flavour text
  skill_id        TEXT              -- "debugging", "data_mining", or "architecture"
  level_required  INT               -- minimum skill level
  focus_cost      INT               -- focus consumed on attempt
  success_rate    FLOAT             -- base chance (0.0–1.0), modified by skill level & serendipity
  rewards         JSONB             -- { "credits": [10,20], "xp": 25, "skill_xp": 15, "items": [...] }
  gem_rewards     JSONB | NULL      -- [{ "gem_def_id": "ruby_t1", "chance": 0.15 }] — mainly for data_mining tasks
  failure_penalty JSONB | NULL      -- { "credits": 0, "xp": 5 } (reduced rewards on fail)

task_logs
  id              UUID (PK)
  player_id       UUID (FK → players)
  task_def_id     TEXT (FK → task_definitions)
  outcome         TEXT              -- "success" | "failure"
  rewards_given   JSONB
  created_at      TIMESTAMPTZ
```

Tasks are instant: click to attempt → focus is deducted → success/fail roll → rewards granted. No timers.

Data Mining tasks are the primary source of gems. Higher skill level and serendipity stat increase gem drop chance and probability of higher-tier gems.

### 7.6 Chat

```
chat_messages
  id              UUID (PK)
  channel         TEXT              -- "general", "environment:{area_id}", "dm:{sorted_player_ids}"
  sender_id       UUID (FK → players)
  content         TEXT
  created_at      TIMESTAMPTZ

  -- Index on (channel, created_at)
  -- Supabase Realtime listens on INSERT
```

---

## 8. Gem system design

### 8.1 Gem types

| Gem | Stat bonus | Theme |
|---|---|---|
| Ruby | +Logic | Raw problem-solving power |
| Sapphire | +Resilience | Defensive, hardened infrastructure |
| Diamond | +Max Uptime | Reliability, high availability |
| Emerald | +Serendipity | Lucky finds, better drop rates |

### 8.2 Gem tiers

| Tier | Name | Bonus | Source |
|---|---|---|---|
| 1 | Rough | +2 | Data Mining tasks, Bug drops |
| 2 | Cut | +5 | Architecture (crafting upgrade from Rough) |
| 3 | Flawless | +10 | Architecture (crafting upgrade from Cut, high skill required) |

### 8.3 Effective stats calculation

```
EffectiveStats = BaseStats
  + sum(equipped_item.base_stats for each equipped item)
  + sum(gem.stat_bonus for each gem socketed in equipped items)
```

Computed by the `StatsCalculator` utility. Query path:
1. Fetch `player_stats` (base).
2. Fetch `player_inventory WHERE is_equipped = true` joined with `item_definitions`.
3. Fetch `inventory_gems` for those equipped items, joined with `gem_definitions`.
4. Sum all three into `EffectiveStats`.

### 8.4 Socketing rules

- An item's `gem_slot_count` determines capacity (0 for most items, 1–3 for weapons and armor).
- Socketing is permanent (for now). Removal/replacement can be added later as an Architecture crafting feature.
- Gems are consumed on socketing — they leave inventory and become `inventory_gems` rows.
- One gem per slot index. Slot must be empty.

---

## 9. Effect-TS patterns

### 9.1 Service definition pattern

```typescript
// 1. Tagged error types
export class BugNotFound extends Data.TaggedError("BugNotFound")<{
  readonly bugId: string
}> {}

// 2. Service interface via Context.Tag
export class CombatService extends Context.Tag("CombatService")<
  CombatService,
  {
    readonly attackBug: (playerId: string, areaId: string) =>
      Effect.Effect<CombatResult, PlayerNotFound | InsufficientResource | BugNotFound>
  }
>() {}

// 3. Concrete implementation as a Layer
export const CombatServiceLive = Layer.effect(
  CombatService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient
    return {
      attackBug: (playerId, areaId) => Effect.gen(function* () {
        // ... implementation
      })
    }
  })
)
```

### 9.2 Service composition pattern

```typescript
const buyTool = (playerId: string, itemId: string) =>
  Effect.gen(function* () {
    const player = yield* PlayerService
    const inventory = yield* InventoryService
    const registry = yield* ItemRegistry

    const item = yield* registry.getItem(itemId)
    yield* player.spendResource(playerId, "credits", item.baseValue)
    yield* inventory.addItem(playerId, itemId)

    return { itemId, creditsPaid: item.baseValue }
  })
```

### 9.3 Layer composition

```typescript
const AppLayer = Layer.mergeAll(
  PlayerServiceLive,
  InventoryServiceLive,
  ItemRegistryLive,
  ShopServiceLive,
  CombatServiceLive,
  TaskServiceLive,
  ChatServiceLive,
  SupabaseClientLive,
)
```

### 9.4 Error handling in Edge Functions

```typescript
const handleRequest = (req: Request) =>
  program.pipe(
    Effect.provide(AppLayer),
    Effect.match({
      onSuccess: (data) => new Response(JSON.stringify(data), { status: 200 }),
      onFailure: (error) => {
        switch (error._tag) {
          case "PlayerNotFound":       return new Response(..., { status: 404 })
          case "InsufficientResource": return new Response(..., { status: 422 })
          case "NotAuthorized":        return new Response(..., { status: 403 })
          case "GemSlotOccupied":      return new Response(..., { status: 409 })
          default:                     return new Response(..., { status: 500 })
        }
      }
    })
  )
```

### 9.5 Admin check pattern

```typescript
const adminOnly = <A, E>(
  playerId: string,
  action: Effect.Effect<A, E, PlayerService>
) =>
  Effect.gen(function* () {
    const player = yield* PlayerService
    const profile = yield* player.getProfile(playerId)
    if (!profile.isAdmin) {
      return yield* Effect.fail(new NotAuthorized({ playerId }))
    }
    return yield* action
  })
```

---

## 10. Implementation phases

### Phase 1 — Foundation
- Supabase project setup (local dev via CLI)
- Database migrations: all tables from §7
- Seed file: admin user, all item/gem/bug/task/shop definitions
- Type generation with `supabase gen types`
- SupabaseClient Layer for Effect-TS
- StatsCalculator utility (pure function)
- ItemRegistry service (read-only — items, gems, bugs, tasks)
- PlayerService (profile, stats, resources, skills, admin flag)
- InventoryService (storage, equip/unequip, gem socketing)
- First Edge Function: create profile on signup (seeds skills + resources)
- Basic Next.js shell with auth flow

### Phase 2 — Economy
- ShopService (buy, sell from Package Registry / Extension Marketplace / Cloud Console)
- Edge Functions: buy-item, sell-item
- TaskService (attempt task, instant rolls, rewards, gem drops from Data Mining)
- Edge Functions: attempt-task
- Client pages: shops, tasks, inventory with gem socketing

### Phase 3 — Combat
- CombatService (PvE: bug encounters in environments, damage calc, loot)
- PvP extension (hackathon challenges, any-player targeting, no loot loss)
- Edge Functions: attack-bug, challenge-player
- Client pages: environments, combat

### Phase 4 — Live features
- ChatService + Supabase Realtime (#general, #environment, DMs)
- CronService + pg_cron for Focus replenishment
- Client: chat UI, resource timers

### Phase 5 — Admin & polish
- AdminService (CRUD for all registry data, user management, `is_admin` gating)
- Admin UI (Next.js `/admin` route group)
- Balancing tools (adjust gem bonuses, drop rates, bug stats, task rewards)

---

## 11. Resolved design decisions

| Question | Decision | Rationale |
|---|---|---|
| Inventory capacity | Unlimited | No slot constraints. Client paginates. |
| PvP consent | Open PvP — any player can challenge any player | Hackathon theme. Defender loses uptime, not items/credits. |
| Task timing | Instant | Click → immediate result. No timers. |
| Skills | Debugging, Data Mining, Architecture | Maps to the dev theme. Data Mining → gems, Architecture → crafting. |
| Item customization | Gem socket system | 0–3 slots. Ruby/Sapphire/Diamond/Emerald. 3 tiers. Permanent socketing. |
| Admin system | `is_admin` flag on players table | Same user, same auth. Admin endpoints check the flag. |
| Seeding | `supabase/seed.sql` | Seeds admin user + all game content. Content balancing via seed edits + `db reset`. |
| Theme | Developer learning Supabase | Bugs for PvE, dev tools for items, environments for areas, hackathons for PvP. |