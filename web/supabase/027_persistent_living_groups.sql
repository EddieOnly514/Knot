-- =============================================
-- 027_persistent_living_groups.sql
-- Persistent "living" ride groups:
-- - group chats survive member departures
-- - memberships are explicit instead of inferred only from ride_requests
-- - group stats are recalculated on join / leave / ride edits
-- - system messages are emitted for visible changes
-- =============================================

SET search_path = public;

-- Drop conflicting triggers from 014/020 that are superseded by this migration.
-- maybe_create_ride_group (014/020) conflicts with sync_group_after_accept:
--   both fire on ride_requests AFTER INSERT/UPDATE when status='accepted'.
-- maybe_dissolve_ride_group (020) CASCADE-deletes the group on member exit,
--   destroying all messages — the opposite of "persistent living groups".
DROP TRIGGER IF EXISTS ride_requests_maybe_create_group ON ride_requests;
DROP TRIGGER IF EXISTS ride_requests_maybe_dissolve_group ON ride_requests;
DROP FUNCTION IF EXISTS maybe_create_ride_group();
DROP FUNCTION IF EXISTS maybe_dissolve_ride_group();

ALTER TABLE ride_groups
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'archived')),
    ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS rider_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total_bags INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS has_oversized BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS needs_xl BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS match_label TEXT,
    ADD COLUMN IF NOT EXISTS effective_departure_earliest TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS effective_departure_latest TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS effective_date DATE,
    ADD COLUMN IF NOT EXISTS origin_centroid_lat DECIMAL(10, 7),
    ADD COLUMN IF NOT EXISTS origin_centroid_lng DECIMAL(10, 7);

CREATE TABLE IF NOT EXISTS ride_group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_group_id UUID NOT NULL REFERENCES ride_groups(id) ON DELETE CASCADE,
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE (ride_group_id, ride_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ride_group_members_active_ride
    ON ride_group_members (ride_id)
    WHERE left_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ride_group_members_active_main
    ON ride_group_members (ride_group_id)
    WHERE left_at IS NULL AND is_main = TRUE;

CREATE INDEX IF NOT EXISTS idx_ride_group_members_group
    ON ride_group_members (ride_group_id, left_at, joined_at);

-- RLS helper: SELECT policy must not subquery ride_group_members directly (infinite recursion).
CREATE OR REPLACE FUNCTION ride_group_members_visible_to_me(
    p_ride_id UUID,
    p_ride_group_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM rides r
        WHERE r.id = p_ride_id
          AND r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1
        FROM ride_group_members rgm
        JOIN rides r ON r.id = rgm.ride_id
        WHERE rgm.ride_group_id = p_ride_group_id
          AND rgm.left_at IS NULL
          AND r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );
$$;

REVOKE EXECUTE ON FUNCTION ride_group_members_visible_to_me(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ride_group_members_visible_to_me(UUID, UUID) TO authenticated;

ALTER TABLE ride_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ride_group_members_select" ON ride_group_members;
CREATE POLICY "ride_group_members_select" ON ride_group_members
    FOR SELECT USING (ride_group_members_visible_to_me(ride_id, ride_group_id));

CREATE OR REPLACE FUNCTION luggage_units_from_space_capacity(p_space_capacity INTEGER)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE p_space_capacity
        WHEN 1 THEN 1
        WHEN 2 THEN 2
        ELSE 0
    END;
$$;

CREATE OR REPLACE FUNCTION ride_display_name(p_ride_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(p.first_name, 'Someone') || COALESCE(' ' || LEFT(p.last_name, 1) || '.', '')
    FROM rides r
    JOIN profiles p ON p.id = r.user_id
    WHERE r.id = p_ride_id
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION active_system_sender_for_group(p_ride_group_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT r.user_id
    FROM ride_group_members rgm
    JOIN rides r ON r.id = rgm.ride_id
    WHERE rgm.ride_group_id = p_ride_group_id
      AND rgm.left_at IS NULL
    ORDER BY rgm.is_main DESC, rgm.joined_at ASC
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION append_group_system_message(
    p_ride_group_id UUID,
    p_content TEXT,
    p_metadata JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_sender_id UUID;
BEGIN
    SELECT active_system_sender_for_group(p_ride_group_id)
    INTO v_sender_id;

    IF v_sender_id IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type, metadata)
    VALUES (NULL, p_ride_group_id, v_sender_id, p_content, 'system', p_metadata);
END;
$$;

CREATE OR REPLACE FUNCTION pick_main_ride_for_group(p_ride_group_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT rgm.ride_id
    FROM ride_group_members rgm
    WHERE rgm.ride_group_id = p_ride_group_id
      AND rgm.left_at IS NULL
    ORDER BY rgm.is_main DESC, rgm.joined_at ASC, rgm.ride_id
    LIMIT 1;
$$;

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

    RETURN v_gap_minutes <= 240;
END;
$$;

CREATE OR REPLACE FUNCTION recalculate_ride_group(
    p_ride_group_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_old_record ride_groups%ROWTYPE;
    v_main_ride_id UUID;
    v_kept_ride_ids UUID[];
    v_removed_ride_ids UUID[];
    v_member RECORD;
    v_interval_start TIMESTAMPTZ;
    v_interval_end TIMESTAMPTZ;
    v_origin_centroid_lat DECIMAL;
    v_origin_centroid_lng DECIMAL;
    v_total_seats INTEGER;
    v_total_bags INTEGER;
    v_has_oversized BOOLEAN;
    v_rider_count INTEGER;
    v_effective_date DATE;
    v_match_label TEXT;
BEGIN
    SELECT * INTO v_old_record
    FROM ride_groups
    WHERE id = p_ride_group_id
    FOR UPDATE;

    IF v_old_record IS NULL THEN
        RETURN;
    END IF;

    v_main_ride_id := pick_main_ride_for_group(p_ride_group_id);

    IF v_main_ride_id IS NULL THEN
        UPDATE ride_groups
        SET status = 'archived',
            archived_at = COALESCE(archived_at, NOW()),
            updated_at = NOW(),
            rider_count = 0,
            total_bags = 0,
            has_oversized = FALSE,
            needs_xl = FALSE,
            match_label = NULL,
            effective_departure_earliest = NULL,
            effective_departure_latest = NULL,
            effective_date = NULL,
            origin_centroid_lat = NULL,
            origin_centroid_lng = NULL
        WHERE id = p_ride_group_id;
        RETURN;
    END IF;

    v_kept_ride_ids := ARRAY[v_main_ride_id];

    SELECT
        r.departure_earliest,
        r.departure_latest,
        r.origin_lat,
        r.origin_lng,
        r.seats_needed,
        COALESCE(COALESCE(r.departure_preferred, r.departure_earliest)::DATE, r.departure_earliest::DATE)
    INTO
        v_interval_start,
        v_interval_end,
        v_origin_centroid_lat,
        v_origin_centroid_lng,
        v_total_seats,
        v_effective_date
    FROM rides r
    WHERE r.id = v_main_ride_id;

    FOR v_member IN
        SELECT rgm.ride_id
        FROM ride_group_members rgm
        WHERE rgm.ride_group_id = p_ride_group_id
          AND rgm.left_at IS NULL
          AND rgm.ride_id <> v_main_ride_id
        ORDER BY rgm.joined_at ASC, rgm.ride_id
    LOOP
        IF ride_fits_group_core(
            v_main_ride_id,
            v_interval_start,
            v_interval_end,
            v_origin_centroid_lat,
            v_origin_centroid_lng,
            v_total_seats,
            v_member.ride_id
        ) THEN
            v_kept_ride_ids := array_append(v_kept_ride_ids, v_member.ride_id);

            SELECT
                GREATEST(v_interval_start, r.departure_earliest),
                LEAST(v_interval_end, r.departure_latest),
                (
                    SELECT AVG(r2.origin_lat)
                    FROM rides r2
                    WHERE r2.id = ANY(v_kept_ride_ids)
                ),
                (
                    SELECT AVG(r2.origin_lng)
                    FROM rides r2
                    WHERE r2.id = ANY(v_kept_ride_ids)
                ),
                v_total_seats + r.seats_needed
            INTO
                v_interval_start,
                v_interval_end,
                v_origin_centroid_lat,
                v_origin_centroid_lng,
                v_total_seats
            FROM rides r
            WHERE r.id = v_member.ride_id;
        END IF;
    END LOOP;

    SELECT array_agg(rgm.ride_id)
    INTO v_removed_ride_ids
    FROM ride_group_members rgm
    WHERE rgm.ride_group_id = p_ride_group_id
      AND rgm.left_at IS NULL
      AND NOT (rgm.ride_id = ANY(v_kept_ride_ids));

    IF COALESCE(array_length(v_removed_ride_ids, 1), 0) > 0 THEN
        UPDATE ride_group_members
        SET left_at = NOW(),
            is_main = FALSE
        WHERE ride_group_id = p_ride_group_id
          AND ride_id = ANY(v_removed_ride_ids)
          AND left_at IS NULL;

        UPDATE ride_requests
        SET status = 'rejected',
            ride_status = 'cancelled',
            updated_at = NOW()
        WHERE status = 'accepted'
          AND (
            ride_id = ANY(v_removed_ride_ids)
            OR requester_ride_id = ANY(v_removed_ride_ids)
          );

        PERFORM append_group_system_message(
            p_ride_group_id,
            format(
                '%s no longer fit the group and were removed.',
                array_to_string(
                    ARRAY(
                        SELECT ride_display_name(ride_id)
                        FROM unnest(v_removed_ride_ids) AS ride_id
                    ),
                    ', '
                )
            ),
            jsonb_build_object('type', 'members_removed', 'ride_ids', v_removed_ride_ids)
        );
    END IF;

    SELECT pick_main_ride_for_group(p_ride_group_id)
    INTO v_main_ride_id;

    UPDATE ride_group_members
    SET is_main = FALSE
    WHERE ride_group_id = p_ride_group_id;

    UPDATE ride_group_members
    SET is_main = TRUE
    WHERE ride_group_id = p_ride_group_id
      AND ride_id = v_main_ride_id
      AND left_at IS NULL;

    SELECT
        COUNT(*)::INTEGER,
        COALESCE(SUM(luggage_units_from_space_capacity(r.space_capacity)), 0)::INTEGER,
        BOOL_OR(r.space_capacity = 3),
        MAX(r.departure_earliest),
        MIN(r.departure_latest),
        AVG(r.origin_lat),
        AVG(r.origin_lng),
        MAX(COALESCE(r.departure_preferred, r.departure_earliest))::DATE
    INTO
        v_rider_count,
        v_total_bags,
        v_has_oversized,
        v_interval_start,
        v_interval_end,
        v_origin_centroid_lat,
        v_origin_centroid_lng,
        v_effective_date
    FROM ride_group_members rgm
    JOIN rides r ON r.id = rgm.ride_id
    WHERE rgm.ride_group_id = p_ride_group_id
      AND rgm.left_at IS NULL;

    v_match_label := CASE
        WHEN v_rider_count <= 1 THEN 'Open Ride'
        WHEN EXTRACT(EPOCH FROM (v_interval_end - v_interval_start))::INTEGER / 60 >= 60 THEN 'Great Match'
        WHEN EXTRACT(EPOCH FROM (v_interval_end - v_interval_start))::INTEGER / 60 >= 30 THEN 'Okay Match'
        ELSE 'Possible Match'
    END;

    UPDATE ride_groups
    SET ride_id = v_main_ride_id,
        status = CASE
            WHEN v_rider_count = 0 OR (v_interval_end IS NOT NULL AND v_interval_end < NOW()) THEN 'archived'
            ELSE 'active'
        END,
        archived_at = CASE
            WHEN v_rider_count = 0 OR (v_interval_end IS NOT NULL AND v_interval_end < NOW())
                THEN COALESCE(archived_at, NOW())
            ELSE NULL
        END,
        updated_at = NOW(),
        rider_count = COALESCE(v_rider_count, 0),
        total_bags = COALESCE(v_total_bags, 0),
        has_oversized = COALESCE(v_has_oversized, FALSE),
        needs_xl = (
            COALESCE(v_total_bags, 0) >= 4
            OR COALESCE(v_has_oversized, FALSE)
            OR COALESCE(v_rider_count, 0) > 4
        ),
        match_label = v_match_label,
        effective_departure_earliest = v_interval_start,
        effective_departure_latest = v_interval_end,
        effective_date = v_effective_date,
        origin_centroid_lat = v_origin_centroid_lat,
        origin_centroid_lng = v_origin_centroid_lng
    WHERE id = p_ride_group_id;

    IF v_old_record.needs_xl IS DISTINCT FROM (
        COALESCE(v_total_bags, 0) >= 4
        OR COALESCE(v_has_oversized, FALSE)
        OR COALESCE(v_rider_count, 0) > 4
    ) THEN
        IF COALESCE(v_total_bags, 0) >= 4 OR COALESCE(v_has_oversized, FALSE) OR COALESCE(v_rider_count, 0) > 4 THEN
            PERFORM append_group_system_message(
                p_ride_group_id,
                'Group update: this ride now needs Uber XL.',
                jsonb_build_object('type', 'needs_xl_on')
            );
        ELSE
            PERFORM append_group_system_message(
                p_ride_group_id,
                'Group update: Uber XL is no longer needed.',
                jsonb_build_object('type', 'needs_xl_off')
            );
        END IF;
    END IF;

    IF v_old_record.status IS DISTINCT FROM 'archived'
       AND (v_rider_count = 0 OR (v_interval_end IS NOT NULL AND v_interval_end < NOW())) THEN
        PERFORM append_group_system_message(
            p_ride_group_id,
            'This ride group was archived.',
            jsonb_build_object('type', 'group_archived', 'reason', p_reason)
        );
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION upsert_group_member(
    p_ride_group_id UUID,
    p_ride_id UUID,
    p_is_main BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
    INSERT INTO ride_group_members (ride_group_id, ride_id, is_main, left_at)
    VALUES (p_ride_group_id, p_ride_id, p_is_main, NULL)
    ON CONFLICT (ride_group_id, ride_id)
    DO UPDATE
    SET left_at = NULL,
        is_main = EXCLUDED.is_main,
        joined_at = COALESCE(ride_group_members.joined_at, NOW());
END;
$$;

CREATE OR REPLACE FUNCTION validate_group_join_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_group_id UUID;
    v_anchor_ride_id UUID;
    v_interval_start TIMESTAMPTZ;
    v_interval_end TIMESTAMPTZ;
    v_origin_centroid_lat DECIMAL;
    v_origin_centroid_lng DECIMAL;
    v_total_seats INTEGER;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    SELECT rg.id, rg.ride_id
    INTO v_group_id, v_anchor_ride_id
    FROM ride_groups rg
    WHERE rg.status = 'active'
      AND (
        rg.ride_id = NEW.ride_id
        OR rg.id IN (
            SELECT ride_group_id
            FROM ride_group_members
            WHERE ride_id IN (NEW.ride_id, NEW.requester_ride_id)
              AND left_at IS NULL
        )
      )
    ORDER BY CASE WHEN rg.ride_id = NEW.ride_id THEN 0 ELSE 1 END
    LIMIT 1
    FOR UPDATE;

    IF v_group_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT
        MAX(r.departure_earliest),
        MIN(r.departure_latest),
        AVG(r.origin_lat),
        AVG(r.origin_lng),
        COALESCE(SUM(r.seats_needed), 0)
    INTO
        v_interval_start,
        v_interval_end,
        v_origin_centroid_lat,
        v_origin_centroid_lng,
        v_total_seats
    FROM ride_group_members rgm
    JOIN rides r ON r.id = rgm.ride_id
    WHERE rgm.ride_group_id = v_group_id
      AND rgm.left_at IS NULL;

    IF NOT ride_fits_group_core(
        v_anchor_ride_id,
        v_interval_start,
        v_interval_end,
        v_origin_centroid_lat,
        v_origin_centroid_lng,
        v_total_seats,
        NEW.requester_ride_id
    ) THEN
        RAISE EXCEPTION 'ride_group_join_invalid: This rider no longer fits the group.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_validate_group_join ON ride_requests;
CREATE TRIGGER ride_requests_validate_group_join
    BEFORE INSERT OR UPDATE OF status
    ON ride_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted')
    EXECUTE FUNCTION validate_group_join_on_accept();

CREATE OR REPLACE FUNCTION sync_group_after_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_group_id UUID;
    v_host_group_id UUID;
    v_requester_group_id UUID;
    v_new_joiner_name TEXT;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    SELECT rgm.ride_group_id
    INTO v_host_group_id
    FROM ride_group_members rgm
    WHERE rgm.ride_id = NEW.ride_id
      AND rgm.left_at IS NULL
    LIMIT 1;

    SELECT rgm.ride_group_id
    INTO v_requester_group_id
    FROM ride_group_members rgm
    WHERE rgm.ride_id = NEW.requester_ride_id
      AND rgm.left_at IS NULL
    LIMIT 1;

    v_group_id := COALESCE(v_host_group_id, v_requester_group_id);

    IF v_group_id IS NULL THEN
        INSERT INTO ride_groups (ride_id, status, updated_at)
        VALUES (NEW.ride_id, 'active', NOW())
        RETURNING id INTO v_group_id;
    END IF;

    PERFORM upsert_group_member(v_group_id, NEW.ride_id, TRUE);
    PERFORM upsert_group_member(v_group_id, NEW.requester_ride_id, FALSE);

    UPDATE messages
    SET conversation_id = NULL,
        ride_group_id = v_group_id
    WHERE conversation_id = NEW.id
      AND ride_group_id IS NULL;

    SELECT ride_display_name(NEW.requester_ride_id)
    INTO v_new_joiner_name;

    PERFORM recalculate_ride_group(v_group_id, 'join');

    PERFORM append_group_system_message(
        v_group_id,
        format('%s joined the group.', COALESCE(v_new_joiner_name, 'Someone')),
        jsonb_build_object('type', 'member_joined', 'ride_id', NEW.requester_ride_id)
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_sync_group_after_accept ON ride_requests;
CREATE TRIGGER ride_requests_sync_group_after_accept
    AFTER INSERT OR UPDATE OF status
    ON ride_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted')
    EXECUTE FUNCTION sync_group_after_accept();

CREATE OR REPLACE FUNCTION sync_group_after_request_exit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_group_id UUID;
    v_name TEXT;
BEGIN
    IF OLD.status <> 'accepted' OR NEW.status = 'accepted' THEN
        RETURN NEW;
    END IF;

    SELECT ride_group_id
    INTO v_group_id
    FROM ride_group_members
    WHERE ride_id = OLD.requester_ride_id
      AND left_at IS NULL
    LIMIT 1;

    IF v_group_id IS NULL THEN
        RETURN NEW;
    END IF;

    UPDATE ride_group_members
    SET left_at = NOW(),
        is_main = FALSE
    WHERE ride_group_id = v_group_id
      AND ride_id = OLD.requester_ride_id
      AND left_at IS NULL;

    SELECT ride_display_name(OLD.requester_ride_id) INTO v_name;

    PERFORM append_group_system_message(
        v_group_id,
        format('%s left the group.', COALESCE(v_name, 'Someone')),
        jsonb_build_object('type', 'member_left', 'ride_id', OLD.requester_ride_id)
    );

    PERFORM recalculate_ride_group(v_group_id, 'leave');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_sync_group_after_exit ON ride_requests;
CREATE TRIGGER ride_requests_sync_group_after_exit
    AFTER UPDATE OF status
    ON ride_requests
    FOR EACH ROW
    WHEN (OLD.status = 'accepted' AND NEW.status IS DISTINCT FROM 'accepted')
    EXECUTE FUNCTION sync_group_after_request_exit();

CREATE OR REPLACE FUNCTION sync_group_after_ride_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_group_id UUID;
    v_group_status TEXT;
    v_name TEXT;
BEGIN
    SELECT rgm.ride_group_id, rg.status
    INTO v_group_id, v_group_status
    FROM ride_group_members rgm
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE rgm.ride_id = NEW.id
      AND rgm.left_at IS NULL
    LIMIT 1;

    IF v_group_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- When a ride is completed and the group is already archived (e.g. via
    -- updateRideStatusForGroup), skip the per-member "left the group" noise.
    IF NEW.status = 'completed' AND v_group_status = 'archived' THEN
        UPDATE ride_group_members
        SET left_at = NOW(), is_main = FALSE
        WHERE ride_group_id = v_group_id
          AND ride_id = NEW.id
          AND left_at IS NULL;
        RETURN NEW;
    END IF;

    SELECT ride_display_name(NEW.id) INTO v_name;

    IF NEW.status <> 'active' THEN
        UPDATE ride_group_members
        SET left_at = NOW(),
            is_main = FALSE
        WHERE ride_group_id = v_group_id
          AND ride_id = NEW.id
          AND left_at IS NULL;

        UPDATE ride_requests
        SET status = 'rejected',
            ride_status = 'cancelled',
            updated_at = NOW()
        WHERE status = 'accepted'
          AND (ride_id = NEW.id OR requester_ride_id = NEW.id);

        PERFORM append_group_system_message(
            v_group_id,
            format('%s left the group.', COALESCE(v_name, 'Someone')),
            jsonb_build_object('type', 'member_left', 'ride_id', NEW.id, 'reason', 'ride_inactive')
        );
        PERFORM recalculate_ride_group(v_group_id, 'ride_inactive');
        RETURN NEW;
    END IF;

    PERFORM append_group_system_message(
        v_group_id,
        format('%s updated their ride details.', COALESCE(v_name, 'Someone')),
        jsonb_build_object('type', 'ride_updated', 'ride_id', NEW.id)
    );

    PERFORM recalculate_ride_group(v_group_id, 'ride_updated');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rides_sync_group_after_update ON rides;
CREATE TRIGGER rides_sync_group_after_update
    AFTER UPDATE OF origin_lat, origin_lng, origin_name, dest_lat, dest_lng, dest_name,
                    departure_earliest, departure_latest, departure_preferred,
                    seats_needed, space_capacity, status
    ON rides
    FOR EACH ROW
    WHEN (
        OLD.origin_lat IS DISTINCT FROM NEW.origin_lat
        OR OLD.origin_lng IS DISTINCT FROM NEW.origin_lng
        OR OLD.origin_name IS DISTINCT FROM NEW.origin_name
        OR OLD.dest_lat IS DISTINCT FROM NEW.dest_lat
        OR OLD.dest_lng IS DISTINCT FROM NEW.dest_lng
        OR OLD.dest_name IS DISTINCT FROM NEW.dest_name
        OR OLD.departure_earliest IS DISTINCT FROM NEW.departure_earliest
        OR OLD.departure_latest IS DISTINCT FROM NEW.departure_latest
        OR OLD.departure_preferred IS DISTINCT FROM NEW.departure_preferred
        OR OLD.seats_needed IS DISTINCT FROM NEW.seats_needed
        OR OLD.space_capacity IS DISTINCT FROM NEW.space_capacity
        OR OLD.status IS DISTINCT FROM NEW.status
    )
    EXECUTE FUNCTION sync_group_after_ride_update();

CREATE OR REPLACE FUNCTION leave_current_ride_group(p_anchor_ride_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_profile_id UUID;
    v_member_ride_id UUID;
    v_group_id UUID;
    v_name TEXT;
BEGIN
    SELECT id INTO v_profile_id
    FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1;

    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT rgm.ride_group_id, rgm.ride_id
    INTO v_group_id, v_member_ride_id
    FROM ride_group_members rgm
    JOIN rides r ON r.id = rgm.ride_id
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE r.user_id = v_profile_id
      AND rgm.left_at IS NULL
      AND rg.ride_id = p_anchor_ride_id
    ORDER BY rgm.joined_at ASC
    LIMIT 1;

    IF v_group_id IS NULL OR v_member_ride_id IS NULL THEN
        RAISE EXCEPTION 'You are not a participant in this group.';
    END IF;

    UPDATE ride_group_members
    SET left_at = NOW(),
        is_main = FALSE
    WHERE ride_group_id = v_group_id
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
        v_group_id,
        format('%s left the group.', COALESCE(v_name, 'Someone')),
        jsonb_build_object('type', 'member_left', 'ride_id', v_member_ride_id)
    );

    PERFORM recalculate_ride_group(v_group_id, 'leave');
    RETURN v_group_id;
END;
$$;

-- Backfill explicit memberships from existing groups.
INSERT INTO ride_group_members (ride_group_id, ride_id, is_main, joined_at)
SELECT rg.id, rg.ride_id, TRUE, rg.created_at
FROM ride_groups rg
WHERE NOT EXISTS (
    SELECT 1
    FROM ride_group_members rgm
    WHERE rgm.ride_group_id = rg.id
      AND rgm.ride_id = rg.ride_id
);

INSERT INTO ride_group_members (ride_group_id, ride_id, is_main, joined_at)
SELECT rg.id, rr.requester_ride_id, FALSE, COALESCE(rr.updated_at, rr.created_at)
FROM ride_groups rg
JOIN ride_requests rr
  ON rr.ride_id = rg.ride_id
 AND rr.status = 'accepted'
WHERE NOT EXISTS (
    SELECT 1
    FROM ride_group_members rgm
    WHERE rgm.ride_group_id = rg.id
      AND rgm.ride_id = rr.requester_ride_id
);

DO $$
DECLARE
    v_group RECORD;
BEGIN
    FOR v_group IN
        SELECT id
        FROM ride_groups
    LOOP
        PERFORM recalculate_ride_group(v_group.id, 'backfill');
    END LOOP;
END $$;

DROP POLICY IF EXISTS "ride_groups_select" ON ride_groups;
CREATE POLICY "ride_groups_select" ON ride_groups
    FOR SELECT USING (
        id IN (
            SELECT rgm.ride_group_id
            FROM ride_group_members rgm
            JOIN rides r ON r.id = rgm.ride_id
            WHERE rgm.left_at IS NULL
              AND r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "ride_groups_insert" ON ride_groups;
CREATE POLICY "ride_groups_insert" ON ride_groups
    FOR INSERT WITH CHECK (
        ride_id IN (
            SELECT id
            FROM rides
            WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages
    FOR SELECT USING (
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
                SELECT rgm.ride_group_id
                FROM ride_group_members rgm
                JOIN rides r ON r.id = rgm.ride_id
                WHERE rgm.left_at IS NULL
                  AND r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
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
                    SELECT rgm.ride_group_id
                    FROM ride_group_members rgm
                    JOIN rides r ON r.id = rgm.ride_id
                    WHERE rgm.left_at IS NULL
                      AND r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
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
                SELECT rgm.ride_group_id
                FROM ride_group_members rgm
                JOIN rides r ON r.id = rgm.ride_id
                WHERE rgm.left_at IS NULL
                  AND r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
            )
        )
    );

REVOKE EXECUTE ON FUNCTION leave_current_ride_group(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION leave_current_ride_group(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION append_group_system_message(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION recalculate_ride_group(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION upsert_group_member(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION validate_group_join_on_accept() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_group_after_accept() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_group_after_request_exit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_group_after_ride_update() FROM PUBLIC, anon, authenticated;
