-- =============================================
-- 038_local_ride_timezone.sql
-- Keep same-day matching in the local timezone of the posted ride.
-- Supabase sessions use UTC, which can otherwise split two evening rides
-- from the same local day across different UTC dates.
-- =============================================

SET search_path = public;

ALTER TABLE rides
    ADD COLUMN IF NOT EXISTS departure_timezone TEXT NOT NULL
    DEFAULT 'America/Los_Angeles';

COMMENT ON COLUMN rides.departure_timezone IS
    'IANA timezone used when interpreting the ride calendar date.';

-- Preserve the current matcher implementation as an internal function. The
-- public wrapper selects the ride timezone before any DATE casts run.
ALTER FUNCTION find_matches_v4(UUID, INTEGER)
    RENAME TO find_matches_v4_timezone_internal;

REVOKE ALL ON FUNCTION find_matches_v4_timezone_internal(UUID, INTEGER)
    FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION find_matches_v4(
    p_ride_id UUID,
    p_max_results INTEGER DEFAULT 10
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_timezone TEXT;
BEGIN
    SELECT tz.name
    INTO v_timezone
    FROM rides r
    JOIN pg_timezone_names tz
      ON tz.name = COALESCE(r.departure_timezone, 'UTC')
    WHERE r.id = p_ride_id
    LIMIT 1;

    PERFORM set_config('TimeZone', COALESCE(v_timezone, 'UTC'), TRUE);

    RETURN QUERY
    SELECT result.*
    FROM find_matches_v4_timezone_internal(p_ride_id, p_max_results) AS result;
END;
$$;

REVOKE ALL ON FUNCTION find_matches_v4(UUID, INTEGER)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION find_matches_v4(UUID, INTEGER)
    TO authenticated, service_role;

-- Acceptance must interpret the date exactly like discovery does.
ALTER FUNCTION ride_fits_group_core(
    UUID, TIMESTAMPTZ, TIMESTAMPTZ, DECIMAL, DECIMAL, INTEGER, UUID
)
    RENAME TO ride_fits_group_core_timezone_internal;

REVOKE ALL ON FUNCTION ride_fits_group_core_timezone_internal(
    UUID, TIMESTAMPTZ, TIMESTAMPTZ, DECIMAL, DECIMAL, INTEGER, UUID
) FROM PUBLIC, anon, authenticated;

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
    v_timezone TEXT;
BEGIN
    SELECT tz.name
    INTO v_timezone
    FROM rides r
    JOIN pg_timezone_names tz
      ON tz.name = COALESCE(r.departure_timezone, 'UTC')
    WHERE r.id = p_anchor_ride_id
    LIMIT 1;

    PERFORM set_config('TimeZone', COALESCE(v_timezone, 'UTC'), TRUE);

    RETURN ride_fits_group_core_timezone_internal(
        p_anchor_ride_id,
        p_interval_start,
        p_interval_end,
        p_origin_centroid_lat,
        p_origin_centroid_lng,
        p_total_seats,
        p_candidate_ride_id
    );
END;
$$;

REVOKE ALL ON FUNCTION ride_fits_group_core(
    UUID, TIMESTAMPTZ, TIMESTAMPTZ, DECIMAL, DECIMAL, INTEGER, UUID
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION ride_fits_group_core(
    UUID, TIMESTAMPTZ, TIMESTAMPTZ, DECIMAL, DECIMAL, INTEGER, UUID
) TO service_role;
