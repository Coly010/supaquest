-- Migration 003: Player inventory and gem socketing tables
-- Creates player_inventory (items owned by players) and inventory_gems (gems socketed into items).

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE player_inventory (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_def_id   TEXT NOT NULL REFERENCES item_definitions(id),
  quantity      INT NOT NULL DEFAULT 1,
  is_equipped   BOOLEAN NOT NULL DEFAULT false,
  equipped_slot TEXT,              -- which slot it occupies when equipped
  acquired_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one item can occupy a given equipment slot at a time
  CONSTRAINT one_item_per_slot UNIQUE NULLS NOT DISTINCT (player_id, equipped_slot) DEFERRABLE INITIALLY DEFERRED
);

-- Partial unique index: enforce unique equipped slot only when is_equipped = true
CREATE UNIQUE INDEX player_inventory_equipped_slot_unique
  ON player_inventory (player_id, equipped_slot)
  WHERE is_equipped = true AND equipped_slot IS NOT NULL;

CREATE TABLE inventory_gems (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id  UUID NOT NULL REFERENCES player_inventory(id) ON DELETE CASCADE,
  gem_def_id    TEXT NOT NULL REFERENCES gem_definitions(id),
  slot_index    INT NOT NULL,      -- 0-based index into the item's gem slots
  socketed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (inventory_id, slot_index)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX player_inventory_player_id_idx ON player_inventory(player_id);
CREATE INDEX player_inventory_equipped_idx ON player_inventory(player_id) WHERE is_equipped = true;
CREATE INDEX inventory_gems_inventory_id_idx ON inventory_gems(inventory_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_gems ENABLE ROW LEVEL SECURITY;

-- player_inventory: each player can only see and manage their own inventory
CREATE POLICY "player_inventory_select_own" ON player_inventory
  FOR SELECT TO authenticated USING (player_id = auth.uid());

CREATE POLICY "player_inventory_insert_own" ON player_inventory
  FOR INSERT TO authenticated WITH CHECK (player_id = auth.uid());

CREATE POLICY "player_inventory_update_own" ON player_inventory
  FOR UPDATE TO authenticated USING (player_id = auth.uid());

CREATE POLICY "player_inventory_delete_own" ON player_inventory
  FOR DELETE TO authenticated USING (player_id = auth.uid());

-- inventory_gems: players can see gems in their own inventory items
CREATE POLICY "inventory_gems_select_own" ON inventory_gems
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM player_inventory
      WHERE player_inventory.id = inventory_gems.inventory_id
        AND player_inventory.player_id = auth.uid()
    )
  );

CREATE POLICY "inventory_gems_insert_own" ON inventory_gems
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM player_inventory
      WHERE player_inventory.id = inventory_gems.inventory_id
        AND player_inventory.player_id = auth.uid()
    )
  );

CREATE POLICY "inventory_gems_delete_own" ON inventory_gems
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM player_inventory
      WHERE player_inventory.id = inventory_gems.inventory_id
        AND player_inventory.player_id = auth.uid()
    )
  );
