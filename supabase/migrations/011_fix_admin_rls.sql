-- Migration 011: Fix admin RLS infinite recursion
-- Drops the "admins_can_read_all_players" policy which caused a self-referential
-- subquery on the players table, triggering infinite recursion and a PostgREST 500
-- on every players SELECT.
--
-- The policy is also redundant: migration 001 already has "players_select_all"
-- which grants SELECT to all authenticated users (USING (true)).

DROP POLICY IF EXISTS "admins_can_read_all_players" ON players;
