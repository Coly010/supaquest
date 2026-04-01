-- Migration 004: Shop tables
-- Creates shops (Package Registry, Extension Marketplace, Cloud Console) and shop_inventory.
-- Shops are read-only game content; shop_inventory prices are readable by all authenticated users.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE shops (
  id          TEXT PRIMARY KEY,  -- "package_registry", "extension_marketplace", "cloud_console"
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT ''
);

CREATE TABLE shop_inventory (
  shop_id       TEXT NOT NULL REFERENCES shops(id),
  item_def_id   TEXT NOT NULL REFERENCES item_definitions(id),
  price_buy     INT NOT NULL,     -- credits to buy from shop
  price_sell    INT NOT NULL,     -- credits received when selling to shop
  stock         INT,              -- NULL = unlimited
  PRIMARY KEY (shop_id, item_def_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_inventory ENABLE ROW LEVEL SECURITY;

-- Shop data: public read (game content)
CREATE POLICY "shops_select_public" ON shops
  FOR SELECT USING (true);

CREATE POLICY "shop_inventory_select_public" ON shop_inventory
  FOR SELECT USING (true);
