-- Migration 010: Admin RLS
-- Adds a permissive SELECT policy on players for users with is_admin = true.
-- Required so the admin /players page server component (using the user-scoped
-- SSR Supabase client) can read all player rows, not just the authenticated user's own row.

CREATE POLICY "admins_can_read_all_players"
  ON players FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM players self
      WHERE self.id = auth.uid() AND self.is_admin = true
    )
  );
