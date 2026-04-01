-- Migration 002: Item and gem registry tables
-- Creates item_definitions and gem_definitions.
-- These are read-only game content tables — public SELECT is allowed since they're not player data.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE item_definitions (
  id              TEXT PRIMARY KEY,  -- e.g. "basic_linter", "type_checker"
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  item_type       TEXT NOT NULL,     -- "weapon", "armor", "consumable", "material"
  slot            TEXT,              -- "main_hand", "off_hand", "head", "chest", "legs", "feet" | NULL
  base_stats      JSONB NOT NULL DEFAULT '{}',  -- { "logic": 5, "resilience": 0, ... }
  level_required  INT NOT NULL DEFAULT 1,
  base_value      INT NOT NULL DEFAULT 0,
  stackable       BOOLEAN NOT NULL DEFAULT false,
  max_stack       INT,               -- NULL = no cap when stackable
  gem_slot_count  INT NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE gem_definitions (
  id              TEXT PRIMARY KEY,  -- e.g. "ruby_t1", "sapphire_t2", "diamond_t3"
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  gem_type        TEXT NOT NULL,     -- "ruby", "sapphire", "diamond", "emerald"
  stat_bonus      JSONB NOT NULL DEFAULT '{}',  -- { "logic": 2 }
  tier            INT NOT NULL DEFAULT 1,       -- 1=Rough, 2=Cut, 3=Flawless
  base_value      INT NOT NULL DEFAULT 0,
  metadata        JSONB NOT NULL DEFAULT '{}'
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE item_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE gem_definitions ENABLE ROW LEVEL SECURITY;

-- Registry tables: public read access (game content, not player data)
CREATE POLICY "item_definitions_select_public" ON item_definitions
  FOR SELECT USING (true);

CREATE POLICY "gem_definitions_select_public" ON gem_definitions
  FOR SELECT USING (true);
