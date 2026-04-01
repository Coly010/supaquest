# CLAUDE.md — SupaQuest

This file is the primary reference for Claude Code when working on this project. Read `design-docs/001-architecture.md` for full design details — this file covers how to build, what conventions to follow, and what patterns to use.

---

## Project overview

SupaQuest is a text-based MMORPG themed around a developer learning Supabase. It uses Effect-TS for the service layer, Supabase for auth/database/realtime/edge functions, and Next.js for the client. The game has bugs to fight (PvE), hackathon challenges (PvP), dev tasks to complete, shops to buy tools from, and a gem socketing system for item customization.

The architecture follows a strict layered approach: Next.js client → Supabase Edge Functions → Effect-TS service layer → PostgreSQL. The client never writes game state directly — all mutations go through Edge Functions. The client reads game state via the Supabase JS client, protected by RLS.

---

## Project structure

```
supaquest/
├── design-docs/001-architecture.md              # Full system design — read this first
├── CLAUDE.md                    # This file
├── supabase/
│   ├── config.toml              # Supabase local dev config
│   ├── migrations/              # Numbered SQL migrations
│   │   ├── 001_players.sql
│   │   ├── 002_items_and_gems.sql
│   │   ├── 003_inventory.sql
│   │   ├── 004_shops.sql
│   │   ├── 005_npcs_and_combat.sql
│   │   ├── 006_tasks.sql
│   │   └── 007_chat.sql
│   ├── seed.sql                 # Admin user + all game content
│   └── functions/               # Edge Functions (Deno)
│       ├── _shared/             # Shared code across functions
│       │   ├── supabase.ts      # Supabase client init (service role)
│       │   ├── auth.ts          # JWT validation helper
│       │   ├── respond.ts       # Standard response helpers
│       │   └── effect-runner.ts # Run Effect program → HTTP Response
│       ├── create-profile/
│       │   └── index.ts
│       ├── buy-item/
│       │   └── index.ts
│       ├── sell-item/
│       │   └── index.ts
│       ├── attempt-task/
│       │   └── index.ts
│       ├── attack-bug/
│       │   └── index.ts
│       ├── challenge-player/
│       │   └── index.ts
│       ├── equip-item/
│       │   └── index.ts
│       ├── unequip-item/
│       │   └── index.ts
│       ├── socket-gem/
│       │   └── index.ts
│       ├── send-message/
│       │   └── index.ts
│       └── admin/
│           ├── update-item/
│           │   └── index.ts
│           └── ...
├── src/                         # Next.js app + Effect-TS services
│   ├── app/                     # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx             # Landing / auth
│   │   ├── (game)/              # Authenticated game routes
│   │   │   ├── layout.tsx       # Game shell with nav
│   │   │   ├── dashboard/
│   │   │   ├── inventory/
│   │   │   ├── shops/
│   │   │   ├── tasks/
│   │   │   ├── environments/
│   │   │   ├── combat/
│   │   │   └── chat/
│   │   └── admin/               # Admin routes (check is_admin client-side)
│   │       ├── layout.tsx
│   │       ├── items/
│   │       ├── bugs/
│   │       ├── tasks/
│   │       └── players/
│   ├── lib/                     # Shared client-side utilities
│   │   ├── supabase/
│   │   │   ├── client.ts        # Browser Supabase client
│   │   │   ├── server.ts        # Server component Supabase client
│   │   │   └── types.ts         # Re-export generated types
│   │   └── api.ts               # Edge Function call helpers
│   ├── services/                # Effect-TS service layer
│   │   ├── errors.ts            # All tagged error types
│   │   ├── SupabaseClient.ts    # Supabase client as Effect Layer
│   │   ├── StatsCalculator.ts   # Pure function: base + equipment + gems → effective stats
│   │   ├── ItemRegistry.ts      # Read-only registry for items, gems, bugs, tasks
│   │   ├── PlayerService.ts     # Profile, stats, skills, resources, admin flag
│   │   ├── InventoryService.ts  # Storage, equip/unequip, gem socketing
│   │   ├── ShopService.ts       # Buy/sell from shops
│   │   ├── CombatService.ts     # PvE bug fights + PvP hackathon challenges
│   │   ├── TaskService.ts       # Dev task attempts, instant rolls, rewards
│   │   ├── ChatService.ts       # Message storage + Realtime
│   │   ├── CronService.ts       # Focus replenishment
│   │   ├── AdminService.ts      # Admin operations (gated by is_admin)
│   │   └── AppLayer.ts          # Composed Layer of all services
│   └── components/              # React components
│       ├── ui/                  # Generic UI primitives
│       └── game/                # Game-specific components
└── package.json
```

---

## Commands

### Supabase CLI

```bash
# Start local Supabase (Postgres, Auth, Realtime, Edge Functions)
supabase start

# Stop local Supabase
supabase stop

# Apply migrations and re-seed (destructive — resets all data)
supabase db reset

# Create a new migration
supabase migration new <name>

# Generate TypeScript types from current schema
supabase gen types typescript --local 2>/dev/null > src/lib/supabase/types.ts

# Serve Edge Functions locally (hot reload)
supabase functions serve

# Deploy a single Edge Function
supabase functions deploy <function-name>
```

### Next.js

```bash
# Dev server
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit
```

### Testing

```bash
# Unit tests (Effect-TS services, pure functions)
pnpm vitest run

# E2E / Playwright tests (requires Supabase + Next.js running)
pnpm playwright test

# Run a specific spec file
pnpm playwright test e2e/shops.spec.ts
```

### Workflow

After any schema change:
1. Create migration: `supabase migration new <descriptive_name>`
2. Write SQL in the new migration file
3. Reset to apply: `supabase db reset`
4. Regenerate types: `supabase gen types typescript --local 2>/dev/null > src/lib/supabase/types.ts`
5. Update any affected service implementations

---

## Coding conventions

### Testing requirements (mandatory)

Every implementation task must include tests. **Do not mark work complete without running both:**

```bash
pnpm vitest run          # must pass
pnpm playwright test     # must pass
```

Coverage expectations:
- **New Effect-TS service** → unit tests in `src/services/*.spec.ts` covering happy path and each tagged error type.
- **New Edge Function** → Playwright e2e test in `e2e/<feature>.spec.ts` covering: page renders, a mutation call (buy/equip/attempt/etc.), and response feedback (success message, UI update).
- **New UI page** → at minimum a Playwright test verifying the page renders key content.
- **Pure functions** (like StatsCalculator) → vitest unit tests with multiple input scenarios.

E2E test patterns:
- Use `storageState: "e2e/.auth/admin.json"` (already set on the `authenticated` project in `playwright.config.ts`).
- Seed test data via admin Supabase client in `test.beforeAll` — do not rely on other test files' side effects.
- Add new spec files to the `testMatch` array in `playwright.config.ts` under the `authenticated` project.

### General

- TypeScript strict mode everywhere.
- No `any` types. Use `unknown` and narrow.
- Prefer `const` over `let`. Never use `var`.
- Use named exports, not default exports (exception: Next.js pages which require default exports).
- File names: kebab-case for files, PascalCase for components and services.

### Effect-TS patterns

This project uses Effect-TS for the entire service layer. Here are the key patterns — if you're unfamiliar with Effect, reference https://effect.website/docs/getting-started/introduction.

**Service definition**: Every service follows this exact structure:

```typescript
// In services/MyService.ts

import { Context, Data, Effect, Layer } from "effect"

// 1. Tagged errors — one class per failure mode
export class ThingNotFound extends Data.TaggedError("ThingNotFound")<{
  readonly id: string
}> {}

// 2. Service interface
export class MyService extends Context.Tag("MyService")<
  MyService,
  {
    readonly getThing: (id: string) => Effect.Effect<Thing, ThingNotFound>
    readonly doAction: (input: Input) => Effect.Effect<Output, SomeError | OtherError>
  }
>() {}

// 3. Live implementation
export const MyServiceLive = Layer.effect(
  MyService,
  Effect.gen(function* () {
    const supabase = yield* SupabaseClient
    // Resolve other service dependencies here if needed

    return {
      getThing: (id) =>
        Effect.gen(function* () {
          const { data, error } = yield* Effect.promise(() =>
            supabase.from("things").select("*").eq("id", id).single()
          )
          if (error || !data) {
            return yield* Effect.fail(new ThingNotFound({ id }))
          }
          return data
        }),

      doAction: (input) =>
        Effect.gen(function* () {
          // ... implementation
        }),
    }
  })
)
```

**Service composition**: Services depend on each other through `yield*`:

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

**Error types are always tagged**: Use `Data.TaggedError` so errors can be pattern-matched in Edge Function handlers via `error._tag`.

**Layer composition**: All services are wired together in `AppLayer.ts`:

```typescript
export const AppLayer = Layer.mergeAll(
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

**Running Effects in Edge Functions**: Use the shared `effect-runner.ts` helper:

```typescript
// In supabase/functions/buy-item/index.ts
import { Effect } from "effect"
import { AppLayer } from "../_shared/app-layer.ts"
import { runEffect } from "../_shared/effect-runner.ts"
import { authenticate } from "../_shared/auth.ts"
import { ShopService } from "../_shared/services/ShopService.ts"

Deno.serve(async (req) => {
  const playerId = await authenticate(req)
  const { itemId } = await req.json()

  return runEffect(
    Effect.gen(function* () {
      const shop = yield* ShopService
      return yield* shop.buyItem(playerId, itemId)
    }),
    AppLayer
  )
})
```

### Database conventions

- Table names: snake_case, plural (`players`, `player_stats`, `item_definitions`).
- Column names: snake_case (`player_id`, `item_def_id`, `gem_slot_count`).
- Primary keys: `id` for standalone tables, composite keys for join tables.
- Foreign keys: always include `ON DELETE CASCADE` for player-owned data.
- Always enable RLS on player-facing tables. Registry tables (item_definitions, gem_definitions, etc.) can allow public SELECT since they're read-only game content.
- Use JSONB for flexible structured data (loot tables, stat bonuses, rewards).
- Timestamps: always `TIMESTAMPTZ`, default `now()`.

### SQL migration conventions

- One concern per migration file. Don't mix table creation with RLS policies in different files.
- Always include RLS policies in the same migration that creates the table.
- Use descriptive names: `001_players.sql`, not `001_init.sql`.
- Include comments at the top of each migration explaining what it does.

### Edge Function conventions

- Each function is a directory with an `index.ts`.
- Functions are thin — authenticate, extract params, delegate to service, return response.
- Always validate input before passing to service layer.
- Use the shared `_shared/` directory for common code.
- Admin functions go under `admin/` subdirectory and must call the admin check pattern.

### Next.js conventions

- Server components by default. Add `"use client"` only when needed.
- Use the Supabase SSR client for server components, browser client for client components.
- Edge Function calls go through `src/lib/api.ts` helpers.
- Game routes are grouped under `(game)/` with a shared layout.
- Admin routes are grouped under `admin/` with their own layout and client-side `is_admin` gate.

---

## Themed terminology

Always use the themed names in code, UI, and comments:

| Generic | Themed | DB column / code |
|---|---|---|
| Strength | Logic | `logic` |
| Defense | Resilience | `resilience` |
| Speed | Throughput | `throughput` |
| Luck | Serendipity | `serendipity` |
| Max Health | Max Uptime | `max_uptime` |
| Health (resource) | Uptime | `"uptime"` |
| Energy | Focus | `"focus"` |
| Gold | Credits | `"credits"` |
| Combat (skill) | Debugging | `"debugging"` |
| Mining (skill) | Data Mining | `"data_mining"` |
| Crafting (skill) | Architecture | `"architecture"` |
| NPC / Enemy | Bug | — |
| Area / Zone | Environment | — |
| PvP | Hackathon challenge | — |
| Level | Seniority | UI only — DB column is still `level` |

---

## Service dependency graph

```
ItemRegistry (no dependencies — implement first)
    ↑
PlayerService (depends on InventoryService for effective stats via StatsCalculator)
    ↑
InventoryService (depends on PlayerService for validation, ItemRegistry for definitions)
    ↑
ShopService (depends on PlayerService, InventoryService, ItemRegistry)
TaskService (depends on PlayerService, InventoryService)
CombatService (depends on PlayerService, InventoryService)
ChatService (depends on PlayerService for display names)
CronService (depends on PlayerService for batch updates)
AdminService (depends on all — gated by is_admin flag)
```

**Circular dependency resolution**: PlayerService and InventoryService have a potential cycle. It's resolved by `StatsCalculator` — a pure function in `src/services/StatsCalculator.ts` that takes `(baseStats, equippedItems, socketedGems)` and returns `EffectiveStats`. Neither service depends on the other for stat logic.

---

## Implementation order

Follow this order. Each step should be a working, testable increment.

### Phase 1 — Foundation ✅ Complete

1. ✅ `supabase init` + local dev setup
2. ✅ Migration `001_players.sql` — players, player_stats, player_skills, player_resources + RLS
3. ✅ Migration `002_items_and_gems.sql` — item_definitions, gem_definitions + public SELECT RLS
4. ✅ Migration `003_inventory.sql` — player_inventory, inventory_gems + RLS
5. ✅ `seed.sql` — full game content (items, gems, shops, tasks, bugs, environments, chat)
6. ✅ `supabase gen types` → `src/lib/supabase/types.ts`
7. ✅ `src/services/errors.ts` — all tagged error types
8. ✅ `src/services/SupabaseClient.ts` — Supabase client as Effect Layer
9. ✅ `src/services/StatsCalculator.ts` — pure function
10. ✅ `src/services/ItemRegistry.ts` — read-only queries for items, gems
11. ✅ `src/services/PlayerService.ts` — profile, stats, resources, skills
12. ✅ `src/services/InventoryService.ts` — storage, equip/unequip, gem socketing
13. ✅ First Edge Function: `create-profile` (called after Supabase Auth signup)
14. ✅ Next.js: auth pages (signup/login), basic game shell layout

> **Note:** All 7 migrations (001–007) and the full seed were created during Phase 1.
> The database schema for Phases 2–5 is already in place. Only the service layer,
> Edge Functions, and UI remain for those phases.

---

### Phase 2 — Economy ✅ Complete

15. ✅ `src/services/ShopService.ts`
16. ✅ Edge Functions: `buy-item`, `sell-item`
17. ✅ Edge Functions: `equip-item`, `unequip-item`, `socket-gem`
18. ✅ `src/services/TaskService.ts`
19. ✅ Edge Function: `attempt-task`
20. ✅ Next.js: shop pages, task pages, inventory page with gem socketing UI

### Phase 3 — Combat ✅ Complete

21. ✅ `src/services/CombatService.ts`
22. ✅ Edge Functions: `attack-bug`, `challenge-player`
23. ✅ Next.js: environment browser, combat page

### Phase 4 — Live features ✅ Complete

24. ✅ `src/services/ChatService.ts`
25. ✅ Edge Function: `send-message`
26. ✅ `src/services/CronService.ts` + pg_cron setup for Focus replenishment (`009_focus_replenishment.sql`)
27. ✅ Next.js: chat UI (`/chat`), Focus + Uptime resource bar in game layout

### Phase 5 — Admin ✅ Complete

28. ✅ Migration `010_admin_rls.sql` — admin SELECT policy on players table
29. ✅ `src/services/AdminService.ts` + Deno mirror (`supabase/functions/_shared/services/AdminService.ts`)
30. ✅ Admin Edge Functions: `admin/update-item`, `admin/update-bug`, `admin/update-task`, `admin/grant-admin`, `admin/revoke-admin`, `admin/adjust-player-resource`
31. ✅ Next.js: `/admin` layout (auth gate), overview dashboard, items/bugs/tasks list + edit pages, players page with grant/revoke/adjust-resource
32. ✅ E2E: `e2e/admin.spec.ts`

---

## Key reminders

- **Always regenerate types after schema changes**: `supabase gen types typescript --local 2>/dev/null > src/lib/supabase/types.ts`
- **All game mutations go through Edge Functions**, never direct client writes.
- **RLS protects reads**, Edge Functions protect writes.
- **Effect errors are typed** — every service method's return type explicitly lists its failure modes. Don't use `Effect.tryPromise` with generic `Error` — wrap Supabase errors in tagged error classes.
- **Transactions for multi-step writes** — use `supabase.rpc()` to call PL/pgSQL functions for operations like buy-item (deduct credits + add inventory) to ensure atomicity.
- **Admin is a flag, not a role** — check `players.is_admin` in admin Edge Functions. No separate auth flow.
- **The seed file is the content database** — item stats, bug stats, drop rates, shop prices all live in `seed.sql`. Edit and `supabase db reset` to rebalance.
- **Effect-TS docs**: https://effect.website/docs/getting-started/introduction — reference when implementing new services or when unsure about a pattern.
- **Document Design In @design-docs**: Create new docs indicating systems design and purposes within the directory.