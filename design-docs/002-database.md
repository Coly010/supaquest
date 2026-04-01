# Database — SupaQuest Schema Reference

> Covers the fully implemented schema as of Phases 1–4.
> For the original design intent see `001-architecture.md §7`.
> Run `supabase db reset` to apply all migrations + seed data from scratch.

---

## Migrations overview

| File | What it creates |
|---|---|
| `001_players.sql` | `players`, `player_stats`, `player_skills`, `player_resources` + RLS |
| `002_items_and_gems.sql` | `item_definitions`, `gem_definitions` + public SELECT RLS |
| `003_inventory.sql` | `player_inventory`, `inventory_gems` + RLS |
| `004_shops.sql` | `shops`, `shop_inventory` + public SELECT RLS |
| `005_npcs_and_combat.sql` | `npc_definitions`, `npc_areas`, `npc_area_spawns`, `combat_logs` + RLS |
| `006_tasks.sql` | `task_definitions`, `task_logs` + RLS |
| `007_chat.sql` | `chat_messages` + RLS |
| `008_game_rpcs.sql` | Gem rows in `item_definitions` + `buy_item()` / `sell_item()` PL/pgSQL RPCs |
| `009_focus_replenishment.sql` | `replenish_all_focus()` + `replenish_player_focus(UUID)` PL/pgSQL functions + pg_cron schedule (every 10 min) |

---

## Tables

### `players`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()   -- mirrors auth.users.id
username      TEXT UNIQUE NOT NULL
display_name  TEXT NOT NULL
level         INT NOT NULL DEFAULT 1
xp            INT NOT NULL DEFAULT 0
xp_to_next    INT NOT NULL DEFAULT 100
is_admin      BOOLEAN NOT NULL DEFAULT false
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

RLS: player can SELECT/UPDATE their own row.

---

### `player_stats`

```sql
player_id     UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE
logic         INT NOT NULL DEFAULT 10    -- Strength (themed)
resilience    INT NOT NULL DEFAULT 10    -- Defense (themed)
throughput    INT NOT NULL DEFAULT 10    -- Speed (themed)
serendipity   INT NOT NULL DEFAULT 10    -- Luck (themed)
max_uptime    INT NOT NULL DEFAULT 100   -- Max Health (themed)
```

RLS: player can SELECT/UPDATE their own row.

---

### `player_skills`

```sql
player_id     UUID REFERENCES players(id) ON DELETE CASCADE
skill_id      TEXT NOT NULL              -- "debugging" | "data_mining" | "architecture"
level         INT NOT NULL DEFAULT 1
xp            INT NOT NULL DEFAULT 0
xp_to_next    INT NOT NULL DEFAULT 50
PRIMARY KEY (player_id, skill_id)
```

Seeded with 3 rows per player on profile creation (via `create-profile` Edge Function).
RLS: player can SELECT their own rows.

---

### `player_resources`

```sql
player_id       UUID REFERENCES players(id) ON DELETE CASCADE
resource_type   TEXT NOT NULL             -- "focus" | "uptime" | "credits"
current         INT NOT NULL
maximum         INT                       -- NULL = uncapped (credits is uncapped)
last_replenish  TIMESTAMPTZ NOT NULL DEFAULT now()
PRIMARY KEY (player_id, resource_type)
```

Starting values set by `create-profile`:
- `focus`: current=100, maximum=100
- `uptime`: current=100, maximum=100
- `credits`: current=50, maximum=NULL

RLS: player can SELECT/UPDATE their own rows.

---

### `item_definitions`

```sql
id              TEXT PRIMARY KEY
name            TEXT NOT NULL
description     TEXT NOT NULL
item_type       TEXT NOT NULL   -- "weapon" | "armor" | "consumable" | "material" | "gem"
slot            TEXT            -- "main_hand" | "off_hand" | "head" | "chest" | "legs" | "feet" | NULL
base_stats      JSONB NOT NULL DEFAULT '{}'   -- { "logic": 5, "resilience": 0, ... }
level_required  INT NOT NULL DEFAULT 1
base_value      INT NOT NULL DEFAULT 0
stackable       BOOLEAN NOT NULL DEFAULT false
gem_slot_count  INT NOT NULL DEFAULT 0
```

RLS: public SELECT (read-only registry). No INSERT/UPDATE from client.

**Note on gems**: As of migration `008`, all 12 gem varieties (ruby/sapphire/diamond/emerald × t1-t3) are rows here with `item_type = 'gem'`. This is required because `player_inventory.item_def_id` is a FK to this table — gems must live here to be storable in a player's inventory before socketing.

---

### `gem_definitions`

```sql
id          TEXT PRIMARY KEY         -- mirrors item_definitions.id, e.g. "ruby_t1"
name        TEXT NOT NULL
description TEXT NOT NULL
gem_type    TEXT NOT NULL            -- "ruby" | "sapphire" | "diamond" | "emerald"
stat_bonus  JSONB NOT NULL           -- { "logic": 5 } (the bonus when socketed)
tier        INT NOT NULL DEFAULT 1   -- 1=Rough, 2=Cut, 3=Flawless
base_value  INT NOT NULL DEFAULT 0
```

RLS: public SELECT. Separate from `item_definitions` to keep stat bonus data clean.

The `id` values are the same as in `item_definitions` (e.g., `"ruby_t1"`). When a gem is socketed, `inventory_gems.gem_def_id` points here to fetch the `stat_bonus`.

---

### `player_inventory`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE
item_def_id   TEXT NOT NULL REFERENCES item_definitions(id)
quantity      INT NOT NULL DEFAULT 1
is_equipped   BOOLEAN NOT NULL DEFAULT false
equipped_slot TEXT                    -- set when is_equipped = true
acquired_at   TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE (player_id, equipped_slot) WHERE is_equipped = true
```

The unique partial index prevents two items in the same slot.

**Stackable items** (consumables, materials, gems): `InventoryService.addItem` and the `buy_item` RPC both check `item_definitions.stackable` and increment an existing row rather than insert a new one when `stackable = true`.

RLS: player can SELECT/INSERT/UPDATE/DELETE their own rows.

---

### `inventory_gems`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
inventory_id  UUID NOT NULL REFERENCES player_inventory(id) ON DELETE CASCADE
gem_def_id    TEXT NOT NULL REFERENCES gem_definitions(id)
slot_index    INT NOT NULL              -- 0-based index
socketed_at   TIMESTAMPTZ NOT NULL DEFAULT now()

UNIQUE (inventory_id, slot_index)
```

Populated by `InventoryService.socketGem`. The gem item row is deleted from `player_inventory` on socketing — gems are consumed.

RLS: player can SELECT/INSERT rows for their own inventory items.

---

### `shops`

```sql
id          TEXT PRIMARY KEY    -- "package_registry" | "extension_marketplace" | "cloud_console"
name        TEXT NOT NULL
description TEXT NOT NULL
```

RLS: public SELECT.

---

### `shop_inventory`

```sql
shop_id       TEXT REFERENCES shops(id)
item_def_id   TEXT REFERENCES item_definitions(id)
price_buy     INT NOT NULL
price_sell    INT NOT NULL      -- what the shop pays the player on sell
stock         INT               -- NULL = unlimited
PRIMARY KEY (shop_id, item_def_id)
```

RLS: public SELECT.

The `sell_item` RPC uses `MAX(price_sell)` across all shops carrying an item as the sell price. If the item isn't in any shop, it falls back to `FLOOR(base_value / 2)`.

---

### `npc_definitions`

```sql
id              TEXT PRIMARY KEY      -- e.g. "typo_bug", "heisenbug"
name            TEXT NOT NULL
description     TEXT NOT NULL
level           INT NOT NULL
stats           JSONB NOT NULL        -- { "logic": 15, "resilience": 10, "throughput": 8, "serendipity": 3 }
uptime          INT NOT NULL          -- bug's HP pool
loot_table      JSONB NOT NULL        -- [{ "item_def_id": "...", "chance": 0.3, "qty": [1,3] }]
gem_loot_table  JSONB                 -- [{ "gem_def_id": "ruby_t1", "chance": 0.1 }]
xp_reward       INT NOT NULL
credits_reward  INT[] NOT NULL        -- [min, max]
```

RLS: public SELECT.

---

### `npc_areas`

```sql
id          TEXT PRIMARY KEY    -- "local_dev" | "staging" | "production" | "legacy_codebase"
name        TEXT NOT NULL
description TEXT NOT NULL
level_range INT[] NOT NULL      -- [min_level, max_level] recommendation
```

RLS: public SELECT.

---

### `npc_area_spawns`

```sql
area_id       TEXT REFERENCES npc_areas(id)
npc_def_id    TEXT REFERENCES npc_definitions(id)
spawn_weight  INT NOT NULL DEFAULT 1
PRIMARY KEY (area_id, npc_def_id)
```

Used by `CombatService` (Phase 3) to pick a random bug via weighted selection.

---

### `combat_logs`

```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
attacker_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE
defender_type   TEXT NOT NULL         -- "npc" | "player"
defender_id     TEXT NOT NULL         -- npc_def_id or player UUID
outcome         TEXT NOT NULL         -- "win" | "lose" | "flee"
damage_dealt    INT NOT NULL
damage_taken    INT NOT NULL
xp_gained       INT NOT NULL DEFAULT 0
credits_gained  INT NOT NULL DEFAULT 0
loot            JSONB                 -- { "items": [...], "gems": [...] }
created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
```

RLS: player can SELECT their own rows.

---

### `task_definitions`

```sql
id              TEXT PRIMARY KEY      -- e.g. "write_migration", "review_pr"
name            TEXT NOT NULL
description     TEXT NOT NULL
skill_id        TEXT NOT NULL         -- "debugging" | "data_mining" | "architecture"
level_required  INT NOT NULL DEFAULT 1
focus_cost      INT NOT NULL
success_rate    FLOAT NOT NULL        -- 0.0–1.0
rewards         JSONB NOT NULL        -- { "credits": [10,20], "xp": 25, "skill_xp": 15 }
gem_rewards     JSONB                 -- [{ "gem_def_id": "ruby_t1", "chance": 0.15 }]
failure_penalty JSONB                 -- { "xp": 5 } (partial rewards on failure)
```

RLS: public SELECT. The reward ranges use `[min, max]` arrays for credit awards.

---

### `task_logs`

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE
task_def_id   TEXT NOT NULL REFERENCES task_definitions(id)
outcome       TEXT NOT NULL         -- "success" | "failure"
rewards_given JSONB NOT NULL DEFAULT '{}'
created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
```

RLS: player can SELECT/INSERT their own rows.

---

### `chat_messages`

```sql
id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
channel     TEXT NOT NULL           -- "general" | "environment:{area_id}" | "dm:{sorted_uuids}"
sender_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE
content     TEXT NOT NULL
created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Indexed on `(channel, created_at)`. Supabase Realtime listens on INSERT for live chat.
RLS: authenticated players can SELECT/INSERT.

---

## PL/pgSQL RPCs (migration 008)

These functions run with `SECURITY DEFINER` and are called via `supabase.rpc()` to ensure atomicity. They use `FOR UPDATE` locks and `RAISE EXCEPTION` for typed error signalling.

### `buy_item(p_player_id, p_shop_id, p_item_def_id) → INT`

Returns the `price_buy` (credits paid).

**Error messages** (checked by `ShopService` via `error.message`):

| Message | Meaning | HTTP status |
|---|---|---|
| `ItemNotInShop` | `shop_inventory` has no row for this `(shop_id, item_def_id)` | 404 |
| `OutOfStock` | `stock` column is non-null and has reached 0 | 422 |
| `InsufficientResource` | Player's credits < `price_buy` | 422 |

**Steps:**
1. Lock `shop_inventory` row. Fail if missing → `ItemNotInShop`.
2. Check `stock IS NOT NULL AND stock <= 0` → `OutOfStock`.
3. Lock `player_resources` credits row. Fail if insufficient → `InsufficientResource`.
4. Deduct credits.
5. If `stackable`: try UPDATE existing stack; INSERT if not found.
   If not stackable: always INSERT new row.
6. If stock was limited: decrement `stock`.

### `sell_item(p_player_id, p_inventory_id) → INT`

Returns the credits received.

**Error messages:**

| Message | Meaning | HTTP status |
|---|---|---|
| `InventoryItemNotFound` | No row matching `(id, player_id)` — wrong owner or missing | 404 |

**Steps:**
1. Lock `player_inventory` row, verify `player_id` matches → `InventoryItemNotFound`.
2. Find sell price: `MAX(shop_inventory.price_sell)` for the item. Fallback: `FLOOR(base_value / 2)`. Minimum: 1 credit.
3. Decrement quantity or DELETE row if last item.
4. Add credits to `player_resources`.

---

## Seed data (`supabase/seed.sql`)

The seed file is the **content database** — item stats, bug stats, shop prices, and task rewards all live here. To rebalance the game: edit `seed.sql`, then run `supabase db reset`.

Contents:
- **Admin player** — level 99, all stats maxed, `is_admin = true`
- **24 items** — 6 weapons, 9 armor, 5 consumables, 4 materials
- **12 gem items** (migration 008 adds these to `item_definitions` too)
- **12 gem definitions** — ruby/sapphire/diamond/emerald × t1-t3
- **10 bugs** — typo_bug → heisenbug
- **4 areas** — local_dev, staging, production, legacy_codebase
- **15 task definitions** — 5 per skill discipline
- **3 shops** with full `shop_inventory` rows

---

## Type generation

After any schema change:

```bash
supabase gen types typescript --local 2>/dev/null > src/lib/supabase/types.ts
```

The generated types in `src/lib/supabase/types.ts` are used by all `src/services/*.ts` files. Deno Edge Functions use `Record<string, unknown>` with explicit casts instead (they can't import from `src/`).
