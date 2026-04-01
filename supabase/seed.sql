-- seed.sql — SupaQuest game content + admin user
-- Runs automatically on `supabase db reset`.
-- This file IS the content database. Edit stats/prices/rates here, then `supabase db reset` to apply.

-- ============================================================
-- ADMIN USER
-- ============================================================
-- Creates a local dev admin user in Supabase Auth and links a player profile.
-- These credentials are local dev only and must NEVER be used in production.

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  role,
  aud
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@supaquest.local',
  crypt('supaquest-admin-local', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  'authenticated',
  'authenticated'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'admin@supaquest.local',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"admin@supaquest.local"}',
  'email',
  now(),
  now(),
  now()
) ON CONFLICT (provider, provider_id) DO NOTHING;

INSERT INTO players (id, username, display_name, level, xp, xp_to_next, is_admin)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin', 'Admin', 99, 0, 9999, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO player_stats (player_id, logic, resilience, throughput, serendipity, max_uptime)
VALUES ('00000000-0000-0000-0000-000000000001', 99, 99, 99, 99, 9999)
ON CONFLICT (player_id) DO NOTHING;

INSERT INTO player_skills (player_id, skill_id, level, xp, xp_to_next)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'debugging', 99, 0, 9999),
  ('00000000-0000-0000-0000-000000000001', 'data_mining', 99, 0, 9999),
  ('00000000-0000-0000-0000-000000000001', 'architecture', 99, 0, 9999)
ON CONFLICT (player_id, skill_id) DO NOTHING;

INSERT INTO player_resources (player_id, resource_type, current, maximum, last_replenish)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'focus', 9999, 9999, now()),
  ('00000000-0000-0000-0000-000000000001', 'uptime', 9999, 9999, now()),
  ('00000000-0000-0000-0000-000000000001', 'credits', 999999, NULL, now())
ON CONFLICT (player_id, resource_type) DO NOTHING;

-- ============================================================
-- ITEM DEFINITIONS
-- ============================================================

-- ---- Weapons (Dev Tools) — slot: main_hand ----

INSERT INTO item_definitions (id, name, description, item_type, slot, base_stats, level_required, base_value, stackable, gem_slot_count)
VALUES
  ('basic_linter', 'Basic Linter', 'Catches obvious mistakes. Every developer starts here.', 'weapon', 'main_hand',
   '{"logic":2}', 1, 50, false, 0),

  ('debugger_pro', 'Debugger Pro', 'Step through execution and expose hidden bugs.', 'weapon', 'main_hand',
   '{"logic":5,"throughput":2}', 5, 300, false, 1),

  ('advanced_profiler', 'Advanced Profiler', 'Identify performance bottlenecks with precision.', 'weapon', 'main_hand',
   '{"logic":8,"throughput":4}', 10, 800, false, 2),

  ('query_optimizer', 'Query Optimizer', 'Rewrites your queries for maximum database efficiency.', 'weapon', 'main_hand',
   '{"logic":12,"serendipity":3}', 15, 1800, false, 2),

  ('static_analyzer', 'Static Analyzer', 'Analyzes code paths without executing. Rarely wrong.', 'weapon', 'main_hand',
   '{"logic":6,"resilience":2}', 8, 500, false, 1),

  ('fuzzer', 'Fuzzer', 'Throws unexpected inputs until something breaks.', 'weapon', 'main_hand',
   '{"logic":4,"serendipity":5}', 6, 400, false, 1);

-- ---- Armor (Frameworks & Infra) ----

INSERT INTO item_definitions (id, name, description, item_type, slot, base_stats, level_required, base_value, stackable, gem_slot_count)
VALUES
  ('type_checker', 'Type Checker', 'Strict mode enabled. No implicit any.', 'armor', 'chest',
   '{"resilience":3}', 1, 60, false, 0),

  ('ci_pipeline', 'CI Pipeline', 'Automated builds catch regressions before they reach staging.', 'armor', 'legs',
   '{"resilience":5,"throughput":2}', 5, 350, false, 1),

  ('load_balancer', 'Load Balancer', 'Distributes traffic across instances. High availability guaranteed.', 'armor', 'head',
   '{"resilience":8,"max_uptime":20}', 10, 900, false, 1),

  ('test_suite', 'Test Suite', 'Comprehensive test coverage. 94% lines covered.', 'armor', 'chest',
   '{"resilience":12,"logic":4}', 15, 2000, false, 2),

  ('monitoring_stack', 'Monitoring Stack', 'Logs, metrics, traces. You know everything that happens.', 'armor', 'head',
   '{"resilience":6,"serendipity":4}', 8, 600, false, 1),

  ('container_runtime', 'Container Runtime', 'Portable deployments. Works on my machine AND production.', 'armor', 'legs',
   '{"resilience":4,"throughput":4}', 6, 420, false, 1),

  ('cdn_layer', 'CDN Layer', 'Edge-cached assets. Latency drops to nearly zero.', 'armor', 'feet',
   '{"throughput":6,"resilience":2}', 8, 500, false, 1),

  ('ssh_keys', 'SSH Keys', 'Secure shell access. Your digital passport.', 'armor', 'off_hand',
   '{"resilience":2,"serendipity":2}', 1, 40, false, 0),

  ('vpn_client', 'VPN Client', 'Tunnels through firewalls. Accesses internal resources.', 'armor', 'feet',
   '{"resilience":3,"throughput":2}', 3, 120, false, 0);

-- ---- Consumables (Quick Fixes) ----

INSERT INTO item_definitions (id, name, description, item_type, slot, base_stats, level_required, base_value, stackable, max_stack, gem_slot_count)
VALUES
  ('stack_overflow_answer', 'Stack Overflow Answer', 'Someone had this exact problem in 2014. Restores Focus.', 'consumable', NULL,
   '{}', 1, 10, true, 99, 0),

  ('coffee', 'Coffee', 'Boosts throughput for a short time. Restores Focus significantly.', 'consumable', NULL,
   '{}', 1, 15, true, 50, 0),

  ('hot_fix_script', 'Hot Fix Script', 'Emergency patch. Restores Uptime immediately.', 'consumable', NULL,
   '{}', 3, 40, true, 20, 0),

  ('rubber_duck', 'Rubber Duck', 'Explaining the problem out loud reveals the solution. Restores Focus.', 'consumable', NULL,
   '{}', 1, 25, true, 10, 0),

  ('energy_drink', 'Energy Drink', 'Max Focus boost. Side effects: jitteriness.', 'consumable', NULL,
   '{}', 1, 30, true, 30, 0);

-- ---- Materials (Crafting / Data Mining drops) ----

INSERT INTO item_definitions (id, name, description, item_type, slot, base_stats, level_required, base_value, stackable, max_stack, gem_slot_count)
VALUES
  ('raw_data_shard', 'Raw Data Shard', 'Unprocessed data. Could be useful for something.', 'material', NULL,
   '{}', 1, 5, true, 999, 0),

  ('corrupted_log_file', 'Corrupted Log File', 'Damaged logs from a crashed process. Sell for credits.', 'material', NULL,
   '{}', 1, 8, true, 999, 0),

  ('memory_dump', 'Memory Dump', 'Heap snapshot from a Memory Leak. High sell value.', 'material', NULL,
   '{}', 5, 25, true, 99, 0),

  ('stack_trace', 'Stack Trace', 'Breadcrumbs from an unhandled exception. Useful for debugging.', 'material', NULL,
   '{}', 1, 12, true, 99, 0);

-- ============================================================
-- GEM DEFINITIONS
-- ============================================================
-- Tier 1 (Rough): +2, Tier 2 (Cut): +5, Tier 3 (Flawless): +10

INSERT INTO gem_definitions (id, name, description, gem_type, stat_bonus, tier, base_value)
VALUES
  -- Ruby — +Logic (offensive power)
  ('ruby_t1', 'Rough Ruby', 'Raw Logic amplifier. Crude but effective.', 'ruby', '{"logic":2}', 1, 30),
  ('ruby_t2', 'Cut Ruby', 'Polished to increase Logic significantly.', 'ruby', '{"logic":5}', 2, 100),
  ('ruby_t3', 'Flawless Ruby', 'Perfect Logic crystal. Exceptionally rare.', 'ruby', '{"logic":10}', 3, 350),

  -- Sapphire — +Resilience (defensive)
  ('sapphire_t1', 'Rough Sapphire', 'Adds a layer of resilience to your setup.', 'sapphire', '{"resilience":2}', 1, 30),
  ('sapphire_t2', 'Cut Sapphire', 'Hardened infra in gem form.', 'sapphire', '{"resilience":5}', 2, 100),
  ('sapphire_t3', 'Flawless Sapphire', 'Near-perfect uptime in a stone.', 'sapphire', '{"resilience":10}', 3, 350),

  -- Diamond — +Max Uptime (survivability)
  ('diamond_t1', 'Rough Diamond', 'Expands maximum server uptime slightly.', 'diamond', '{"max_uptime":2}', 1, 40),
  ('diamond_t2', 'Cut Diamond', 'Significantly boosts your maximum uptime pool.', 'diamond', '{"max_uptime":5}', 2, 130),
  ('diamond_t3', 'Flawless Diamond', 'Your server never goes down.', 'diamond', '{"max_uptime":10}', 3, 450),

  -- Emerald — +Serendipity (drop rates / crit)
  ('emerald_t1', 'Rough Emerald', 'Lucky gem. Better drops follow you around.', 'emerald', '{"serendipity":2}', 1, 35),
  ('emerald_t2', 'Cut Emerald', 'Noticeably improves fortune and find rates.', 'emerald', '{"serendipity":5}', 2, 115),
  ('emerald_t3', 'Flawless Emerald', 'The universe bends toward you.', 'emerald', '{"serendipity":10}', 3, 400);

-- ============================================================
-- NPC DEFINITIONS (Bugs)
-- ============================================================

INSERT INTO npc_definitions (id, name, description, level, stats, uptime, loot_table, gem_loot_table, xp_reward, credits_reward)
VALUES
  ('typo_bug', 'Typo Bug',
   'A lowercase variable where an uppercase was expected. Embarrassing but surprisingly common.',
   1,
   '{"logic":5,"resilience":3,"throughput":4,"serendipity":2}',
   30,
   '[{"item_def_id":"raw_data_shard","chance":0.4,"qty":[1,2]},{"item_def_id":"corrupted_log_file","chance":0.2,"qty":[1,1]}]',
   '[{"gem_def_id":"ruby_t1","chance":0.05}]',
   8, '{3,8}'),

  ('missing_semicolon', 'Missing Semicolon',
   'Slippery. You keep thinking you found it, but it was a colon all along.',
   2,
   '{"logic":6,"resilience":3,"throughput":8,"serendipity":3}',
   35,
   '[{"item_def_id":"raw_data_shard","chance":0.5,"qty":[1,2]},{"item_def_id":"stack_trace","chance":0.15,"qty":[1,1]}]',
   '[{"gem_def_id":"ruby_t1","chance":0.06},{"gem_def_id":"emerald_t1","chance":0.04}]',
   12, '{5,12}'),

  ('off_by_one', 'Off-by-One Error',
   'The loop runs one iteration too many. The data is almost right. Almost.',
   4,
   '{"logic":10,"resilience":8,"throughput":7,"serendipity":4}',
   65,
   '[{"item_def_id":"raw_data_shard","chance":0.6,"qty":[1,3]},{"item_def_id":"corrupted_log_file","chance":0.3,"qty":[1,2]},{"item_def_id":"stack_trace","chance":0.2,"qty":[1,1]}]',
   '[{"gem_def_id":"ruby_t1","chance":0.08},{"gem_def_id":"sapphire_t1","chance":0.06}]',
   22, '{10,20}'),

  ('null_reference', 'Null Reference',
   'Cannot read properties of undefined. High offense, no defense.',
   6,
   '{"logic":18,"resilience":4,"throughput":9,"serendipity":5}',
   80,
   '[{"item_def_id":"stack_trace","chance":0.5,"qty":[1,2]},{"item_def_id":"raw_data_shard","chance":0.4,"qty":[2,4]}]',
   '[{"gem_def_id":"ruby_t1","chance":0.10},{"gem_def_id":"ruby_t2","chance":0.03}]',
   35, '{15,30}'),

  ('race_condition', 'Race Condition',
   'Thread A and Thread B reach the same resource at the same time. Chaos follows. 30% dodge chance.',
   8,
   '{"logic":14,"resilience":8,"throughput":22,"serendipity":12}',
   90,
   '[{"item_def_id":"stack_trace","chance":0.4,"qty":[1,3]},{"item_def_id":"corrupted_log_file","chance":0.5,"qty":[2,4]}]',
   '[{"gem_def_id":"emerald_t1","chance":0.12},{"gem_def_id":"emerald_t2","chance":0.04}]',
   50, '{20,40}'),

  ('memory_leak', 'Memory Leak',
   'Starts weak, but allocates buffers each turn. Gets stronger as the fight drags on.',
   10,
   '{"logic":16,"resilience":14,"throughput":8,"serendipity":6}',
   150,
   '[{"item_def_id":"memory_dump","chance":0.5,"qty":[1,2]},{"item_def_id":"raw_data_shard","chance":0.6,"qty":[2,5]}]',
   '[{"gem_def_id":"diamond_t1","chance":0.10},{"gem_def_id":"sapphire_t1","chance":0.08}]',
   70, '{30,55}'),

  ('unhandled_promise', 'Unhandled Promise',
   'Rejected without a catch. Spawns one additional Typo Bug when defeated.',
   12,
   '{"logic":20,"resilience":12,"throughput":14,"serendipity":8}',
   130,
   '[{"item_def_id":"stack_trace","chance":0.6,"qty":[2,4]},{"item_def_id":"memory_dump","chance":0.3,"qty":[1,2]}]',
   '[{"gem_def_id":"ruby_t2","chance":0.06},{"gem_def_id":"sapphire_t1","chance":0.10}]',
   90, '{40,70}'),

  ('n_plus_one', 'N+1 Query',
   'Fetches one row, then fetches N more in a loop. Enormous HP, extremely slow.',
   14,
   '{"logic":18,"resilience":20,"throughput":4,"serendipity":6}',
   280,
   '[{"item_def_id":"memory_dump","chance":0.6,"qty":[2,4]},{"item_def_id":"corrupted_log_file","chance":0.7,"qty":[3,6]}]',
   '[{"gem_def_id":"sapphire_t2","chance":0.06},{"gem_def_id":"diamond_t1","chance":0.12}]',
   110, '{50,90}'),

  ('deadlock', 'Deadlock',
   'Two processes waiting on each other forever. Freezes your actions for one turn.',
   16,
   '{"logic":24,"resilience":22,"throughput":10,"serendipity":8}',
   200,
   '[{"item_def_id":"stack_trace","chance":0.7,"qty":[2,5]},{"item_def_id":"memory_dump","chance":0.5,"qty":[2,3]}]',
   '[{"gem_def_id":"sapphire_t2","chance":0.08},{"gem_def_id":"diamond_t2","chance":0.05}]',
   140, '{65,110}'),

  ('heisenbug', 'Heisenbug',
   'Changes behavior when observed. Boss-tier. Its stats shift each turn.',
   22,
   '{"logic":35,"resilience":30,"throughput":28,"serendipity":25}',
   400,
   '[{"item_def_id":"memory_dump","chance":0.8,"qty":[3,6]},{"item_def_id":"stack_trace","chance":0.8,"qty":[3,6]}]',
   '[{"gem_def_id":"ruby_t2","chance":0.15},{"gem_def_id":"emerald_t2","chance":0.15},{"gem_def_id":"diamond_t3","chance":0.04},{"gem_def_id":"ruby_t3","chance":0.03}]',
   300, '{120,200}');

-- ============================================================
-- NPC AREAS (Environments)
-- ============================================================

INSERT INTO npc_areas (id, name, description, level_range)
VALUES
  ('local_dev', 'Local Dev',
   'Your laptop. Everything here is safe and familiar. Good place to learn the ropes.',
   '{1,5}'),

  ('staging', 'Staging',
   'The pre-production environment. Bugs are nastier here and the stakes feel real.',
   '{5,12}'),

  ('production', 'Production',
   'The live system. Every mistake has consequences. High risk, high reward.',
   '{10,18}'),

  ('legacy_codebase', 'Legacy Codebase',
   'Undocumented, untested, and probably using jQuery. Only the brave venture here.',
   '{16,25}');

-- ============================================================
-- NPC AREA SPAWNS
-- ============================================================

INSERT INTO npc_area_spawns (area_id, npc_def_id, spawn_weight)
VALUES
  -- Local Dev: beginners only
  ('local_dev', 'typo_bug', 50),
  ('local_dev', 'missing_semicolon', 35),
  ('local_dev', 'off_by_one', 15),

  -- Staging: intermediate bugs
  ('staging', 'off_by_one', 30),
  ('staging', 'null_reference', 30),
  ('staging', 'race_condition', 25),
  ('staging', 'memory_leak', 15),

  -- Production: advanced bugs
  ('production', 'memory_leak', 25),
  ('production', 'unhandled_promise', 30),
  ('production', 'n_plus_one', 30),
  ('production', 'deadlock', 15),

  -- Legacy Codebase: high-level + boss
  ('legacy_codebase', 'n_plus_one', 20),
  ('legacy_codebase', 'deadlock', 30),
  ('legacy_codebase', 'heisenbug', 10),
  -- Legacy also has regression bugs
  ('legacy_codebase', 'unhandled_promise', 25),
  ('legacy_codebase', 'race_condition', 15);

-- ============================================================
-- TASK DEFINITIONS
-- ============================================================

INSERT INTO task_definitions (id, name, description, skill_id, level_required, focus_cost, success_rate, rewards, gem_rewards, failure_penalty)
VALUES
  -- ---- Debugging tasks ----
  ('review_pr', 'Review Pull Request',
   'Carefully read a pull request and leave constructive feedback.',
   'debugging', 1, 10, 0.80,
   '{"credits":[8,15],"xp":12,"skill_xp":10}',
   NULL,
   '{"xp":3}'),

  ('write_unit_test', 'Write Unit Test',
   'Write a test that covers a previously untested code path.',
   'debugging', 1, 12, 0.75,
   '{"credits":[10,18],"xp":15,"skill_xp":12}',
   NULL,
   '{"xp":4}'),

  ('trace_stack_trace', 'Trace Stack Trace',
   'Follow the breadcrumbs of a crash report to find the root cause.',
   'debugging', 3, 15, 0.70,
   '{"credits":[15,25],"xp":20,"skill_xp":16}',
   NULL,
   '{"xp":5}'),

  ('fix_type_error', 'Fix Type Error',
   'Resolve a TypeScript compiler error. Somewhere any is lurking.',
   'debugging', 5, 18, 0.68,
   '{"credits":[20,35],"xp":28,"skill_xp":22}',
   '[{"gem_def_id":"ruby_t1","chance":0.08}]',
   '{"xp":6}'),

  ('bisect_regression', 'Bisect Regression',
   'Use git bisect to find which commit introduced a bug.',
   'debugging', 8, 22, 0.65,
   '{"credits":[30,50],"xp":40,"skill_xp":30}',
   '[{"gem_def_id":"ruby_t1","chance":0.12},{"gem_def_id":"ruby_t2","chance":0.04}]',
   '{"xp":8}'),

  -- ---- Data Mining tasks ----
  ('run_db_query', 'Run Database Query',
   'Execute a SQL query to extract valuable data from the production database.',
   'data_mining', 1, 10, 0.80,
   '{"credits":[8,14],"xp":10,"skill_xp":10}',
   '[{"gem_def_id":"emerald_t1","chance":0.10},{"gem_def_id":"ruby_t1","chance":0.06}]',
   '{"xp":3}'),

  ('analyze_server_logs', 'Analyze Server Logs',
   'Sift through thousands of log lines to find the signal in the noise.',
   'data_mining', 2, 14, 0.72,
   '{"credits":[14,22],"xp":18,"skill_xp":14}',
   '[{"gem_def_id":"emerald_t1","chance":0.14},{"gem_def_id":"sapphire_t1","chance":0.08}]',
   '{"xp":5}'),

  ('export_dataset', 'Export Dataset',
   'Extract and transform data into a usable format for downstream analysis.',
   'data_mining', 4, 18, 0.70,
   '{"credits":[22,38],"xp":28,"skill_xp":20}',
   '[{"gem_def_id":"emerald_t1","chance":0.18},{"gem_def_id":"emerald_t2","chance":0.05},{"gem_def_id":"sapphire_t1","chance":0.10}]',
   '{"xp":7}'),

  ('profile_slow_query', 'Profile Slow Query',
   'Identify why a database query is slow and document the findings.',
   'data_mining', 6, 22, 0.67,
   '{"credits":[32,55],"xp":42,"skill_xp":28}',
   '[{"gem_def_id":"emerald_t2","chance":0.08},{"gem_def_id":"diamond_t1","chance":0.10},{"gem_def_id":"ruby_t1","chance":0.12}]',
   '{"xp":9}'),

  ('mine_event_stream', 'Mine Event Stream',
   'Process a high-volume stream of events to extract behavioral patterns.',
   'data_mining', 10, 28, 0.62,
   '{"credits":[55,90],"xp":65,"skill_xp":45}',
   '[{"gem_def_id":"emerald_t2","chance":0.12},{"gem_def_id":"emerald_t3","chance":0.03},{"gem_def_id":"diamond_t1","chance":0.14}]',
   '{"xp":12}'),

  -- ---- Architecture tasks ----
  ('write_migration', 'Write DB Migration',
   'Author a SQL migration that safely alters the production schema.',
   'architecture', 1, 12, 0.78,
   '{"credits":[10,18],"xp":14,"skill_xp":12}',
   NULL,
   '{"xp":4}'),

  ('configure_rls', 'Configure RLS Policy',
   'Write a Row Level Security policy that protects player data correctly.',
   'architecture', 3, 16, 0.72,
   '{"credits":[18,30],"xp":24,"skill_xp":18}',
   '[{"gem_def_id":"sapphire_t1","chance":0.08}]',
   '{"xp":6}'),

  ('design_api_schema', 'Design API Schema',
   'Draft the request/response schema for a new API endpoint.',
   'architecture', 5, 20, 0.68,
   '{"credits":[28,46],"xp":36,"skill_xp":26}',
   '[{"gem_def_id":"sapphire_t1","chance":0.10},{"gem_def_id":"diamond_t1","chance":0.06}]',
   '{"xp":8}'),

  ('setup_edge_function', 'Set Up Edge Function',
   'Deploy a new Supabase Edge Function with proper auth and error handling.',
   'architecture', 7, 24, 0.65,
   '{"credits":[40,65],"xp":52,"skill_xp":36}',
   '[{"gem_def_id":"sapphire_t2","chance":0.06},{"gem_def_id":"diamond_t1","chance":0.10}]',
   '{"xp":10}'),

  ('architect_microservice', 'Architect Microservice',
   'Design a self-contained microservice with clear boundaries and contracts.',
   'architecture', 12, 32, 0.60,
   '{"credits":[70,110],"xp":85,"skill_xp":55}',
   '[{"gem_def_id":"sapphire_t2","chance":0.10},{"gem_def_id":"sapphire_t3","chance":0.03},{"gem_def_id":"diamond_t2","chance":0.05}]',
   '{"xp":14}');

-- ============================================================
-- SHOPS
-- ============================================================

INSERT INTO shops (id, name, description)
VALUES
  ('package_registry', 'Package Registry',
   'Open-source tools curated for developers at every level. Reasonable prices, solid quality.'),

  ('extension_marketplace', 'Extension Marketplace',
   'Premium plugins and frameworks. High performance, higher price tags.'),

  ('cloud_console', 'Cloud Console',
   'Infrastructure-as-code and consumables. Keeps you online when things go wrong.');

-- ============================================================
-- SHOP INVENTORY
-- ============================================================

-- Package Registry: beginner and mid-tier items
INSERT INTO shop_inventory (shop_id, item_def_id, price_buy, price_sell, stock)
VALUES
  ('package_registry', 'basic_linter', 60, 20, NULL),
  ('package_registry', 'type_checker', 75, 25, NULL),
  ('package_registry', 'ssh_keys', 50, 15, NULL),
  ('package_registry', 'stack_overflow_answer', 12, 3, NULL),
  ('package_registry', 'coffee', 18, 5, NULL),
  ('package_registry', 'rubber_duck', 30, 8, NULL),
  ('package_registry', 'static_analyzer', 600, 200, NULL),
  ('package_registry', 'fuzzer', 480, 160, NULL);

-- Extension Marketplace: mid to high-tier tools and armor
INSERT INTO shop_inventory (shop_id, item_def_id, price_buy, price_sell, stock)
VALUES
  ('extension_marketplace', 'debugger_pro', 360, 120, NULL),
  ('extension_marketplace', 'ci_pipeline', 420, 140, NULL),
  ('extension_marketplace', 'monitoring_stack', 720, 240, NULL),
  ('extension_marketplace', 'container_runtime', 500, 165, NULL),
  ('extension_marketplace', 'vpn_client', 145, 48, NULL),
  ('extension_marketplace', 'advanced_profiler', 960, 320, NULL),
  ('extension_marketplace', 'load_balancer', 1080, 360, NULL);

-- Cloud Console: high-tier, consumables, and materials sell-back
INSERT INTO shop_inventory (shop_id, item_def_id, price_buy, price_sell, stock)
VALUES
  ('cloud_console', 'query_optimizer', 2160, 720, NULL),
  ('cloud_console', 'test_suite', 2400, 800, NULL),
  ('cloud_console', 'cdn_layer', 600, 200, NULL),
  ('cloud_console', 'hot_fix_script', 50, 15, NULL),
  ('cloud_console', 'energy_drink', 35, 10, NULL),
  -- Materials can be sold at the Cloud Console
  ('cloud_console', 'raw_data_shard', 0, 5, NULL),
  ('cloud_console', 'corrupted_log_file', 0, 8, NULL),
  ('cloud_console', 'memory_dump', 0, 25, NULL),
  ('cloud_console', 'stack_trace', 0, 12, NULL);
