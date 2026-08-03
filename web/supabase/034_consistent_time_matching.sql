-- =============================================
-- 034_consistent_time_matching.sql
-- Keep the database matcher, group join validation, and rematch guard aligned:
-- - seeker-only, active rides and groups
-- - time tiers come from overlap, not distance
-- - non-overlapping windows remain eligible up to a 240-minute gap
--   (equivalent to extending both parties' windows by two hours)
-- - groups are evaluated with their effective member intersection
-- - luggage and occupied-seat XL warnings include both joining parties
-- - rejected/withdrawn pairs may rematch after seven days
-- =============================================

SET search_path = public;

-- Knot no longer has driver/offerer roles. Normalize legacy rows and enforce a
-- single seeker model at the database boundary as well as in the frontend.
UPDATE rides
SET ride_type = 'seeking',
    updated_at = NOW()
WHERE ride_type IS DISTINCT FROM 'seeking';

ALTER TABLE rides
    DROP CONSTRAINT IF EXISTS rides_ride_type_check;
ALTER TABLE rides
    ADD CONSTRAINT rides_ride_type_check
    CHECK (ride_type = 'seeking');

-- A request can be withdrawn by its sender. Earlier schemas only allowed the
-- original pending/accepted/rejected states, which made the existing frontend
-- withdrawal action fail at runtime.
ALTER TABLE ride_requests
    DROP CONSTRAINT IF EXISTS ride_requests_status_check;
ALTER TABLE ride_requests
    ADD CONSTRAINT ride_requests_status_check
    CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'));

-- Stop the legacy directional exit trigger before normalizing duplicate pairs.
-- Explicit group-leave functions own membership changes now.
DROP TRIGGER IF EXISTS ride_requests_sync_group_after_exit ON ride_requests;

-- The original table constraint permanently blocked a second request for the
-- same directed pair. Only an active request should be unique; historical rows
-- remain available for the seven-day cooldown.
ALTER TABLE ride_requests
    DROP CONSTRAINT IF EXISTS ride_requests_ride_id_requester_ride_id_key;

-- The old directed constraint allowed simultaneous A -> B and B -> A rows.
-- Keep the oldest accepted request (or oldest pending request when neither was
-- accepted) and close only redundant active rows before adding the pair index.
WITH ranked_active_pairs AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY
                LEAST(ride_id, requester_ride_id),
                GREATEST(ride_id, requester_ride_id)
            ORDER BY
                CASE WHEN status = 'accepted' THEN 0 ELSE 1 END,
                created_at,
                id
        ) AS pair_rank
    FROM ride_requests
    WHERE status IN ('pending', 'accepted')
)
UPDATE ride_requests rr
SET status = 'rejected',
    ride_status = CASE
        WHEN rr.status = 'accepted' THEN 'cancelled'
        ELSE rr.ride_status
    END,
    updated_at = NOW()
FROM ranked_active_pairs ranked
WHERE rr.id = ranked.id
  AND ranked.pair_rank > 1;

DROP INDEX IF EXISTS ride_requests_active_pair_unique;
CREATE UNIQUE INDEX ride_requests_active_pair_unique
    ON ride_requests (
        LEAST(ride_id, requester_ride_id),
        GREATEST(ride_id, requester_ride_id)
    )
    WHERE status IN ('pending', 'accepted');

-- A pending request older than the cooldown should not keep the active-pair
-- index occupied forever. Expire it immediately before a fresh request is
-- inserted, and reject self-matches at the earliest boundary.
CREATE OR REPLACE FUNCTION prepare_ride_request_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
BEGIN
    IF NEW.ride_id = NEW.requester_ride_id THEN
        RAISE EXCEPTION 'ride_group_join_invalid: A ride cannot match with itself.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM rides host
        JOIN rides requester ON requester.id = NEW.requester_ride_id
        WHERE host.id = NEW.ride_id
          AND host.user_id = requester.user_id
    ) THEN
        RAISE EXCEPTION 'ride_group_join_invalid: Your own rides cannot match each other.';
    END IF;

    UPDATE ride_requests rr
    SET status = 'withdrawn',
        updated_at = NOW()
    WHERE rr.status = 'pending'
      AND rr.created_at <= NOW() - INTERVAL '7 days'
      AND LEAST(rr.ride_id, rr.requester_ride_id)
          = LEAST(NEW.ride_id, NEW.requester_ride_id)
      AND GREATEST(rr.ride_id, rr.requester_ride_id)
          = GREATEST(NEW.ride_id, NEW.requester_ride_id);

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_prepare_insert ON ride_requests;
CREATE TRIGGER ride_requests_prepare_insert
    BEFORE INSERT ON ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION prepare_ride_request_insert();

-- Only the receiving rider may accept/decline a pending request. The sender may
-- withdraw it, and either participant may leave an accepted match. This closes
-- the direct-table path that previously let a requester accept their own row.
CREATE OR REPLACE FUNCTION validate_ride_request_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_profile_id UUID;
    v_is_host BOOLEAN;
    v_is_requester BOOLEAN;
BEGIN
    IF NEW.ride_id IS DISTINCT FROM OLD.ride_id
       OR NEW.requester_ride_id IS DISTINCT FROM OLD.requester_ride_id THEN
        RAISE EXCEPTION 'ride_request_update_invalid: Ride participants cannot be changed.';
    END IF;

    IF NEW.status IS NOT DISTINCT FROM OLD.status
       OR auth.uid() IS NULL
       OR pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    SELECT id INTO v_profile_id
    FROM profiles
    WHERE user_id = auth.uid()
    LIMIT 1;

    SELECT
        EXISTS (
            SELECT 1 FROM rides
            WHERE id = OLD.ride_id AND user_id = v_profile_id
        ),
        EXISTS (
            SELECT 1 FROM rides
            WHERE id = OLD.requester_ride_id AND user_id = v_profile_id
        )
    INTO v_is_host, v_is_requester;

    IF OLD.status = 'pending'
       AND NEW.status IN ('accepted', 'rejected')
       AND v_is_host THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'pending'
       AND NEW.status = 'withdrawn'
       AND v_is_requester THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'accepted'
       AND NEW.status IN ('rejected', 'withdrawn')
       AND (v_is_host OR v_is_requester) THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'ride_request_update_invalid: This status change is not allowed.';
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_validate_status_transition ON ride_requests;
CREATE TRIGGER ride_requests_validate_status_transition
    BEFORE UPDATE ON ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION validate_ride_request_status_transition();

-- Archived chats must not permanently reserve a ride as their host. This lets
-- a rider leave an archived group and form a fresh group after the cooldown,
-- while still limiting a ride to one active hosted group at a time.
ALTER TABLE ride_groups
    DROP CONSTRAINT IF EXISTS ride_groups_ride_id_key;

DROP INDEX IF EXISTS ride_groups_active_ride_unique;
CREATE UNIQUE INDEX ride_groups_active_ride_unique
    ON ride_groups (ride_id)
    WHERE status = 'active';

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
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_anchor rides%ROWTYPE;
    v_candidate rides%ROWTYPE;
    v_overlap_minutes INTEGER;
    v_gap_minutes INTEGER;
BEGIN
    SELECT * INTO v_anchor FROM rides WHERE id = p_anchor_ride_id;
    SELECT * INTO v_candidate FROM rides WHERE id = p_candidate_ride_id;

    IF v_anchor IS NULL
       OR v_candidate IS NULL
       OR v_anchor.status <> 'active'
       OR v_candidate.status <> 'active'
       OR v_anchor.ride_type <> 'seeking'
       OR v_candidate.ride_type <> 'seeking' THEN
        RETURN FALSE;
    END IF;

    IF p_interval_start IS NULL
       OR p_interval_end IS NULL
       OR p_origin_centroid_lat IS NULL
       OR p_origin_centroid_lng IS NULL
       OR v_anchor.dest_lat IS NULL
       OR v_anchor.dest_lng IS NULL
       OR v_candidate.origin_lat IS NULL
       OR v_candidate.origin_lng IS NULL
       OR v_candidate.dest_lat IS NULL
       OR v_candidate.dest_lng IS NULL
       OR v_candidate.departure_earliest IS NULL
       OR v_candidate.departure_latest IS NULL THEN
        RETURN FALSE;
    END IF;

    IF haversine_miles(
        v_anchor.dest_lat,
        v_anchor.dest_lng,
        v_candidate.dest_lat,
        v_candidate.dest_lng
    ) > 2.0 THEN
        RETURN FALSE;
    END IF;

    IF haversine_miles(
        p_origin_centroid_lat,
        p_origin_centroid_lng,
        v_candidate.origin_lat,
        v_candidate.origin_lng
    ) > 2.0 THEN
        RETURN FALSE;
    END IF;

    IF COALESCE(p_total_seats, 0) + COALESCE(v_candidate.seats_needed, 1) > 6 THEN
        RETURN FALSE;
    END IF;

    v_overlap_minutes := FLOOR(GREATEST(
        0,
        EXTRACT(EPOCH FROM (
            LEAST(p_interval_end, v_candidate.departure_latest)
            - GREATEST(p_interval_start, v_candidate.departure_earliest)
        )) / 60.0
    ))::INTEGER;

    IF v_overlap_minutes > 0 THEN
        RETURN TRUE;
    END IF;

    v_gap_minutes := CEIL(GREATEST(
        0,
        EXTRACT(EPOCH FROM (
            GREATEST(p_interval_start, v_candidate.departure_earliest)
            - LEAST(p_interval_end, v_candidate.departure_latest)
        )) / 60.0
    ))::INTEGER;

    RETURN v_gap_minutes <= 240;
END;
$$;

-- Recalculate all living-group state from active memberships. The two-hour
-- extension is used only when the original member windows have no overlap, and
-- XL is based on people/seats rather than the number of account records.
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
    v_group_expiry TIMESTAMPTZ;
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
        COALESCE(r.seats_needed, 1),
        COALESCE(r.departure_preferred, r.departure_earliest)::DATE
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
        ORDER BY rgm.joined_at, rgm.ride_id
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
                v_total_seats + COALESCE(r.seats_needed, 1)
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
        COALESCE(BOOL_OR(r.space_capacity = 3), FALSE),
        MAX(r.departure_earliest),
        MIN(r.departure_latest),
        AVG(r.origin_lat),
        AVG(r.origin_lng),
        MAX(COALESCE(r.departure_preferred, r.departure_earliest))::DATE,
        COALESCE(SUM(r.seats_needed), 0)::INTEGER
    INTO
        v_rider_count,
        v_total_bags,
        v_has_oversized,
        v_interval_start,
        v_interval_end,
        v_origin_centroid_lat,
        v_origin_centroid_lng,
        v_effective_date,
        v_total_seats
    FROM ride_group_members rgm
    JOIN rides r ON r.id = rgm.ride_id
    WHERE rgm.ride_group_id = p_ride_group_id
      AND rgm.left_at IS NULL;

    v_match_label := CASE
        WHEN v_rider_count <= 1 THEN 'Open Ride'
        WHEN EXTRACT(EPOCH FROM (v_interval_end - v_interval_start)) / 60.0 >= 60 THEN 'Great Match'
        WHEN EXTRACT(EPOCH FROM (v_interval_end - v_interval_start)) / 60.0 >= 30 THEN 'Okay Match'
        ELSE 'Possible Match'
    END;

    -- When original windows do not overlap, their two-hour extensions remain
    -- eligible until the common extended window closes.
    v_group_expiry := CASE
        WHEN v_interval_start > v_interval_end
            THEN v_interval_end + INTERVAL '2 hours'
        ELSE v_interval_end
    END;

    UPDATE ride_groups
    SET ride_id = v_main_ride_id,
        status = CASE
            WHEN v_rider_count = 0 OR (v_group_expiry IS NOT NULL AND v_group_expiry < NOW())
                THEN 'archived'
            ELSE 'active'
        END,
        archived_at = CASE
            WHEN v_rider_count = 0 OR (v_group_expiry IS NOT NULL AND v_group_expiry < NOW())
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
            OR COALESCE(v_total_seats, 0) > 4
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
        OR COALESCE(v_total_seats, 0) > 4
    ) THEN
        IF COALESCE(v_total_bags, 0) >= 4
           OR COALESCE(v_has_oversized, FALSE)
           OR COALESCE(v_total_seats, 0) > 4 THEN
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
       AND (
           v_rider_count = 0
           OR (v_group_expiry IS NOT NULL AND v_group_expiry < NOW())
       ) THEN
        PERFORM append_group_system_message(
            p_ride_group_id,
            'This ride group was archived.',
            jsonb_build_object('type', 'group_archived', 'reason', p_reason)
        );
    END IF;
END;
$$;

-- Serialize accepts through the rides shared by competing requests, then count
-- the existing group on either side of the request. This prevents two accepts
-- from concurrently overfilling a group and supports group-to-solo requests in
-- either direction.
CREATE OR REPLACE FUNCTION check_ride_match_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_host_group_id UUID;
    v_requester_group_id UUID;
    v_existing_seats INTEGER;
    v_joining_seats INTEGER;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    IF NEW.ride_id = NEW.requester_ride_id THEN
        RAISE EXCEPTION 'ride_group_join_invalid: A ride cannot match with itself.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM rides host
        JOIN rides requester ON requester.id = NEW.requester_ride_id
        WHERE host.id = NEW.ride_id
          AND host.user_id = requester.user_id
    ) THEN
        RAISE EXCEPTION 'ride_group_join_invalid: Your own rides cannot match each other.';
    END IF;

    PERFORM 1
    FROM rides
    WHERE id IN (NEW.ride_id, NEW.requester_ride_id)
    ORDER BY id
    FOR UPDATE;

    SELECT rgm.ride_group_id INTO v_host_group_id
    FROM ride_group_members rgm
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE rgm.ride_id = NEW.ride_id
      AND rgm.left_at IS NULL
      AND rg.status = 'active'
    LIMIT 1;

    SELECT rgm.ride_group_id INTO v_requester_group_id
    FROM ride_group_members rgm
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE rgm.ride_id = NEW.requester_ride_id
      AND rgm.left_at IS NULL
      AND rg.status = 'active'
    LIMIT 1;

    IF v_host_group_id IS NOT NULL
       AND v_requester_group_id IS NOT NULL
       AND v_host_group_id <> v_requester_group_id THEN
        RAISE EXCEPTION 'ride_group_merge_not_supported: Two existing groups cannot be merged.';
    END IF;

    IF v_host_group_id IS NOT NULL THEN
        SELECT COALESCE(SUM(r.seats_needed), 0)::INTEGER
        INTO v_existing_seats
        FROM ride_group_members rgm
        JOIN rides r ON r.id = rgm.ride_id
        WHERE rgm.ride_group_id = v_host_group_id
          AND rgm.left_at IS NULL;

        v_joining_seats := CASE
            WHEN v_requester_group_id = v_host_group_id THEN 0
            ELSE COALESCE((SELECT seats_needed FROM rides WHERE id = NEW.requester_ride_id), 1)
        END;
    ELSIF v_requester_group_id IS NOT NULL THEN
        SELECT COALESCE(SUM(r.seats_needed), 0)::INTEGER
        INTO v_existing_seats
        FROM ride_group_members rgm
        JOIN rides r ON r.id = rgm.ride_id
        WHERE rgm.ride_group_id = v_requester_group_id
          AND rgm.left_at IS NULL;

        v_joining_seats := COALESCE((SELECT seats_needed FROM rides WHERE id = NEW.ride_id), 1);
    ELSE
        v_existing_seats := COALESCE((SELECT seats_needed FROM rides WHERE id = NEW.ride_id), 1);
        v_joining_seats := COALESCE((SELECT seats_needed FROM rides WHERE id = NEW.requester_ride_id), 1);
    END IF;

    IF v_existing_seats + v_joining_seats > 6 THEN
        RAISE EXCEPTION
            'ride_match_cap_exceeded: Group is full. Max 6 people per ride group (current: %, adding: %).',
            v_existing_seats,
            v_joining_seats;
    END IF;

    RETURN NEW;
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
    v_host_group_id UUID;
    v_requester_group_id UUID;
    v_group_id UUID;
    v_anchor_ride_id UUID;
    v_candidate_ride_id UUID;
    v_interval_start TIMESTAMPTZ;
    v_interval_end TIMESTAMPTZ;
    v_origin_centroid_lat DECIMAL;
    v_origin_centroid_lng DECIMAL;
    v_total_seats INTEGER;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    SELECT rgm.ride_group_id INTO v_host_group_id
    FROM ride_group_members rgm
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE rgm.ride_id = NEW.ride_id
      AND rgm.left_at IS NULL
      AND rg.status = 'active'
    LIMIT 1;

    SELECT rgm.ride_group_id INTO v_requester_group_id
    FROM ride_group_members rgm
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE rgm.ride_id = NEW.requester_ride_id
      AND rgm.left_at IS NULL
      AND rg.status = 'active'
    LIMIT 1;

    IF v_host_group_id IS NOT NULL
       AND v_requester_group_id IS NOT NULL
       AND v_host_group_id <> v_requester_group_id THEN
        RAISE EXCEPTION 'ride_group_merge_not_supported: Two existing groups cannot be merged.';
    END IF;

    IF v_host_group_id IS NOT NULL AND v_requester_group_id = v_host_group_id THEN
        RETURN NEW;
    ELSIF v_host_group_id IS NOT NULL THEN
        v_group_id := v_host_group_id;
        v_candidate_ride_id := NEW.requester_ride_id;
    ELSIF v_requester_group_id IS NOT NULL THEN
        v_group_id := v_requester_group_id;
        v_candidate_ride_id := NEW.ride_id;
    ELSE
        v_anchor_ride_id := NEW.ride_id;
        v_candidate_ride_id := NEW.requester_ride_id;

        SELECT
            r.departure_earliest,
            r.departure_latest,
            r.origin_lat,
            r.origin_lng,
            COALESCE(r.seats_needed, 1)
        INTO
            v_interval_start,
            v_interval_end,
            v_origin_centroid_lat,
            v_origin_centroid_lng,
            v_total_seats
        FROM rides r
        WHERE r.id = v_anchor_ride_id;
    END IF;

    IF v_group_id IS NOT NULL THEN
        SELECT rg.ride_id
        INTO v_anchor_ride_id
        FROM ride_groups rg
        WHERE rg.id = v_group_id
        FOR UPDATE;

        SELECT
            MAX(r.departure_earliest),
            MIN(r.departure_latest),
            AVG(r.origin_lat),
            AVG(r.origin_lng),
            COALESCE(SUM(r.seats_needed), 0)::INTEGER
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
    END IF;

    IF NOT ride_fits_group_core(
        v_anchor_ride_id,
        v_interval_start,
        v_interval_end,
        v_origin_centroid_lat,
        v_origin_centroid_lng,
        v_total_seats,
        v_candidate_ride_id
    ) THEN
        RAISE EXCEPTION 'ride_group_join_invalid: This rider no longer fits the group.';
    END IF;

    RETURN NEW;
END;
$$;

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
    v_joining_ride_id UUID;
    v_new_joiner_name TEXT;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    SELECT rgm.ride_group_id INTO v_host_group_id
    FROM ride_group_members rgm
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE rgm.ride_id = NEW.ride_id
      AND rgm.left_at IS NULL
      AND rg.status = 'active'
    LIMIT 1;

    SELECT rgm.ride_group_id INTO v_requester_group_id
    FROM ride_group_members rgm
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE rgm.ride_id = NEW.requester_ride_id
      AND rgm.left_at IS NULL
      AND rg.status = 'active'
    LIMIT 1;

    IF v_host_group_id IS NOT NULL
       AND v_requester_group_id IS NOT NULL
       AND v_host_group_id <> v_requester_group_id THEN
        RAISE EXCEPTION 'ride_group_merge_not_supported: Two existing groups cannot be merged.';
    END IF;

    IF v_host_group_id IS NULL AND v_requester_group_id IS NULL THEN
        INSERT INTO ride_groups (ride_id, status, archived_at, updated_at)
        VALUES (NEW.ride_id, 'active', NULL, NOW())
        RETURNING id INTO v_group_id;

        PERFORM upsert_group_member(v_group_id, NEW.ride_id, TRUE);
        PERFORM upsert_group_member(v_group_id, NEW.requester_ride_id, FALSE);
        v_joining_ride_id := NEW.requester_ride_id;
    ELSIF v_host_group_id IS NOT NULL AND v_requester_group_id IS NULL THEN
        v_group_id := v_host_group_id;
        v_joining_ride_id := NEW.requester_ride_id;
        PERFORM upsert_group_member(v_group_id, v_joining_ride_id, FALSE);
    ELSIF v_requester_group_id IS NOT NULL AND v_host_group_id IS NULL THEN
        v_group_id := v_requester_group_id;
        v_joining_ride_id := NEW.ride_id;
        PERFORM upsert_group_member(v_group_id, v_joining_ride_id, FALSE);
    ELSE
        v_group_id := v_host_group_id;
    END IF;

    UPDATE ride_groups
    SET status = 'active', archived_at = NULL, updated_at = NOW()
    WHERE id = v_group_id;

    UPDATE messages
    SET conversation_id = NULL,
        ride_group_id = v_group_id
    WHERE conversation_id = NEW.id
      AND ride_group_id IS NULL;

    PERFORM recalculate_ride_group(v_group_id, 'join');

    IF v_joining_ride_id IS NOT NULL THEN
        SELECT ride_display_name(v_joining_ride_id) INTO v_new_joiner_name;

        PERFORM append_group_system_message(
            v_group_id,
            format('%s joined the group.', COALESCE(v_new_joiner_name, 'Someone')),
            jsonb_build_object('type', 'member_joined', 'ride_id', v_joining_ride_id)
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Re-evaluate the rider who changed rather than always privileging the current
-- main rider. If the main rider changes a hard-filter field, temporarily anchor
-- the group on another member so only the incompatible editor is removed.
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
    v_was_main BOOLEAN;
    v_replacement_ride_id UUID;
    v_name TEXT;
    v_hard_filter_changed BOOLEAN;
BEGIN
    SELECT rgm.ride_group_id, rg.status, rgm.is_main
    INTO v_group_id, v_group_status, v_was_main
    FROM ride_group_members rgm
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE rgm.ride_id = NEW.id
      AND rgm.left_at IS NULL
    LIMIT 1;

    IF v_group_id IS NULL THEN
        RETURN NEW;
    END IF;

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

    v_hard_filter_changed := (
        OLD.origin_lat IS DISTINCT FROM NEW.origin_lat
        OR OLD.origin_lng IS DISTINCT FROM NEW.origin_lng
        OR OLD.dest_lat IS DISTINCT FROM NEW.dest_lat
        OR OLD.dest_lng IS DISTINCT FROM NEW.dest_lng
        OR OLD.departure_earliest IS DISTINCT FROM NEW.departure_earliest
        OR OLD.departure_latest IS DISTINCT FROM NEW.departure_latest
        OR OLD.seats_needed IS DISTINCT FROM NEW.seats_needed
    );

    IF v_was_main AND v_hard_filter_changed THEN
        SELECT rgm.ride_id
        INTO v_replacement_ride_id
        FROM ride_group_members rgm
        WHERE rgm.ride_group_id = v_group_id
          AND rgm.left_at IS NULL
          AND rgm.ride_id <> NEW.id
        ORDER BY rgm.joined_at, rgm.ride_id
        LIMIT 1;

        IF v_replacement_ride_id IS NOT NULL THEN
            UPDATE ride_group_members
            SET is_main = FALSE
            WHERE ride_group_id = v_group_id
              AND is_main = TRUE;

            UPDATE ride_group_members
            SET is_main = TRUE
            WHERE ride_group_id = v_group_id
              AND ride_id = v_replacement_ride_id
              AND left_at IS NULL;
        END IF;
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

CREATE OR REPLACE FUNCTION find_matches_v3(
    p_ride_id UUID,
    p_max_results INTEGER DEFAULT 10,
    p_min_score INTEGER DEFAULT 0
)
RETURNS TABLE (
    candidate_id UUID,
    candidate_type TEXT,
    request_target_ride_id UUID,
    ride_group_id UUID,
    ride_id UUID,
    user_id UUID,
    ride_type TEXT,
    origin_name TEXT,
    dest_name TEXT,
    departure_earliest TIMESTAMPTZ,
    departure_latest TIMESTAMPTZ,
    departure_preferred TIMESTAMPTZ,
    seats_needed INTEGER,
    space_capacity INTEGER,
    gender_pref TEXT,
    quiet_ride BOOLEAN,
    music_ok BOOLEAN,
    notes TEXT,
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    bio TEXT,
    school TEXT,
    time_tier TEXT,
    overlap_minutes INTEGER,
    gap_minutes INTEGER,
    d_origin_miles DECIMAL,
    d_origin_tier TEXT,
    d_destination_miles DECIMAL,
    d_destination_tier TEXT,
    needs_xl BOOLEAN,
    xl_flag_message TEXT,
    seats_remaining_after_join INTEGER,
    fill_efficiency DECIMAL,
    gender_compatible BOOLEAN,
    pref_overall DECIMAL,
    group_size_before_join INTEGER,
    group_size_after_join INTEGER,
    members JSONB,
    match_label TEXT,
    match_explanation TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    WITH my_ride AS (
        SELECT
            r.*,
            p.conversation_pref AS profile_conversation_pref
        FROM rides r
        JOIN profiles p ON p.id = r.user_id
        WHERE r.id = p_ride_id
          AND r.ride_type = 'seeking'
          AND r.status = 'active'
    ),
    my_membership AS (
        SELECT rgm.ride_group_id, rg.ride_id AS host_ride_id
        FROM ride_group_members rgm
        JOIN ride_groups rg ON rg.id = rgm.ride_group_id
        WHERE rgm.ride_id = p_ride_id
          AND rgm.left_at IS NULL
          AND rg.status = 'active'
        LIMIT 1
    ),
    my_member_rides AS (
        SELECT r.*
        FROM rides r
        WHERE r.id = p_ride_id
          AND NOT EXISTS (SELECT 1 FROM my_membership)

        UNION ALL

        SELECT r.*
        FROM my_membership mm
        JOIN ride_group_members rgm ON rgm.ride_group_id = mm.ride_group_id
        JOIN rides r ON r.id = rgm.ride_id
        WHERE rgm.left_at IS NULL
          AND r.status = 'active'
    ),
    my_stats AS (
        SELECT
            MAX(r.departure_earliest) AS interval_start,
            MIN(r.departure_latest) AS interval_end,
            AVG(r.origin_lat) AS origin_lat,
            AVG(r.origin_lng) AS origin_lng,
            COALESCE(SUM(r.seats_needed), 0)::INTEGER AS total_seats,
            COUNT(*)::INTEGER AS rider_count,
            COALESCE(SUM(luggage_units_from_space_capacity(r.space_capacity)), 0)::INTEGER AS total_bags,
            COALESCE(BOOL_OR(r.space_capacity = 3), FALSE) AS has_oversized
        FROM my_member_rides r
    ),
    candidate_roots AS (
        SELECT r.id AS host_ride_id, NULL::UUID AS group_id
        FROM rides r
        WHERE r.ride_type = 'seeking'
          AND r.status = 'active'
          AND NOT EXISTS (
              SELECT 1
              FROM ride_group_members rgm
              JOIN ride_groups rg ON rg.id = rgm.ride_group_id
              WHERE rgm.ride_id = r.id
                AND rgm.left_at IS NULL
                AND rg.status = 'active'
          )

        UNION ALL

        SELECT rg.ride_id AS host_ride_id, rg.id AS group_id
        FROM ride_groups rg
        JOIN rides host ON host.id = rg.ride_id
        WHERE rg.status = 'active'
          AND host.ride_type = 'seeking'
          AND host.status = 'active'
    ),
    candidate_members AS (
        SELECT
            cr.host_ride_id,
            cr.group_id,
            r.*,
            p.first_name,
            p.last_name,
            p.photo_url,
            p.school,
            p.conversation_pref
        FROM candidate_roots cr
        JOIN rides r ON r.id = cr.host_ride_id
        JOIN profiles p ON p.id = r.user_id
        WHERE cr.group_id IS NULL

        UNION ALL

        SELECT
            cr.host_ride_id,
            cr.group_id,
            r.*,
            p.first_name,
            p.last_name,
            p.photo_url,
            p.school,
            p.conversation_pref
        FROM candidate_roots cr
        JOIN ride_group_members rgm ON rgm.ride_group_id = cr.group_id
        JOIN rides r ON r.id = rgm.ride_id
        JOIN profiles p ON p.id = r.user_id
        WHERE cr.group_id IS NOT NULL
          AND rgm.left_at IS NULL
          AND r.status = 'active'
    ),
    candidate_stats AS (
        SELECT
            cm.host_ride_id,
            cm.group_id,
            MAX(cm.departure_earliest) AS interval_start,
            MIN(cm.departure_latest) AS interval_end,
            AVG(cm.origin_lat) AS origin_lat,
            AVG(cm.origin_lng) AS origin_lng,
            COALESCE(SUM(cm.seats_needed), 0)::INTEGER AS total_seats,
            COUNT(*)::INTEGER AS rider_count,
            COALESCE(SUM(luggage_units_from_space_capacity(cm.space_capacity)), 0)::INTEGER AS total_bags,
            COALESCE(BOOL_OR(cm.space_capacity = 3), FALSE) AS has_oversized,
            JSONB_AGG(
                JSONB_BUILD_OBJECT(
                    'ride_id', cm.id,
                    'user_id', cm.user_id,
                    'first_name', cm.first_name,
                    'last_name', cm.last_name,
                    'photo_url', cm.photo_url,
                    'school', cm.school,
                    'origin_name', cm.origin_name,
                    'dest_name', cm.dest_name,
                    'departure_earliest', cm.departure_earliest,
                    'departure_latest', cm.departure_latest,
                    'departure_preferred', cm.departure_preferred,
                    'seats_needed', cm.seats_needed,
                    'space_capacity', cm.space_capacity,
                    'gender_pref', cm.gender_pref,
                    'quiet_ride', cm.quiet_ride,
                    'music_ok', cm.music_ok
                )
                ORDER BY cm.departure_preferred NULLS LAST, cm.departure_earliest
            ) AS members
        FROM candidate_members cm
        GROUP BY cm.host_ride_id, cm.group_id
    ),
    candidate_hosts AS (
        SELECT
            cr.host_ride_id,
            cr.group_id,
            h.*,
            hp.first_name,
            hp.last_name,
            hp.photo_url,
            hp.bio,
            hp.school,
            hp.conversation_pref
        FROM candidate_roots cr
        JOIN rides h ON h.id = cr.host_ride_id
        JOIN profiles hp ON hp.id = h.user_id
    ),
    measured AS (
        SELECT
            ch.*,
            cs.interval_start AS group_interval_start,
            cs.interval_end AS group_interval_end,
            cs.origin_lat AS group_origin_lat,
            cs.origin_lng AS group_origin_lng,
            cs.total_seats AS group_total_seats,
            cs.rider_count AS group_rider_count,
            cs.total_bags AS group_total_bags,
            cs.has_oversized AS group_has_oversized,
            cs.members AS group_members,
            ms.interval_start AS my_interval_start,
            ms.interval_end AS my_interval_end,
            ms.total_seats AS my_total_seats,
            ms.rider_count AS my_rider_count,
            ms.total_bags AS my_total_bags,
            ms.has_oversized AS my_has_oversized,
            haversine_miles(ms.origin_lat, ms.origin_lng, cs.origin_lat, cs.origin_lng) AS origin_distance,
            haversine_miles(mr.dest_lat, mr.dest_lng, ch.dest_lat, ch.dest_lng) AS destination_distance,
            FLOOR(GREATEST(
                0,
                EXTRACT(EPOCH FROM (
                    LEAST(ms.interval_end, cs.interval_end)
                    - GREATEST(ms.interval_start, cs.interval_start)
                )) / 60.0
            ))::INTEGER AS overlap_minutes_calc,
            CASE
                WHEN LEAST(ms.interval_end, cs.interval_end)
                     > GREATEST(ms.interval_start, cs.interval_start) THEN 0
                ELSE CEIL(GREATEST(
                    0,
                    EXTRACT(EPOCH FROM (
                        GREATEST(ms.interval_start, cs.interval_start)
                        - LEAST(ms.interval_end, cs.interval_end)
                    )) / 60.0
                ))::INTEGER
            END AS gap_minutes_calc,
            COALESCE((
                SELECT AVG(
                    CASE WHEN cm.music_ok = mr.music_ok THEN 1.0 ELSE 0.5 END
                )
                FROM candidate_members cm
                WHERE cm.host_ride_id = ch.host_ride_id
                  AND cm.group_id IS NOT DISTINCT FROM ch.group_id
            ), 0.5)::DECIMAL AS music_ratio,
            COALESCE((
                SELECT AVG(
                    CASE
                        WHEN cm.conversation_pref IS NULL OR cm.conversation_pref = 'either' THEN 1.0
                        WHEN mr.profile_conversation_pref IS NULL OR mr.profile_conversation_pref = 'either' THEN 1.0
                        WHEN cm.conversation_pref = mr.profile_conversation_pref THEN 1.0
                        ELSE 0.0
                    END
                )
                FROM candidate_members cm
                WHERE cm.host_ride_id = ch.host_ride_id
                  AND cm.group_id IS NOT DISTINCT FROM ch.group_id
            ), 0.5)::DECIMAL AS vibe_ratio,
            COALESCE((
                SELECT BOOL_AND(
                    cm.gender_pref = 'any'
                    OR mr.gender_pref = 'any'
                    OR cm.gender_pref = mr.gender_pref
                )
                FROM candidate_members cm
                WHERE cm.host_ride_id = ch.host_ride_id
                  AND cm.group_id IS NOT DISTINCT FROM ch.group_id
            ), TRUE) AS gender_ok
        FROM candidate_hosts ch
        JOIN candidate_stats cs
          ON cs.host_ride_id = ch.host_ride_id
         AND cs.group_id IS NOT DISTINCT FROM ch.group_id
        CROSS JOIN my_ride mr
        CROSS JOIN my_stats ms
        WHERE ch.host_ride_id <> COALESCE(
                  (SELECT host_ride_id FROM my_membership),
                  p_ride_id
              )
          AND ch.user_id <> mr.user_id
          AND (ms.rider_count = 1 OR ch.group_id IS NULL)
          AND NOT EXISTS (
              SELECT 1
              FROM candidate_members cm
              WHERE cm.host_ride_id = ch.host_ride_id
                AND cm.group_id IS NOT DISTINCT FROM ch.group_id
                AND cm.user_id = mr.user_id
          )
          AND cs.total_seats + ms.total_seats <= 6
          AND haversine_miles(ms.origin_lat, ms.origin_lng, cs.origin_lat, cs.origin_lng) <= 2.0
          AND haversine_miles(mr.dest_lat, mr.dest_lng, ch.dest_lat, ch.dest_lng) <= 2.0
          AND NOT EXISTS (
              SELECT 1
              FROM ride_requests rr
              WHERE rr.created_at > NOW() - INTERVAL '7 days'
                AND (
                    (
                        rr.ride_id IN (SELECT id FROM my_member_rides)
                        AND rr.requester_ride_id IN (
                            SELECT cm.id
                            FROM candidate_members cm
                            WHERE cm.host_ride_id = ch.host_ride_id
                              AND cm.group_id IS NOT DISTINCT FROM ch.group_id
                        )
                    )
                    OR
                    (
                        rr.requester_ride_id IN (SELECT id FROM my_member_rides)
                        AND rr.ride_id IN (
                            SELECT cm.id
                            FROM candidate_members cm
                            WHERE cm.host_ride_id = ch.host_ride_id
                              AND cm.group_id IS NOT DISTINCT FROM ch.group_id
                        )
                    )
                )
          )
    ),
    tiered AS (
        SELECT
            m.*,
            CASE
                WHEN m.overlap_minutes_calc >= 60 THEN 'STRONG'
                WHEN m.overlap_minutes_calc >= 30 THEN 'OKAY'
                WHEN m.overlap_minutes_calc >= 1 THEN 'WEAK'
                WHEN m.gap_minutes_calc <= 60 THEN 'BORDERLINE'
                WHEN m.gap_minutes_calc <= 240 THEN 'LAST_RESORT'
                ELSE NULL
            END AS computed_time_tier,
            CASE
                WHEN m.origin_distance <= 0.5 THEN 'CLOSE'
                WHEN m.origin_distance <= 1.0 THEN 'NEAR'
                ELSE 'OKAY'
            END AS computed_origin_tier,
            CASE
                WHEN m.destination_distance <= 0.5 THEN 'SAME_AREA'
                WHEN m.destination_distance <= 1.0 THEN 'VERY_CLOSE'
                ELSE 'NEARBY'
            END AS computed_destination_tier,
            (
                m.my_total_bags + m.group_total_bags >= 4
                OR m.my_has_oversized
                OR m.group_has_oversized
                OR m.my_total_seats + m.group_total_seats > 4
            ) AS computed_needs_xl,
            ROUND(((m.music_ratio + m.vibe_ratio) / 2.0)::NUMERIC, 3)::DECIMAL AS computed_pref_overall
        FROM measured m
        WHERE m.overlap_minutes_calc > 0 OR m.gap_minutes_calc <= 240
    ),
    visible AS (
        SELECT t.*
        FROM tiered t
        WHERE t.computed_time_tier IS NOT NULL
          AND (
              t.computed_time_tier <> 'LAST_RESORT'
              OR NOT EXISTS (
                  SELECT 1
                  FROM tiered better
                  WHERE better.computed_time_tier IS NOT NULL
                    AND better.computed_time_tier <> 'LAST_RESORT'
              )
          )
    )
    SELECT
        COALESCE(v.group_id, v.host_ride_id) AS candidate_id,
        CASE WHEN v.group_rider_count > 1 THEN 'group' ELSE 'solo' END AS candidate_type,
        v.host_ride_id AS request_target_ride_id,
        v.group_id AS ride_group_id,
        v.id AS ride_id,
        v.user_id,
        v.ride_type,
        v.origin_name,
        v.dest_name,
        v.group_interval_start AS departure_earliest,
        v.group_interval_end AS departure_latest,
        v.departure_preferred,
        v.seats_needed,
        v.space_capacity,
        v.gender_pref,
        v.quiet_ride,
        v.music_ok,
        v.notes,
        v.first_name,
        v.last_name,
        v.photo_url,
        v.bio,
        v.school,
        v.computed_time_tier AS time_tier,
        v.overlap_minutes_calc AS overlap_minutes,
        v.gap_minutes_calc AS gap_minutes,
        ROUND(v.origin_distance::NUMERIC, 2)::DECIMAL AS d_origin_miles,
        v.computed_origin_tier AS d_origin_tier,
        ROUND(v.destination_distance::NUMERIC, 2)::DECIMAL AS d_destination_miles,
        v.computed_destination_tier AS d_destination_tier,
        v.computed_needs_xl AS needs_xl,
        CASE WHEN v.computed_needs_xl THEN 'This group may need Uber XL' ELSE NULL END AS xl_flag_message,
        GREATEST(0, 6 - (v.group_total_seats + v.my_total_seats)) AS seats_remaining_after_join,
        CASE
            WHEN 6 - v.group_total_seats <= 0 THEN 1.0::DECIMAL
            ELSE ROUND(
                v.my_total_seats::DECIMAL / GREATEST(6 - v.group_total_seats, 1),
                3
            )
        END AS fill_efficiency,
        v.gender_ok AS gender_compatible,
        v.computed_pref_overall AS pref_overall,
        v.group_rider_count AS group_size_before_join,
        v.group_rider_count + v.my_rider_count AS group_size_after_join,
        v.group_members AS members,
        CASE v.computed_time_tier
            WHEN 'STRONG' THEN 'Great Match'
            WHEN 'OKAY' THEN 'Okay Match'
            WHEN 'WEAK' THEN 'Possible Match'
            WHEN 'BORDERLINE' THEN 'Possible Match'
            ELSE 'Low Match'
        END AS match_label,
        CASE v.computed_time_tier
            WHEN 'STRONG' THEN 'Strong time compatibility.'
            WHEN 'OKAY' THEN 'Good time compatibility.'
            WHEN 'WEAK' THEN 'Some time compatibility.'
            WHEN 'BORDERLINE' THEN 'Nearby departure windows.'
            ELSE 'Extended departure window match.'
        END AS match_explanation
    FROM visible v
    ORDER BY
        CASE v.computed_time_tier
            WHEN 'STRONG' THEN 1
            WHEN 'OKAY' THEN 2
            WHEN 'WEAK' THEN 3
            WHEN 'BORDERLINE' THEN 4
            ELSE 5
        END,
        GREATEST(
            CASE v.computed_origin_tier WHEN 'CLOSE' THEN 1 WHEN 'NEAR' THEN 2 ELSE 3 END,
            CASE v.computed_destination_tier WHEN 'SAME_AREA' THEN 1 WHEN 'VERY_CLOSE' THEN 2 ELSE 3 END
        ),
        CASE WHEN v.gender_ok THEN 0 ELSE 1 END,
        v.computed_pref_overall DESC,
        v.destination_distance,
        v.origin_distance
    LIMIT GREATEST(COALESCE(p_max_results, 10), 0);
$$;

-- Group creation is owned by the accepted-request trigger. Allowing clients to
-- insert empty groups directly can reserve a ride and block legitimate joins.
DROP POLICY IF EXISTS "ride_groups_insert" ON ride_groups;

DROP POLICY IF EXISTS "ride_requests_insert" ON ride_requests;
CREATE POLICY "ride_requests_insert" ON ride_requests
    FOR INSERT WITH CHECK (
        status = 'pending'
        AND requester_ride_id IN (
            SELECT id
            FROM rides
            WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );

-- Participants may write ordinary chat messages, but only trusted backend
-- functions may create system events.
DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages
    FOR INSERT WITH CHECK (
        sender_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        AND COALESCE(message_type, 'text') <> 'system'
        AND (
            (
                ride_group_id IS NULL
                AND conversation_id IN (
                    SELECT rr.id
                    FROM ride_requests rr
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

-- Read receipts are the only client-side message mutation. Keep message text,
-- authorship, type, metadata, and chat ownership immutable after insertion.
CREATE OR REPLACE FUNCTION protect_message_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
       OR NEW.ride_group_id IS DISTINCT FROM OLD.ride_group_id
       OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
       OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.message_type IS DISTINCT FROM OLD.message_type
       OR NEW.metadata IS DISTINCT FROM OLD.metadata
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'message_update_invalid: Only read receipts can be changed.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS messages_protect_on_update ON messages;
CREATE TRIGGER messages_protect_on_update
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION protect_message_on_update();

-- Internal security-definer helpers should only be reachable through their
-- triggers or the authenticated leave/match APIs, not as public RPC methods.
REVOKE EXECUTE ON FUNCTION prepare_ride_request_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION validate_ride_request_status_transition() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION ride_fits_group_core(UUID, TIMESTAMPTZ, TIMESTAMPTZ, DECIMAL, DECIMAL, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION recalculate_ride_group(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION check_ride_match_cap() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION validate_group_join_on_accept() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_group_after_accept() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_group_after_request_exit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION sync_group_after_ride_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION upsert_group_member(UUID, UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION append_group_system_message(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION protect_message_on_update() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION find_matches_v3(UUID, INTEGER, INTEGER) TO authenticated;
