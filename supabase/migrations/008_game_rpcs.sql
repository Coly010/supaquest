-- Migration 008: Gem items + atomic shop RPC functions
--
-- 1. Inserts gem definitions into item_definitions so gems can live in
--    player_inventory (which has a FK to item_definitions). This is required
--    for gem rewards from tasks/combat and for the socketGem flow.
--
-- 2. Creates buy_item() — atomically deducts credits and adds item to inventory.
--    Called via supabase.rpc() from the buy-item Edge Function.
--
-- 3. Creates sell_item() — atomically removes item from inventory and credits
--    the player. Called via supabase.rpc() from the sell-item Edge Function.

-- ============================================================
-- GEM ITEMS in item_definitions
-- ============================================================
-- Gems are item_type='gem', no slot, stackable. Their stat_bonus lives in
-- gem_definitions; item_definitions holds only inventory metadata.

INSERT INTO item_definitions
  (id, name, description, item_type, slot, base_stats, level_required, base_value, stackable, gem_slot_count)
VALUES
  -- Ruby (Logic)
  ('ruby_t1',     'Rough Ruby',      'Raw Logic amplifier. Crude but effective.',             'gem', NULL, '{}', 1, 30,  true, 0),
  ('ruby_t2',     'Cut Ruby',        'Polished to increase Logic significantly.',              'gem', NULL, '{}', 1, 100, true, 0),
  ('ruby_t3',     'Flawless Ruby',   'Perfect Logic crystal. Exceptionally rare.',             'gem', NULL, '{}', 1, 350, true, 0),
  -- Sapphire (Resilience)
  ('sapphire_t1', 'Rough Sapphire',  'Adds a layer of resilience to your setup.',             'gem', NULL, '{}', 1, 30,  true, 0),
  ('sapphire_t2', 'Cut Sapphire',    'Hardened infra in gem form.',                           'gem', NULL, '{}', 1, 100, true, 0),
  ('sapphire_t3', 'Flawless Sapphire','Near-perfect uptime in a stone.',                      'gem', NULL, '{}', 1, 350, true, 0),
  -- Diamond (Max Uptime)
  ('diamond_t1',  'Rough Diamond',   'Expands maximum server uptime slightly.',               'gem', NULL, '{}', 1, 40,  true, 0),
  ('diamond_t2',  'Cut Diamond',     'Significantly boosts your maximum uptime pool.',        'gem', NULL, '{}', 1, 130, true, 0),
  ('diamond_t3',  'Flawless Diamond','Your server never goes down.',                          'gem', NULL, '{}', 1, 450, true, 0),
  -- Emerald (Serendipity)
  ('emerald_t1',  'Rough Emerald',   'Lucky gem. Better drops follow you around.',            'gem', NULL, '{}', 1, 35,  true, 0),
  ('emerald_t2',  'Cut Emerald',     'Noticeably improves fortune and find rates.',           'gem', NULL, '{}', 1, 115, true, 0),
  ('emerald_t3',  'Flawless Emerald','The universe bends toward you.',                        'gem', NULL, '{}', 1, 400, true, 0);

-- ============================================================
-- buy_item(p_player_id, p_shop_id, p_item_def_id) → credits_paid
-- ============================================================
-- Error codes:
--   P0001 — ItemNotInShop
--   P0002 — OutOfStock
--   P0003 — InsufficientResource (credits)

CREATE OR REPLACE FUNCTION buy_item(
  p_player_id   UUID,
  p_shop_id     TEXT,
  p_item_def_id TEXT
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_price_buy  INT;
  v_stock      INT;
  v_credits    INT;
  v_stackable  BOOLEAN;
BEGIN
  -- Fetch and lock the shop inventory row
  SELECT price_buy, stock
  INTO   v_price_buy, v_stock
  FROM   shop_inventory
  WHERE  shop_id = p_shop_id AND item_def_id = p_item_def_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ItemNotInShop' USING ERRCODE = 'P0001';
  END IF;

  IF v_stock IS NOT NULL AND v_stock <= 0 THEN
    RAISE EXCEPTION 'OutOfStock' USING ERRCODE = 'P0002';
  END IF;

  -- Fetch and lock player credits
  SELECT current
  INTO   v_credits
  FROM   player_resources
  WHERE  player_id = p_player_id AND resource_type = 'credits'
  FOR UPDATE;

  IF v_credits < v_price_buy THEN
    RAISE EXCEPTION 'InsufficientResource' USING ERRCODE = 'P0003';
  END IF;

  -- Deduct credits
  UPDATE player_resources
  SET    current = current - v_price_buy
  WHERE  player_id = p_player_id AND resource_type = 'credits';

  -- Get item stackability
  SELECT stackable INTO v_stackable
  FROM   item_definitions
  WHERE  id = p_item_def_id;

  -- Add item to inventory (upsert stack or insert new row)
  IF v_stackable THEN
    UPDATE player_inventory
    SET    quantity = quantity + 1
    WHERE  player_id = p_player_id AND item_def_id = p_item_def_id;

    IF NOT FOUND THEN
      INSERT INTO player_inventory (player_id, item_def_id, quantity)
      VALUES (p_player_id, p_item_def_id, 1);
    END IF;
  ELSE
    INSERT INTO player_inventory (player_id, item_def_id, quantity)
    VALUES (p_player_id, p_item_def_id, 1);
  END IF;

  -- Decrement stock if limited
  IF v_stock IS NOT NULL THEN
    UPDATE shop_inventory
    SET    stock = stock - 1
    WHERE  shop_id = p_shop_id AND item_def_id = p_item_def_id;
  END IF;

  RETURN v_price_buy;
END;
$$;

-- ============================================================
-- sell_item(p_player_id, p_inventory_id) → credits_received
-- ============================================================
-- Sell price: best price_sell across all shops for the item;
-- fallback to floor(base_value / 2) if not sold in any shop.
--
-- Error codes:
--   P0004 — InventoryItemNotFound (or wrong owner)

CREATE OR REPLACE FUNCTION sell_item(
  p_player_id    UUID,
  p_inventory_id UUID
) RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item_def_id  TEXT;
  v_quantity     INT;
  v_sell_price   INT;
BEGIN
  -- Fetch and lock the inventory row; verify ownership
  SELECT item_def_id, quantity
  INTO   v_item_def_id, v_quantity
  FROM   player_inventory
  WHERE  id = p_inventory_id AND player_id = p_player_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'InventoryItemNotFound' USING ERRCODE = 'P0004';
  END IF;

  -- Determine sell price: best across shops, fallback to floor(base_value / 2)
  SELECT COALESCE(MAX(si.price_sell), 0)
  INTO   v_sell_price
  FROM   shop_inventory si
  WHERE  si.item_def_id = v_item_def_id;

  IF v_sell_price = 0 THEN
    SELECT FLOOR(base_value::FLOAT / 2)::INT
    INTO   v_sell_price
    FROM   item_definitions
    WHERE  id = v_item_def_id;

    -- If base_value is also 0, default to 1 so selling always yields something
    IF v_sell_price IS NULL OR v_sell_price = 0 THEN
      v_sell_price := 1;
    END IF;
  END IF;

  -- Remove one from inventory (or delete row if last one)
  IF v_quantity > 1 THEN
    UPDATE player_inventory
    SET    quantity = quantity - 1
    WHERE  id = p_inventory_id;
  ELSE
    DELETE FROM player_inventory WHERE id = p_inventory_id;
  END IF;

  -- Credit the player
  UPDATE player_resources
  SET    current = current + v_sell_price
  WHERE  player_id = p_player_id AND resource_type = 'credits';

  RETURN v_sell_price;
END;
$$;
