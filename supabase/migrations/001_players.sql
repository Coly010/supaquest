-- Migration 001: Player tables
-- Creates players, player_stats, player_skills, and player_resources with RLS policies.
-- Players are seeded via create-profile edge function after Supabase Auth signup.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE players (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT NOT NULL,
  level         INT NOT NULL DEFAULT 1,
  xp            INT NOT NULL DEFAULT 0,
  xp_to_next    INT NOT NULL DEFAULT 100,
  is_admin      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE player_stats (
  player_id     UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  logic         INT NOT NULL DEFAULT 10,
  resilience    INT NOT NULL DEFAULT 10,
  throughput    INT NOT NULL DEFAULT 10,
  serendipity   INT NOT NULL DEFAULT 10,
  max_uptime    INT NOT NULL DEFAULT 100
);

CREATE TABLE player_skills (
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  skill_id      TEXT NOT NULL,  -- "debugging", "data_mining", "architecture"
  level         INT NOT NULL DEFAULT 1,
  xp            INT NOT NULL DEFAULT 0,
  xp_to_next    INT NOT NULL DEFAULT 50,
  PRIMARY KEY (player_id, skill_id)
);

CREATE TABLE player_resources (
  player_id       UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  resource_type   TEXT NOT NULL,  -- "focus", "uptime", "credits"
  current         INT NOT NULL,
  maximum         INT,            -- NULL = uncapped (credits)
  last_replenish  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (player_id, resource_type)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX player_skills_player_id_idx ON player_skills(player_id);
CREATE INDEX player_resources_player_id_idx ON player_resources(player_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_resources ENABLE ROW LEVEL SECURITY;

-- players: authenticated users can read all profiles (for PvP targeting, chat display names)
-- but can only update their own row
CREATE POLICY "players_select_all" ON players
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "players_insert_own" ON players
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "players_update_own" ON players
  FOR UPDATE TO authenticated USING (id = auth.uid());

-- player_stats: each player can only see and update their own stats
CREATE POLICY "player_stats_select_own" ON player_stats
  FOR SELECT TO authenticated USING (player_id = auth.uid());

CREATE POLICY "player_stats_insert_own" ON player_stats
  FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());

CREATE POLICY "player_stats_update_own" ON player_stats
  FOR UPDATE TO authenticated USING (player_id = auth.uid());

-- player_skills: each player can only see and update their own skills
CREATE POLICY "player_skills_select_own" ON player_skills
  FOR SELECT TO authenticated USING (player_id = auth.uid());

CREATE POLICY "player_skills_insert_own" ON player_skills
  FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());

CREATE POLICY "player_skills_update_own" ON player_skills
  FOR UPDATE TO authenticated USING (player_id = auth.uid());

-- player_resources: each player can only see and update their own resources
CREATE POLICY "player_resources_select_own" ON player_resources
  FOR SELECT TO authenticated USING (player_id = auth.uid());

CREATE POLICY "player_resources_insert_own" ON player_resources
  FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());

CREATE POLICY "player_resources_update_own" ON player_resources
  FOR UPDATE TO authenticated USING (player_id = auth.uid());
