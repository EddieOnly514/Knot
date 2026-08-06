-- =============================================
-- 043_group_timezone_and_request_integrity.sql
-- Keep group recalculation in the ride's local timezone and enforce matching
-- safety rules again when requests are sent or accepted.
-- =============================================

SET search_path = public;

-- A rejected or withdrawn pair is eligible again after seven days. Enforce
-- the cooldown at the write boundary so direct API inserts cannot bypass it.
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

    IF EXISTS (
        SELECT 1
        FROM rides host
        JOIN rides requester ON requester.id = NEW.requester_ride_id
        JOIN blocked_users bu
          ON (
              bu.blocker_profile_id = host.user_id
              AND bu.blocked_profile_id = requester.user_id
          ) OR (
              bu.blocker_profile_id = requester.user_id
              AND bu.blocked_profile_id = host.user_id
          )
        WHERE host.id = NEW.ride_id
    ) THEN
        RAISE EXCEPTION 'ride_group_join_invalid: This request is not available.';
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

    IF EXISTS (
        SELECT 1
        FROM ride_requests rr
        WHERE rr.created_at > NOW() - INTERVAL '7 days'
          AND LEAST(rr.ride_id, rr.requester_ride_id)
              = LEAST(NEW.ride_id, NEW.requester_ride_id)
          AND GREATEST(rr.ride_id, rr.requester_ride_id)
              = GREATEST(NEW.ride_id, NEW.requester_ride_id)
    ) THEN
        RAISE EXCEPTION
            'ride_request_cooldown: This pair can match again seven days after the last request.';
    END IF;

    RETURN NEW;
END;
$$;

-- Migration 038 preserved the hard-filter implementation under this internal
-- name. Recheck date, expiry, and blocking at acceptance time because either
-- rider may have changed after the request was sent.
CREATE OR REPLACE FUNCTION ride_fits_group_core_timezone_internal(
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
       OR v_anchor.departure_latest < NOW()
       OR v_candidate.departure_latest < NOW()
       OR v_anchor.ride_type <> 'seeking'
       OR v_candidate.ride_type <> 'seeking' THEN
        RETURN FALSE;
    END IF;

    IF COALESCE(v_anchor.departure_preferred, v_anchor.departure_earliest)::DATE
       IS DISTINCT FROM
       COALESCE(v_candidate.departure_preferred, v_candidate.departure_earliest)::DATE THEN
        RETURN FALSE;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM blocked_users bu
        WHERE (
            bu.blocker_profile_id = v_anchor.user_id
            AND bu.blocked_profile_id = v_candidate.user_id
        ) OR (
            bu.blocker_profile_id = v_candidate.user_id
            AND bu.blocked_profile_id = v_anchor.user_id
        )
    ) THEN
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

    -- Extending both parties by two hours means their original windows may be
    -- at most four hours apart.
    RETURN v_gap_minutes <= 240;
END;
$$;

REVOKE ALL ON FUNCTION ride_fits_group_core_timezone_internal(
    UUID, TIMESTAMPTZ, TIMESTAMPTZ, DECIMAL, DECIMAL, INTEGER, UUID
) FROM PUBLIC, anon, authenticated;

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

        IF EXISTS (
            SELECT 1
            FROM rides candidate
            JOIN ride_group_members rgm
              ON rgm.ride_group_id = v_group_id
             AND rgm.left_at IS NULL
            JOIN rides member ON member.id = rgm.ride_id
            JOIN blocked_users bu
              ON (
                  bu.blocker_profile_id = member.user_id
                  AND bu.blocked_profile_id = candidate.user_id
              ) OR (
                  bu.blocker_profile_id = candidate.user_id
                  AND bu.blocked_profile_id = member.user_id
              )
            WHERE candidate.id = v_candidate_ride_id
        ) THEN
            RAISE EXCEPTION 'ride_group_join_invalid: This rider no longer fits the group.';
        END IF;
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

-- Recalculation can also run from leave/edit triggers that did not first call
-- the timezone-aware matcher. Wrap it so DATE casts always use the main ride's
-- local calendar day.
ALTER FUNCTION recalculate_ride_group(UUID, TEXT)
    RENAME TO recalculate_ride_group_timezone_internal;

REVOKE ALL ON FUNCTION recalculate_ride_group_timezone_internal(UUID, TEXT)
    FROM PUBLIC, anon, authenticated;

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
    v_timezone TEXT;
BEGIN
    SELECT tz.name
    INTO v_timezone
    FROM ride_groups rg
    JOIN rides r ON r.id = COALESCE(pick_main_ride_for_group(rg.id), rg.ride_id)
    JOIN pg_timezone_names tz
      ON tz.name = COALESCE(r.departure_timezone, 'UTC')
    WHERE rg.id = p_ride_group_id
    LIMIT 1;

    PERFORM set_config('TimeZone', COALESCE(v_timezone, 'UTC'), TRUE);
    PERFORM recalculate_ride_group_timezone_internal(p_ride_group_id, p_reason);

    -- When original windows do not overlap, store their shared two-hour-
    -- extended window rather than an invalid start-after-end interval.
    UPDATE ride_groups
    SET effective_departure_earliest = CASE
            WHEN effective_departure_earliest <= effective_departure_latest
                THEN effective_departure_earliest
            ELSE effective_departure_earliest - INTERVAL '2 hours'
        END,
        effective_departure_latest = CASE
            WHEN effective_departure_earliest <= effective_departure_latest
                THEN effective_departure_latest
            ELSE effective_departure_latest + INTERVAL '2 hours'
        END
    WHERE id = p_ride_group_id
      AND effective_departure_earliest IS NOT NULL
      AND effective_departure_latest IS NOT NULL;
END;
$$;

REVOKE ALL ON FUNCTION recalculate_ride_group(UUID, TEXT)
    FROM PUBLIC, anon, authenticated;

-- Ride timezone changes can change the local calendar date even if the UTC
-- timestamps stay the same, so they must trigger a full group recheck.
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
        OR OLD.departure_timezone IS DISTINCT FROM NEW.departure_timezone
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

DROP TRIGGER IF EXISTS rides_sync_group_after_update ON rides;
CREATE TRIGGER rides_sync_group_after_update
    AFTER UPDATE OF origin_lat, origin_lng, origin_name, dest_lat, dest_lng, dest_name,
                    departure_earliest, departure_latest, departure_preferred,
                    departure_timezone, seats_needed, space_capacity, status
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
        OR OLD.departure_timezone IS DISTINCT FROM NEW.departure_timezone
        OR OLD.seats_needed IS DISTINCT FROM NEW.seats_needed
        OR OLD.space_capacity IS DISTINCT FROM NEW.space_capacity
        OR OLD.status IS DISTINCT FROM NEW.status
    )
    EXECUTE FUNCTION sync_group_after_ride_update();

REVOKE ALL ON FUNCTION prepare_ride_request_insert()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION validate_group_join_on_accept()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION sync_group_after_ride_update()
    FROM PUBLIC, anon, authenticated;

-- Hide pending requests whose ride window has already passed. Existing
-- accepted/completed history remains available to its participants.
CREATE OR REPLACE FUNCTION get_ride_requests_enriched(p_profile_id UUID)
RETURNS TABLE (
    request_id UUID,
    request_status TEXT,
    ride_status TEXT,
    created_at TIMESTAMPTZ,
    ride_id UUID,
    my_ride_origin TEXT,
    my_ride_dest TEXT,
    requester_ride_id UUID,
    requester_name TEXT,
    requester_photo TEXT,
    requester_school TEXT,
    requester_rating DECIMAL,
    requester_origin TEXT,
    requester_dest TEXT,
    requester_departure TIMESTAMPTZ,
    requester_seats INTEGER,
    requester_profile_id UUID,
    direction TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    WITH authorized_profile AS (
        SELECT p.id
        FROM profiles p
        WHERE p.id = p_profile_id
          AND (
              p.user_id = auth.uid()
              OR auth.role() = 'service_role'
          )
    ),
    my_rides AS (
        SELECT r.id, r.origin_name, r.dest_name
        FROM rides r
        JOIN authorized_profile ap ON ap.id = r.user_id
    ),
    relevant_requests AS (
        SELECT
            rr.*,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN 'incoming' ELSE 'outgoing' END AS dir,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN rr.ride_id ELSE rr.requester_ride_id END AS my_ride_id,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN rr.requester_ride_id ELSE rr.ride_id END AS other_ride_id
        FROM ride_requests rr
        WHERE (
                rr.ride_id IN (SELECT id FROM my_rides)
                OR rr.requester_ride_id IN (SELECT id FROM my_rides)
              )
          AND (
              rr.status <> 'pending'
              OR EXISTS (
                  SELECT 1
                  FROM rides host
                  JOIN rides requester ON requester.id = rr.requester_ride_id
                  WHERE host.id = rr.ride_id
                    AND host.status = 'active'
                    AND requester.status = 'active'
                    AND host.departure_latest >= NOW()
                    AND requester.departure_latest >= NOW()
              )
          )
    )
    SELECT
        rr.id AS request_id,
        rr.status AS request_status,
        rr.ride_status,
        rr.created_at,
        rr.ride_id,
        mr.origin_name AS my_ride_origin,
        mr.dest_name AS my_ride_dest,
        rr.requester_ride_id,
        COALESCE(p.first_name || ' ' || LEFT(p.last_name, 1) || '.', 'Unknown') AS requester_name,
        p.photo_url AS requester_photo,
        p.school AS requester_school,
        COALESCE(p.rating, 0::DECIMAL) AS requester_rating,
        other_r.origin_name AS requester_origin,
        other_r.dest_name AS requester_dest,
        other_r.departure_preferred AS requester_departure,
        COALESCE(other_r.seats_needed, 1) AS requester_seats,
        other_r.user_id AS requester_profile_id,
        rr.dir AS direction
    FROM relevant_requests rr
    LEFT JOIN my_rides mr ON mr.id = rr.my_ride_id
    LEFT JOIN rides other_r ON other_r.id = rr.other_ride_id
    LEFT JOIN profiles p ON p.id = other_r.user_id
    ORDER BY rr.created_at DESC;
$$;

REVOKE ALL ON FUNCTION get_ride_requests_enriched(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_ride_requests_enriched(UUID)
    TO authenticated, service_role;

UPDATE ride_requests rr
SET status = 'withdrawn',
    updated_at = NOW()
FROM rides host, rides requester
WHERE rr.status = 'pending'
  AND host.id = rr.ride_id
  AND requester.id = rr.requester_ride_id
  AND (
      host.status <> 'active'
      OR requester.status <> 'active'
      OR host.departure_latest < NOW()
      OR requester.departure_latest < NOW()
  );

