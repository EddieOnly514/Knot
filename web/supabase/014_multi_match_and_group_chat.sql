-- =============================================
-- 014_multi_match_and_group_chat.sql
-- 1) Max 4 matches per ride (user can match with up to 4 people)
-- 2) Group chat when >2 people matched (create ride_group, messages go to group)
-- =============================================

-- =============================================
-- 1. MAX 4 MATCHES PER RIDE
-- =============================================

-- Count how many accepted ride_requests involve this ride (as ride_id or requester_ride_id).
CREATE OR REPLACE FUNCTION count_accepted_matches_for_ride(p_ride_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM ride_requests rr
    WHERE rr.status = 'accepted'
      AND (rr.ride_id = p_ride_id OR rr.requester_ride_id = p_ride_id);
$$;

-- Enforce: a ride can be in at most 4 accepted ride_requests.
CREATE OR REPLACE FUNCTION check_ride_match_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
    v_ride_id UUID;
BEGIN
    -- Only care when status is being set to 'accepted'
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    -- Check ride_id side: owner can have at most 4 accepted requesters
    v_count := count_accepted_matches_for_ride(NEW.ride_id);
    IF v_count > 4 THEN
        RAISE EXCEPTION 'ride_match_cap_exceeded: This ride already has 4 matches. You cannot add more.';
    END IF;

    -- Check requester_ride_id side: requester can be in at most 4 accepted matches
    v_count := count_accepted_matches_for_ride(NEW.requester_ride_id);
    IF v_count > 4 THEN
        RAISE EXCEPTION 'ride_match_cap_exceeded: Your ride already has 4 matches. You cannot add more.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_check_match_cap ON ride_requests;
CREATE TRIGGER ride_requests_check_match_cap
    BEFORE INSERT OR UPDATE OF status
    ON ride_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted')
    EXECUTE FUNCTION check_ride_match_cap();


-- =============================================
-- 2. RIDE_GROUPS — one per ride when 3+ participants
-- =============================================

CREATE TABLE IF NOT EXISTS ride_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL UNIQUE REFERENCES rides(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_groups_ride_id ON ride_groups(ride_id);

-- RLS: participants of the ride (owner + any accepted requester) can read
ALTER TABLE ride_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ride_groups_select" ON ride_groups;
CREATE POLICY "ride_groups_select" ON ride_groups
    FOR SELECT USING (
        -- I own the ride that hosts this group
        ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
        OR
        -- I am an accepted requester for this group's ride (my ride is requester_ride_id)
        ride_id IN (
            SELECT rr.ride_id FROM ride_requests rr
            JOIN rides req_ride ON req_ride.id = rr.requester_ride_id
            WHERE rr.status = 'accepted'
              AND req_ride.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );


-- =============================================
-- 3. MESSAGES: support group (ride_group_id)
-- =============================================

-- Allow messages to belong to either a 1:1 conversation (ride_request) or a group (ride_group)
ALTER TABLE messages
    ADD COLUMN IF NOT EXISTS ride_group_id UUID REFERENCES ride_groups(id) ON DELETE CASCADE;

-- Make conversation_id nullable so group messages can use ride_group_id only
ALTER TABLE messages
    ALTER COLUMN conversation_id DROP NOT NULL;

ALTER TABLE messages
    DROP CONSTRAINT IF EXISTS messages_conversation_id_check;

ALTER TABLE messages
    DROP CONSTRAINT IF EXISTS messages_conversation_or_group_check;
ALTER TABLE messages
    ADD CONSTRAINT messages_conversation_or_group_check
    CHECK (
        (conversation_id IS NOT NULL AND ride_group_id IS NULL)
        OR (conversation_id IS NULL AND ride_group_id IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS idx_messages_ride_group
    ON messages(ride_group_id, created_at);


-- =============================================
-- 4. CREATE RIDE_GROUP WHEN 3+ PARTICIPANTS
-- =============================================

-- When a ride (ride_id) gets its 2nd accepted requester, we have 3 participants → create group.
-- Also migrate all existing 1:1 messages (for accepted requesters of this ride) into the group
-- so the group chat shows full history.
CREATE OR REPLACE FUNCTION maybe_create_ride_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_accepted_count INTEGER;
    v_group_id UUID;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    -- Count accepted requesters for this ride (ride_id = the "host" ride)
    SELECT COUNT(*) INTO v_accepted_count
    FROM ride_requests
    WHERE ride_id = NEW.ride_id AND status = 'accepted';

    -- 2+ accepted requesters = 3+ people (owner + 2) → create group if not exists
    IF v_accepted_count >= 2 THEN
        INSERT INTO ride_groups (ride_id)
        VALUES (NEW.ride_id)
        ON CONFLICT (ride_id) DO NOTHING;

        -- Get the group id (either just inserted or existing)
        SELECT id INTO v_group_id FROM ride_groups WHERE ride_id = NEW.ride_id LIMIT 1;

        -- Migrate all 1:1 messages from accepted ride_requests for this ride into the group,
        -- so the group chat shows previous messages.
        IF v_group_id IS NOT NULL THEN
            UPDATE messages
            SET conversation_id = NULL,
                ride_group_id = v_group_id
            WHERE conversation_id IN (
                SELECT id FROM ride_requests
                WHERE ride_id = NEW.ride_id AND status = 'accepted'
            )
              AND ride_group_id IS NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_maybe_create_group ON ride_requests;
CREATE TRIGGER ride_requests_maybe_create_group
    AFTER INSERT OR UPDATE OF status
    ON ride_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted')
    EXECUTE FUNCTION maybe_create_ride_group();


-- =============================================
-- 5. RLS FOR MESSAGES WITH ride_group_id
-- =============================================

-- Users can read messages in a group if they are a participant (owner of ride or accepted requester)
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
    FOR SELECT USING (
        -- 1:1 conversation (existing rule)
        (
            ride_group_id IS NULL
            AND conversation_id IN (
                SELECT rr.id FROM ride_requests rr
                JOIN rides r1 ON r1.id = rr.ride_id
                JOIN rides r2 ON r2.id = rr.requester_ride_id
                WHERE r1.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
                   OR r2.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            )
        )
        OR
        -- Group: user is ride owner or in an accepted request for this ride
        (
            ride_group_id IS NOT NULL
            AND ride_group_id IN (
                SELECT rg.id FROM ride_groups rg
                JOIN rides r ON r.id = rg.ride_id
                WHERE r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
                UNION
                SELECT rg.id FROM ride_groups rg
                JOIN ride_requests rr ON rr.ride_id = rg.ride_id AND rr.status = 'accepted'
                JOIN rides req_ride ON req_ride.id = rr.requester_ride_id
                WHERE req_ride.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            )
        )
    );

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
    FOR INSERT WITH CHECK (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND (
            (
                ride_group_id IS NULL
                AND conversation_id IN (
                    SELECT rr.id FROM ride_requests rr
                    JOIN rides r1 ON r1.id = rr.ride_id
                    JOIN rides r2 ON r2.id = rr.requester_ride_id
                    WHERE r1.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
                       OR r2.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
                )
            )
            OR
            (
                ride_group_id IS NOT NULL
                AND ride_group_id IN (
                    SELECT rg.id FROM ride_groups rg
                    JOIN rides r ON r.id = rg.ride_id
                    WHERE r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
                    UNION
                    SELECT rg.id FROM ride_groups rg
                    JOIN ride_requests rr ON rr.ride_id = rg.ride_id AND rr.status = 'accepted'
                    JOIN rides req_ride ON req_ride.id = rr.requester_ride_id
                    WHERE req_ride.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
                )
            )
        )
    );

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages
    FOR UPDATE USING (
        (
            ride_group_id IS NULL
            AND conversation_id IN (
                SELECT rr.id FROM ride_requests rr
                JOIN rides r1 ON r1.id = rr.ride_id
                JOIN rides r2 ON r2.id = rr.requester_ride_id
                WHERE r1.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
                   OR r2.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            )
        )
        OR
        (
            ride_group_id IS NOT NULL
            AND ride_group_id IN (
                SELECT rg.id FROM ride_groups rg
                JOIN rides r ON r.id = rg.ride_id
                WHERE r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
                UNION
                SELECT rg.id FROM ride_groups rg
                JOIN ride_requests rr ON rr.ride_id = rg.ride_id AND rr.status = 'accepted'
                JOIN rides req_ride ON req_ride.id = rr.requester_ride_id
                WHERE req_ride.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            )
        )
    );


-- =============================================
-- 6. HELPER: get ride_group_id for a ride (if any)
-- =============================================

CREATE OR REPLACE FUNCTION get_ride_group_id(p_ride_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT id FROM ride_groups WHERE ride_id = p_ride_id LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION count_accepted_matches_for_ride(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_ride_group_id(UUID) TO authenticated;
