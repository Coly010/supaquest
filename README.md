# SupaQuest

A text-based MMORPG themed around a developer learning Supabase. Fight bugs (PvE), take on hackathon challenges (PvP), complete dev tasks, buy tools from shops, and customize gear with gem socketing — all powered by Supabase Auth, Postgres, Realtime, and Edge Functions, with an Effect-TS service layer and a Next.js 15 frontend.

## Quick start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | latest | https://www.docker.com/products/docker-desktop |
| Node.js | ≥ 20 | https://nodejs.org |
| pnpm | ≥ 9 | `npm i -g pnpm` |
| Supabase CLI | ≥ 2.x | `npm i -g supabase` |

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase (Postgres, Auth, Realtime, Edge Functions)
#    Requires Docker Desktop to be running
supabase start

# 3. Copy the env template and fill in the values printed by `supabase start`
cp .env.local.example .env.local
# From the "Authentication Keys" table in the output:
#   Publishable → NEXT_PUBLIC_SUPABASE_ANON_KEY
#   Secret      → SUPABASE_SERVICE_ROLE_KEY
# Project URL is always http://127.0.0.1:54321 for local dev

# 4. Apply all migrations and seed game content (destructive — resets data)
supabase db reset

# 5. Regenerate TypeScript types from the local schema
pnpm run gen:types

# 6. Start the dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The seed creates an admin account — check `supabase/seed.sql` for credentials.

### Key commands

| Command | What it does |
|---------|-------------|
| `supabase start` | Start local Supabase stack (Docker required) |
| `supabase stop` | Stop local Supabase stack |
| `supabase db reset` | Re-apply all migrations + seed (resets data) |
| `supabase functions serve` | Serve Edge Functions locally with hot reload |
| `pnpm dev` | Start Next.js dev server |
| `pnpm build` | Production build |
| `pnpm run typecheck` | TypeScript type check |
| `pnpm test` | Run Vitest unit tests |
| `pnpm playwright test` | Run Playwright e2e tests (requires Supabase + Next.js running) |
| `pnpm run gen:types` | Regenerate `src/lib/supabase/types.ts` |

### Schema change workflow

```bash
supabase migration new <descriptive_name>   # 1. create migration file
# ... write SQL ...
supabase db reset                           # 2. apply migrations + reseed
pnpm run gen:types                          # 3. regenerate types
# ... update affected services ...
```

---

## Supabase features

### Auth

Supabase Auth handles all user identity. After signup, a `create-profile` Edge Function is triggered to provision the player record, stats, skills, and starting resources. JWT tokens are validated inside every Edge Function using `supabase.auth.getUser()` before any game action runs — unauthenticated requests are rejected at the function boundary.

The Next.js client uses `@supabase/ssr` to share the session between server components and client components. Server components read game state via a server-side Supabase client (cookie-based); client components use a browser client initialized from the same session.

### PostgreSQL + migrations

All game state lives in PostgreSQL. The schema is managed through numbered migration files under `supabase/migrations/` and applied (along with `seed.sql`) via `supabase db reset`. Migrations cover:

- `players`, `player_stats`, `player_skills`, `player_resources` — the player model
- `item_definitions`, `gem_definitions` — read-only game registries
- `player_inventory`, `inventory_gems` — per-player item storage and gem socketing
- `shops`, `shop_inventory` — shop definitions and stock
- `npc_definitions`, `npc_areas`, `npc_area_spawns`, `combat_logs` — bug enemies and environments
- `task_definitions`, `task_logs` — dev task content and history
- `chat_messages` — real-time chat storage

Multi-step mutations (buy item = deduct credits + add inventory row) call PL/pgSQL functions via `supabase.rpc()` to keep writes atomic.

### Row Level Security (RLS)

RLS is the client-side security layer. All player-facing tables have policies that restrict SELECT to the row owner (`auth.uid() = player_id`). Game content tables like `item_definitions` and `npc_definitions` allow public SELECT since they're read-only reference data.

The client reads game state directly via the JS client — no API layer needed for reads. All writes go through Edge Functions, which use the service role key and operate outside RLS. This keeps the client thin: it reads via RLS-protected queries and sends actions to functions.

### Edge Functions

Every game mutation is an Edge Function (Deno). The client never writes to the database directly. Functions cover:

- `create-profile` — provisions a new player after auth signup
- `buy-item` / `sell-item` — shop transactions
- `equip-item` / `unequip-item` / `socket-gem` — inventory management
- `attempt-task` — dev task resolution with skill checks and rewards
- `attack-bug` / `challenge-player` — PvE and PvP combat
- `send-message` — chat
- `admin/*` — admin CRUD and player management (gated by `is_admin` flag)

Each function authenticates the request, extracts parameters, delegates to the Effect-TS service layer, and maps typed errors to HTTP status codes. Business logic doesn't live in the function — it's kept in the service layer so it can be unit tested independently.

### Realtime

The chat system (`/chat`) subscribes to the `chat_messages` table using Supabase Realtime. A Postgres `INSERT` on `chat_messages` broadcasts the new row to all subscribed clients immediately, without polling. The subscription filters by channel name so clients only receive messages for the channel they're viewing (`#general`, `#environment:{area}`, or a DM thread).

### pg_cron

Focus (the game's energy resource) replenishes over time via a cron job scheduled with pg_cron. The cron runs on an interval and calls a PL/pgSQL function that updates `player_resources` for all players, capping at their maximum Focus. This is set up in migration `009_focus_replenishment.sql` and managed by `CronService` in the Effect-TS layer.

### Type generation

`src/lib/supabase/types.ts` is auto-generated from the live local schema using `supabase gen types typescript --local`. It is committed to git so the repo can be cloned and built without Supabase running, and so TypeScript will catch schema drift at compile time. Regenerate it after every schema change with `pnpm run gen:types`.

---

## Further reading

- [`CLAUDE.md`](./CLAUDE.md) — coding conventions, Effect-TS patterns, database conventions
- [`design-docs/001-architecture.md`](./design-docs/001-architecture.md) — full system design: data model, service layer, Edge Function contracts, RLS strategy
