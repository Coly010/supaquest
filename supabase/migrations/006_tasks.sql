-- Migration 006: Task definitions and task logs
-- Creates task_definitions (dev work templates) and task_logs (player attempt history).

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE task_definitions (
  id               TEXT PRIMARY KEY,  -- e.g. "write_migration", "review_pr"
  name             TEXT NOT NULL,
  description      TEXT NOT NULL DEFAULT '',
  skill_id         TEXT NOT NULL,     -- "debugging", "data_mining", "architecture"
  level_required   INT NOT NULL DEFAULT 1,
  focus_cost       INT NOT NULL DEFAULT 10,
  success_rate     FLOAT NOT NULL DEFAULT 0.75,  -- base chance (0.0–1.0)
  rewards          JSONB NOT NULL DEFAULT '{}',   -- { "credits": [10,20], "xp": 25, "skill_xp": 15, "items": [...] }
  gem_rewards      JSONB,                         -- [{ "gem_def_id": "ruby_t1", "chance": 0.15 }]
  failure_penalty  JSONB                          -- { "credits": 0, "xp": 5 }
);

CREATE TABLE task_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  task_def_id   TEXT NOT NULL REFERENCES task_definitions(id),
  outcome       TEXT NOT NULL,    -- "success" | "failure"
  rewards_given JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX task_logs_player_id_idx ON task_logs(player_id);
CREATE INDEX task_logs_created_at_idx ON task_logs(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE task_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_logs ENABLE ROW LEVEL SECURITY;

-- Task definitions: public read (game content)
CREATE POLICY "task_definitions_select_public" ON task_definitions
  FOR SELECT USING (true);

-- Task logs: each player can only see their own history
CREATE POLICY "task_logs_select_own" ON task_logs
  FOR SELECT TO authenticated USING (player_id = auth.uid());

CREATE POLICY "task_logs_insert_own" ON task_logs
  FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());
