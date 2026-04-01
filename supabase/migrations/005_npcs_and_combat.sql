-- Migration 005: NPC (Bug) definitions, environments, spawns, and combat logs
-- Creates npc_definitions, npc_areas (environments), npc_area_spawns, and combat_logs.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE npc_definitions (
  id              TEXT PRIMARY KEY,  -- e.g. "typo_bug", "race_condition", "heisenbug"
  name            TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  level           INT NOT NULL DEFAULT 1,
  stats           JSONB NOT NULL DEFAULT '{}',  -- { "logic": 15, "resilience": 10, "throughput": 8, "serendipity": 3 }
  uptime          INT NOT NULL DEFAULT 50,      -- bug's health pool (themed as "uptime")
  loot_table      JSONB NOT NULL DEFAULT '[]',  -- [{ "item_def_id": "...", "chance": 0.3, "qty": [1,3] }]
  gem_loot_table  JSONB,                        -- [{ "gem_def_id": "ruby_t1", "chance": 0.1 }]
  xp_reward       INT NOT NULL DEFAULT 10,
  credits_reward  INT[] NOT NULL DEFAULT '{5,10}'  -- [min, max]
);

CREATE TABLE npc_areas (
  id          TEXT PRIMARY KEY,  -- "local_dev", "staging", "production", "legacy_codebase"
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  level_range INT[] NOT NULL DEFAULT '{1,5}'  -- [min_level, max_level] recommendation
);

CREATE TABLE npc_area_spawns (
  area_id       TEXT NOT NULL REFERENCES npc_areas(id),
  npc_def_id    TEXT NOT NULL REFERENCES npc_definitions(id),
  spawn_weight  INT NOT NULL DEFAULT 1,  -- relative probability
  PRIMARY KEY (area_id, npc_def_id)
);

CREATE TABLE combat_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attacker_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  defender_type   TEXT NOT NULL,   -- "npc" | "player"
  defender_id     TEXT NOT NULL,   -- npc_def_id or player UUID
  outcome         TEXT NOT NULL,   -- "win", "lose", "flee"
  damage_dealt    INT NOT NULL DEFAULT 0,
  damage_taken    INT NOT NULL DEFAULT 0,
  xp_gained       INT NOT NULL DEFAULT 0,
  credits_gained  INT NOT NULL DEFAULT 0,
  loot            JSONB,           -- items and gems received
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX combat_logs_attacker_id_idx ON combat_logs(attacker_id);
CREATE INDEX combat_logs_created_at_idx ON combat_logs(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE npc_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE npc_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE npc_area_spawns ENABLE ROW LEVEL SECURITY;
ALTER TABLE combat_logs ENABLE ROW LEVEL SECURITY;

-- NPC/area data: public read (game content)
CREATE POLICY "npc_definitions_select_public" ON npc_definitions
  FOR SELECT USING (true);

CREATE POLICY "npc_areas_select_public" ON npc_areas
  FOR SELECT USING (true);

CREATE POLICY "npc_area_spawns_select_public" ON npc_area_spawns
  FOR SELECT USING (true);

-- Combat logs: each player can only see their own combat history
CREATE POLICY "combat_logs_select_own" ON combat_logs
  FOR SELECT TO authenticated USING (attacker_id = auth.uid());

CREATE POLICY "combat_logs_insert_own" ON combat_logs
  FOR INSERT TO authenticated WITH CHECK (attacker_id = auth.uid());
