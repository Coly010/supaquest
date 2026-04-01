-- Migration 009: Focus replenishment via pg_cron
-- Creates a scheduled job that ticks all players' Focus up by 10 every 10 minutes, capped at maximum.

-- ============================================================
-- EXTENSION
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- ============================================================
-- REPLENISHMENT FUNCTION
-- ============================================================

-- Replenish all players' focus by 10 (capped at maximum)
CREATE OR REPLACE FUNCTION replenish_all_focus()
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE player_resources
  SET current = LEAST(current + 10, maximum)
  WHERE resource_type = 'focus';
END;
$$;

-- Replenish focus for a single player (admin / testing use)
CREATE OR REPLACE FUNCTION replenish_player_focus(p_player_id UUID)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE player_resources
  SET current = LEAST(current + 10, maximum)
  WHERE player_id = p_player_id AND resource_type = 'focus';
END;
$$;

-- ============================================================
-- SCHEDULE
-- ============================================================

-- Run every 10 minutes
-- NOTE: in local dev the pg_cron background worker runs inside the Supabase Docker container.
-- If the job doesn't fire automatically, call SELECT replenish_all_focus() manually for testing.
SELECT cron.schedule(
  'replenish-focus',
  '*/10 * * * *',
  'SELECT replenish_all_focus()'
);
