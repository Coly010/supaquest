-- Migration 007: Chat messages with Supabase Realtime
-- Creates chat_messages table with channel-based routing and enables Realtime publication.

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     TEXT NOT NULL,      -- "general", "environment:{area_id}", "dm:{sorted_player_ids}"
  sender_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX chat_messages_channel_created_at_idx ON chat_messages(channel, created_at DESC);
CREATE INDEX chat_messages_sender_id_idx ON chat_messages(sender_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat messages: authenticated players can read all messages (open chat)
-- but can only insert as themselves
CREATE POLICY "chat_messages_select_authenticated" ON chat_messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "chat_messages_insert_own" ON chat_messages
  FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());

-- ============================================================
-- REALTIME
-- ============================================================

-- Enable Realtime for chat_messages so clients receive live updates via subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
