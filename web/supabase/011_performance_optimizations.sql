-- =============================================
-- 011_performance_optimizations.sql
-- Performance optimizations for find_matches_v3
-- Based on query performance analysis
-- =============================================

-- =============================================
-- 1. ADDITIONAL INDEXES FOR COMMON QUERY PATTERNS
-- =============================================

-- Composite index for status + ride_type + time window filtering
-- This helps with the WHERE clause filtering in find_matches_v3
CREATE INDEX IF NOT EXISTS idx_rides_status_type_time 
    ON rides(status, ride_type, departure_earliest, departure_latest)
    WHERE status = 'active';

-- Index for user_id lookups (already exists but ensuring it's optimal)
-- The existing idx_rides_user covers this, but let's add a covering index
-- for common SELECT patterns
CREATE INDEX IF NOT EXISTS idx_rides_user_status_type
    ON rides(user_id, status, ride_type);

-- Index on profiles for join optimization
CREATE INDEX IF NOT EXISTS idx_profiles_id_verified
    ON profiles(id, id_verified)
    WHERE id_verified = true;

-- Index for verified_only filtering
CREATE INDEX IF NOT EXISTS idx_rides_verified_only
    ON rides(verified_only, status)
    WHERE status = 'active' AND verified_only = true;

-- =============================================
-- 2. BOUNDING BOX HELPER FUNCTION
-- Pre-filter geographic queries before expensive haversine calculations
-- =============================================

CREATE OR REPLACE FUNCTION bounding_box_contains(
    center_lat DECIMAL,
    center_lng DECIMAL,
    test_lat DECIMAL,
    test_lng DECIMAL,
    radius_miles DECIMAL
)
RETURNS BOOLEAN AS $$
DECLARE
    -- Approximate degrees per mile (varies by latitude, but ~0.0145 degrees per mile)
    -- Using conservative estimate for ~40 degrees latitude
    lat_degrees_per_mile DECIMAL := 0.0145;
    lng_degrees_per_mile DECIMAL := 0.0145 / COS(RADIANS(COALESCE(center_lat, 40.0)));
    lat_range DECIMAL;
    lng_range DECIMAL;
BEGIN
    IF center_lat IS NULL OR center_lng IS NULL OR test_lat IS NULL OR test_lng IS NULL THEN
        RETURN true; -- Allow through if coordinates are missing
    END IF;
    
    lat_range := radius_miles * lat_degrees_per_mile;
    lng_range := radius_miles * lng_degrees_per_mile;
    
    -- Quick bounding box check (much faster than haversine)
    RETURN (test_lat BETWEEN center_lat - lat_range AND center_lat + lat_range)
       AND (test_lng BETWEEN center_lng - lng_range AND center_lng + lng_range);
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

-- =============================================
-- 3. OPTIMIZED find_matches_v3 FUNCTION
-- Reduces redundant calculations and improves filtering
-- =============================================

DROP FUNCTION IF EXISTS find_matches_v3(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION find_matches_v3(
    p_ride_id UUID,
    p_max_results INTEGER DEFAULT 10,
    p_min_score INTEGER DEFAULT 30
)
RETURNS TABLE (
    ride_id UUID,
    user_id UUID,
    ride_type TEXT,
    origin_name TEXT,
    dest_name TEXT,
    departure_earliest TIMESTAMPTZ,
    departure_latest TIMESTAMPTZ,
    departure_preferred TIMESTAMPTZ,
    seats_available INTEGER,
    seats_needed INTEGER,
    space_capacity INTEGER,
    gender_pref TEXT,
    quiet_ride BOOLEAN,
    music_ok BOOLEAN,
    -- User profile
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    bio TEXT,
    rating DECIMAL,
    total_rides INTEGER,
    phone_verified BOOLEAN,
    email_verified BOOLEAN,
    id_verified BOOLEAN,
    -- Scores
    total_score INTEGER,
    score_route INTEGER,
    score_time INTEGER,
    score_trust INTEGER,
    score_space INTEGER,
    score_prefs INTEGER,
    -- Metadata
    origin_distance_miles DECIMAL,
    dest_distance_miles DECIMAL,
    time_overlap_minutes INTEGER,
    match_label TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_my rides%ROWTYPE;
    v_my_profile profiles%ROWTYPE;
    v_my_time_window INTEGER; -- Pre-calculate time window size
BEGIN
    -- Get the requesting ride
    SELECT * INTO v_my FROM rides WHERE id = p_ride_id;
    IF v_my IS NULL THEN
        RAISE EXCEPTION 'Ride not found: %', p_ride_id;
    END IF;

    -- Get the requesting user's profile
    SELECT * INTO v_my_profile FROM profiles WHERE id = v_my.user_id;
    
    -- Pre-calculate time window size (used multiple times)
    v_my_time_window := EXTRACT(EPOCH FROM (v_my.departure_latest - v_my.departure_earliest))::INTEGER / 60;

    RETURN QUERY
    WITH prefiltered AS (
        -- First pass: filter using indexes and cheap checks
        SELECT r.*
        FROM rides r
        WHERE r.id != p_ride_id
          AND r.user_id != v_my.user_id
          AND r.status = 'active'
          -- Time window overlap check (cheap comparison first)
          AND r.departure_latest >= v_my.departure_earliest
          AND r.departure_earliest <= v_my.departure_latest
          -- Bounding box pre-filter for origin (much faster than haversine)
          AND (
              v_my.origin_lat IS NULL OR r.origin_lat IS NULL
              OR bounding_box_contains(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng, 5.0)
          )
          -- Bounding box pre-filter for destination
          AND (
              v_my.dest_lat IS NULL OR r.dest_lat IS NULL
              OR bounding_box_contains(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng, 5.0)
          )
          -- Verified-only filter (can use index)
          AND (
              NOT r.verified_only OR v_my_profile.id_verified
          )
          -- Exclude rides that already have any request (pending/accepted/rejected/completed/cancelled)
          AND NOT EXISTS (
              SELECT 1 FROM ride_requests rr
              WHERE (rr.ride_id = p_ride_id AND rr.requester_ride_id = r.id)
                 OR (rr.ride_id = r.id AND rr.requester_ride_id = p_ride_id)
          )
    ),
    candidates AS (
        -- Second pass: join profiles and calculate expensive metrics
        SELECT
            r.*,
            p.first_name AS p_first_name,
            p.last_name AS p_last_name,
            p.photo_url AS p_photo_url,
            p.rating AS p_rating,
            p.total_rides AS p_total_rides,
            p.phone_verified AS p_phone_verified,
            p.email_verified AS p_email_verified,
            p.id_verified AS p_id_verified,
            p.completed_rides AS p_completed_rides,
            -- Calculate distances only for pre-filtered candidates
            haversine_miles(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng) AS _origin_dist,
            haversine_miles(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng) AS _dest_dist,
            -- Calculate time overlap once
            calculate_time_overlap(
                v_my.departure_earliest, v_my.departure_latest,
                r.departure_earliest, r.departure_latest
            ) AS _time_overlap,
            -- Pre-calculate smaller window
            LEAST(
                v_my_time_window,
                EXTRACT(EPOCH FROM (r.departure_latest - r.departure_earliest))::INTEGER / 60
            ) AS _smaller_window
        FROM prefiltered r
        JOIN profiles p ON p.id = r.user_id
        WHERE 
            -- Apply verified filter for requesting user
            (NOT v_my.verified_only OR p.id_verified)
            -- Apply time overlap minimum (20 minutes)
            AND calculate_time_overlap(
                v_my.departure_earliest, v_my.departure_latest,
                r.departure_earliest, r.departure_latest
            ) >= 20
            -- Apply exact haversine distance check (now only on pre-filtered set)
            AND (
                v_my.origin_lat IS NULL OR r.origin_lat IS NULL
                OR haversine_miles(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng) <= 5.0
            )
            AND (
                v_my.dest_lat IS NULL OR r.dest_lat IS NULL
                OR haversine_miles(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng) <= 5.0
            )
            -- Seats fit check
            AND (
                (v_my.ride_type = 'seeking' AND r.seats_available >= v_my.seats_needed)
                OR
                (v_my.ride_type = 'offering' AND v_my.seats_available >= r.seats_needed)
                OR
                -- Seeker-to-seeker matching (both seeking)
                (v_my.ride_type = 'seeking' AND r.ride_type = 'seeking')
            )
    ),
    scored AS (
        SELECT
            c.*,
            -- ===== ROUTE SCORE (40 pts) =====
            (
                -- Origin proximity: 20 pts
                CASE
                    WHEN c._origin_dist IS NULL THEN 10
                    WHEN c._origin_dist <= 0.5 THEN 20
                    WHEN c._origin_dist <= 1.0 THEN 17
                    WHEN c._origin_dist <= 2.0 THEN 14
                    WHEN c._origin_dist <= 3.0 THEN 10
                    WHEN c._origin_dist <= 4.0 THEN 6
                    ELSE 3
                END
                +
                -- Destination proximity: 20 pts
                CASE
                    WHEN c._dest_dist IS NULL THEN 10
                    WHEN c._dest_dist <= 0.5 THEN 20
                    WHEN c._dest_dist <= 1.0 THEN 17
                    WHEN c._dest_dist <= 2.0 THEN 14
                    WHEN c._dest_dist <= 3.0 THEN 10
                    WHEN c._dest_dist <= 4.0 THEN 6
                    ELSE 3
                END
            )::INTEGER AS _score_route,

            -- ===== TIME SCORE (30 pts) =====
            (
                -- Time overlap as % of smaller window: 25 pts
                CASE
                    WHEN c._smaller_window <= 0 THEN 0
                    ELSE LEAST(25, ROUND(25.0 * c._time_overlap / GREATEST(c._smaller_window, 1)))
                END
                +
                -- Preferred time proximity bonus: 5 pts
                CASE
                    WHEN v_my.departure_preferred IS NOT NULL AND c.departure_preferred IS NOT NULL THEN
                        CASE
                            WHEN ABS(EXTRACT(EPOCH FROM (v_my.departure_preferred - c.departure_preferred))) <= 900 THEN 5
                            WHEN ABS(EXTRACT(EPOCH FROM (v_my.departure_preferred - c.departure_preferred))) <= 1800 THEN 3
                            ELSE 1
                        END
                    ELSE 2
                END
            )::INTEGER AS _score_time,

            -- ===== TRUST SCORE (15 pts) =====
            (
                CASE WHEN c.p_phone_verified THEN 5 ELSE 0 END
                +
                CASE WHEN c.p_email_verified THEN 3 ELSE 0 END
                +
                CASE
                    WHEN c.p_completed_rides >= 10 THEN 3
                    WHEN c.p_completed_rides >= 5 THEN 2
                    WHEN c.p_completed_rides >= 1 THEN 1
                    ELSE 0
                END
                +
                CASE
                    WHEN c.p_rating >= 4.5 THEN 4
                    WHEN c.p_rating >= 4.0 THEN 3
                    WHEN c.p_rating >= 3.5 THEN 2
                    WHEN c.p_rating >= 3.0 THEN 1
                    ELSE 0
                END
            )::INTEGER AS _score_trust,

            -- ===== SPACE SCORE (10 pts) =====
            (
                CASE
                    -- Seeker-to-seeker: score based on similar group size
                    WHEN v_my.ride_type = 'seeking' AND c.ride_type = 'seeking' THEN
                        CASE
                            WHEN ABS(c.seats_needed - v_my.seats_needed) = 0 THEN 10
                            WHEN ABS(c.seats_needed - v_my.seats_needed) = 1 THEN 7
                            WHEN ABS(c.seats_needed - v_my.seats_needed) = 2 THEN 4
                            ELSE 2
                        END
                    -- Offering/seeking match
                    WHEN v_my.ride_type = 'seeking' THEN
                        CASE
                            WHEN c.seats_available - v_my.seats_needed >= 3 THEN 10
                            WHEN c.seats_available - v_my.seats_needed >= 2 THEN 8
                            WHEN c.seats_available - v_my.seats_needed >= 1 THEN 6
                            ELSE 4
                        END
                    ELSE
                        CASE
                            WHEN v_my.seats_available - c.seats_needed >= 3 THEN 10
                            WHEN v_my.seats_available - c.seats_needed >= 2 THEN 8
                            WHEN v_my.seats_available - c.seats_needed >= 1 THEN 6
                            ELSE 4
                        END
                END
            )::INTEGER AS _score_space,

            -- ===== PREFERENCES SCORE (5 pts) =====
            (
                CASE
                    WHEN v_my.gender_pref = 'any' OR c.gender_pref = 'any' THEN 2
                    WHEN v_my.gender_pref = c.gender_pref THEN 2
                    ELSE 0
                END
                +
                CASE WHEN v_my.quiet_ride = c.quiet_ride THEN 1 ELSE 0 END
                +
                CASE WHEN v_my.music_ok = c.music_ok THEN 1 ELSE 0 END
                +
                CASE
                    WHEN v_my.pets_ok = c.pets_ok AND v_my.smoking_ok = c.smoking_ok THEN 1
                    ELSE 0
                END
            )::INTEGER AS _score_prefs
        FROM candidates c
    ),
    with_total_score AS (
        -- Calculate total score from individual components
        SELECT
            s.*,
            (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs)::INTEGER AS _total_score
        FROM scored s
    )
    SELECT
        t.id AS ride_id,
        t.user_id,
        t.ride_type,
        t.origin_name,
        t.dest_name,
        t.departure_earliest,
        t.departure_latest,
        t.departure_preferred,
        t.seats_available,
        t.seats_needed,
        t.space_capacity,
        t.gender_pref,
        t.quiet_ride,
        t.music_ok,
        -- Profile
        t.p_first_name AS first_name,
        t.p_last_name AS last_name,
        t.p_photo_url AS photo_url,
        NULL::TEXT AS bio, -- Not selected in current version
        t.p_rating AS rating,
        t.p_total_rides AS total_rides,
        t.p_phone_verified AS phone_verified,
        t.p_email_verified AS email_verified,
        t.p_id_verified AS id_verified,
        -- Scores
        t._total_score AS total_score,
        t._score_route AS score_route,
        t._score_time AS score_time,
        t._score_trust AS score_trust,
        t._score_space AS score_space,
        t._score_prefs AS score_prefs,
        -- Metadata
        t._origin_dist AS origin_distance_miles,
        t._dest_dist AS dest_distance_miles,
        t._time_overlap AS time_overlap_minutes,
        -- Match label
        CASE
            WHEN t._total_score >= 85 THEN 'Excellent Match'
            WHEN t._total_score >= 65 THEN 'Good Match'
            WHEN t._total_score >= 45 THEN 'Fair Match'
            ELSE 'Possible Match'
        END AS match_label
    FROM with_total_score t
    WHERE t._total_score >= p_min_score
    ORDER BY t._total_score DESC
    LIMIT p_max_results;
END;
$$;

-- =============================================
-- 4. ANALYZE TABLES TO UPDATE STATISTICS
-- =============================================

ANALYZE rides;
ANALYZE profiles;
ANALYZE ride_matches;
ANALYZE ride_requests;
