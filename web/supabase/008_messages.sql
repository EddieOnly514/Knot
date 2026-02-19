-- =============================================
-- 008_messages.sql
-- Chat/messaging schema for ride buddy conversations
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Add ride_status to ride_requests for tracking progression
ALTER TABLE ride_requests
    ADD COLUMN IF NOT EXISTS ride_status TEXT DEFAULT 'requested'
    CHECK (ride_status IN ('requested', 'accepted', 'confirmed', 'completed', 'cancelled'));

-- Ensure both sides of a match can update ride_status (e.g. confirm meetup, complete ride)
DROP POLICY IF EXISTS "ride_requests_update" ON ride_requests;
CREATE POLICY "ride_requests_update" ON ride_requests
    FOR UPDATE USING (
        ride_id IN (
            SELECT id FROM rides
            WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
        OR requester_ride_id IN (
            SELECT id FROM rides
            WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- Update existing accepted requests to have 'accepted' ride_status
UPDATE ride_requests SET ride_status = 'accepted' WHERE status = 'accepted' AND ride_status = 'requested';

-- 2. Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- conversation_id links to ride_requests.id (each accepted request = one conversation)
    conversation_id UUID NOT NULL REFERENCES ride_requests(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    -- text = normal message, quick_action = structured shortcut, location = location share
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'quick_action', 'location', 'system')),
    -- JSON metadata for location messages: { lat, lng, label, map_url }
    metadata JSONB,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_messages_conversation
    ON messages(conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_sender
    ON messages(sender_id);

-- 4. Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages in conversations they're part of
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT rr.id FROM ride_requests rr
            JOIN rides r1 ON r1.id = rr.ride_id
            JOIN rides r2 ON r2.id = rr.requester_ride_id
            WHERE r1.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
               OR r2.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- Users can insert messages in their conversations
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
    FOR INSERT WITH CHECK (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND conversation_id IN (
            SELECT rr.id FROM ride_requests rr
            JOIN rides r1 ON r1.id = rr.ride_id
            JOIN rides r2 ON r2.id = rr.requester_ride_id
            WHERE r1.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
               OR r2.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- Users can update their own messages (for read receipts on messages sent TO them)
DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
    FOR UPDATE USING (
        conversation_id IN (
            SELECT rr.id FROM ride_requests rr
            JOIN rides r1 ON r1.id = rr.ride_id
            JOIN rides r2 ON r2.id = rr.requester_ride_id
            WHERE r1.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
               OR r2.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- 5. Enable realtime for messages table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    END IF;
END $$;
