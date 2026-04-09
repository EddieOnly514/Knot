-- =============================================
-- 028_group_chat_only.sql
-- Convert all chat to group-only. No more 1:1 conversations.
-- Every accepted match immediately belongs to a ride_group.
-- Max group size: 6 people. Leave/join never breaks the group.
-- =============================================

SET search_path = public;

-- 1. Seat-aware group cap: total seats across group members <= 6.
--    seats_needed on each ride represents how many people that ride brings.
--    A ride with seats_needed=2 takes 2 of the 6 slots.
CREATE OR REPLACE FUNCTION count_group_seats_for_ride(p_ride_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(SUM(r.seats_needed), 0)::INTEGER
    FROM ride_group_members rgm
    JOIN rides r ON r.id = rgm.ride_id
    WHERE rgm.left_at IS NULL
      AND rgm.ride_group_id IN (
          SELECT rgm2.ride_group_id
          FROM ride_group_members rgm2
          WHERE rgm2.ride_id = p_ride_id
            AND rgm2.left_at IS NULL
      );
$$;

CREATE OR REPLACE FUNCTION check_ride_match_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_existing_seats INTEGER;
    v_new_seats INTEGER;
    v_total INTEGER;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    -- Get current total seats in the host ride's group (0 if no group yet)
    v_existing_seats := count_group_seats_for_ride(NEW.ride_id);

    -- If no group exists yet, the host ride itself isn't counted above,
    -- so start with the host ride's seats
    IF v_existing_seats = 0 THEN
        SELECT COALESCE(r.seats_needed, 1)
        INTO v_existing_seats
        FROM rides r WHERE r.id = NEW.ride_id;
    END IF;

    -- The new joiner's seats
    SELECT COALESCE(r.seats_needed, 1)
    INTO v_new_seats
    FROM rides r WHERE r.id = NEW.requester_ride_id;

    v_total := v_existing_seats + v_new_seats;

    IF v_total > 6 THEN
        RAISE EXCEPTION 'ride_match_cap_exceeded: Group is full. Max 6 people per ride group (current: %, adding: %).', v_existing_seats, v_new_seats;
    END IF;

    RETURN NEW;
END;
$$;

-- 2. New leave function that takes ride_group_id directly
CREATE OR REPLACE FUNCTION leave_ride_group(p_ride_group_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_profile_id UUID;
    v_member_ride_id UUID;
    v_name TEXT;
BEGIN
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT rgm.ride_id
    INTO v_member_ride_id
    FROM ride_group_members rgm
    JOIN rides r ON r.id = rgm.ride_id
    WHERE rgm.ride_group_id = p_ride_group_id
      AND r.user_id = v_profile_id
      AND rgm.left_at IS NULL
    ORDER BY rgm.joined_at ASC
    LIMIT 1;

    IF v_member_ride_id IS NULL THEN
        RAISE EXCEPTION 'You are not a participant in this group.';
    END IF;

    UPDATE ride_group_members
    SET left_at = NOW(),
        is_main = FALSE
    WHERE ride_group_id = p_ride_group_id
      AND ride_id = v_member_ride_id
      AND left_at IS NULL;

    UPDATE ride_requests
    SET status = 'rejected',
        ride_status = 'cancelled',
        updated_at = NOW()
    WHERE status = 'accepted'
      AND (ride_id = v_member_ride_id OR requester_ride_id = v_member_ride_id);

    SELECT ride_display_name(v_member_ride_id) INTO v_name;

    PERFORM append_group_system_message(
        p_ride_group_id,
        format('%s left the group.', COALESCE(v_name, 'Someone')),
        jsonb_build_object('type', 'member_left', 'ride_id', v_member_ride_id)
    );

    PERFORM recalculate_ride_group(p_ride_group_id, 'leave');
    RETURN p_ride_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION leave_ride_group(UUID) TO authenticated;

-- 3. Backfill: ensure any accepted ride_request that lacks a group gets one.
--    The sync_group_after_accept trigger handles new accepts, but old data might
--    have conversation_id-only messages without a group.
DO $$
DECLARE
    v_req RECORD;
    v_group_id UUID;
BEGIN
    FOR v_req IN
        SELECT rr.id, rr.ride_id, rr.requester_ride_id
        FROM ride_requests rr
        WHERE rr.status = 'accepted'
          AND NOT EXISTS (
              SELECT 1
              FROM ride_group_members rgm
              WHERE rgm.ride_id IN (rr.ride_id, rr.requester_ride_id)
                AND rgm.left_at IS NULL
          )
    LOOP
        INSERT INTO ride_groups (ride_id, status, updated_at)
        VALUES (v_req.ride_id, 'active', NOW())
        RETURNING id INTO v_group_id;

        PERFORM upsert_group_member(v_group_id, v_req.ride_id, TRUE);
        PERFORM upsert_group_member(v_group_id, v_req.requester_ride_id, FALSE);

        UPDATE messages
        SET conversation_id = NULL,
            ride_group_id = v_group_id
        WHERE conversation_id = v_req.id
          AND ride_group_id IS NULL;

        PERFORM recalculate_ride_group(v_group_id, 'backfill_028');
    END LOOP;
END $$;

-- 4. Migrate any remaining conversation_id messages to their group
UPDATE messages m
SET conversation_id = NULL,
    ride_group_id = (
        SELECT rgm.ride_group_id
        FROM ride_requests rr
        JOIN ride_group_members rgm ON rgm.ride_id IN (rr.ride_id, rr.requester_ride_id)
        WHERE rr.id = m.conversation_id
          AND rgm.left_at IS NULL
        LIMIT 1
    )
WHERE m.conversation_id IS NOT NULL
  AND m.ride_group_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM ride_requests rr
      JOIN ride_group_members rgm ON rgm.ride_id IN (rr.ride_id, rr.requester_ride_id)
      WHERE rr.id = m.conversation_id
        AND rgm.left_at IS NULL
  );

-- 5. Update ride_fits_group_core to allow 6 people max (already 6, just making it explicit)
CREATE OR REPLACE FUNCTION ride_fits_group_core(
    p_anchor_ride_id UUID,
    p_interval_start TIMESTAMPTZ,
    p_interval_end TIMESTAMPTZ,
    p_origin_centroid_lat DECIMAL,
    p_origin_centroid_lng DECIMAL,
    p_total_seats INTEGER,
    p_candidate_ride_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_anchor rides%ROWTYPE;
    v_candidate rides%ROWTYPE;
    v_overlap_minutes INTEGER;
    v_gap_minutes INTEGER;
BEGIN
    SELECT * INTO v_anchor FROM rides WHERE id = p_anchor_ride_id;
    SELECT * INTO v_candidate FROM rides WHERE id = p_candidate_ride_id;

    IF v_anchor IS NULL OR v_candidate IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_candidate.status <> 'active' THEN
        RETURN FALSE;
    END IF;

    IF COALESCE(v_candidate.departure_preferred, v_candidate.departure_earliest)::DATE
        IS DISTINCT FROM COALESCE(v_anchor.departure_preferred, v_anchor.departure_earliest)::DATE THEN
        RETURN FALSE;
    END IF;

    IF haversine_miles(v_anchor.dest_lat, v_anchor.dest_lng, v_candidate.dest_lat, v_candidate.dest_lng) > 2.0 THEN
        RETURN FALSE;
    END IF;

    IF haversine_miles(p_origin_centroid_lat, p_origin_centroid_lng, v_candidate.origin_lat, v_candidate.origin_lng) > 2.0 THEN
        RETURN FALSE;
    END IF;

    -- 6 people max
    IF p_total_seats + COALESCE(v_candidate.seats_needed, 1) > 6 THEN
        RETURN FALSE;
    END IF;

    v_overlap_minutes := GREATEST(
        0,
        EXTRACT(EPOCH FROM (
            LEAST(p_interval_end, v_candidate.departure_latest)
            - GREATEST(p_interval_start, v_candidate.departure_earliest)
        ))::INTEGER / 60
    );

    IF v_overlap_minutes > 0 THEN
        RETURN TRUE;
    END IF;

    v_gap_minutes := GREATEST(
        0,
        EXTRACT(EPOCH FROM (
            GREATEST(p_interval_start, v_candidate.departure_earliest)
            - LEAST(p_interval_end, v_candidate.departure_latest)
        ))::INTEGER / 60
    );

    RETURN v_gap_minutes <= 180;
END;
$$;
