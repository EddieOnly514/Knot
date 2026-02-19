-- =============================================
-- 006_seeker_matching.sql
-- Update matching to support seeker-to-seeker matching
-- (travelers heading the same direction)
-- =============================================

-- Run this in the Supabase SQL Editor

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
BEGIN
    -- Get the requesting ride
    SELECT * INTO v_my FROM rides WHERE id = p_ride_id;
    IF v_my IS NULL THEN
        RAISE EXCEPTION 'Ride not found: %', p_ride_id;
    END IF;

    -- Get the requesting user's profile
    SELECT * INTO v_my_profile FROM profiles WHERE id = v_my.user_id;

    RETURN QUERY
    WITH candidates AS (
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
            -- Pre-compute distances
            haversine_miles(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng) AS _origin_dist,
            haversine_miles(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng) AS _dest_dist,
            -- Pre-compute time overlap
            calculate_time_overlap(
                v_my.departure_earliest, v_my.departure_latest,
                r.departure_earliest, r.departure_latest
            ) AS _time_overlap,
            -- Smaller window size for percentage calculation
            LEAST(
                EXTRACT(EPOCH FROM (v_my.departure_latest - v_my.departure_earliest))::INTEGER / 60,
                EXTRACT(EPOCH FROM (r.departure_latest - r.departure_earliest))::INTEGER / 60
            ) AS _smaller_window
        FROM rides r
        JOIN profiles p ON p.id = r.user_id
        WHERE r.id != p_ride_id
          AND r.user_id != v_my.user_id
          AND r.status = 'active'
          -- Match same OR opposite ride types (seekers match with seekers)
          -- Time window overlap >= 20 minutes
          AND calculate_time_overlap(
                v_my.departure_earliest, v_my.departure_latest,
                r.departure_earliest, r.departure_latest
              ) >= 20
          -- Origin proximity: within 2 miles (or no coords)
          AND (
              v_my.origin_lat IS NULL OR r.origin_lat IS NULL
              OR haversine_miles(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng) <= 2.0
          )
          -- Destination proximity: within 2 miles (or no coords)
          AND (
              v_my.dest_lat IS NULL OR r.dest_lat IS NULL
              OR haversine_miles(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng) <= 2.0
          )
          -- Verified-only filter
          AND (
              NOT r.verified_only
              OR v_my_profile.id_verified
          )
          AND (
              NOT v_my.verified_only
              OR p.id_verified
          )
    ),
    scored AS (
        SELECT
            c.*,
            -- ===== ROUTE SCORE (40 pts) =====
            (
                -- Origin proximity: 20 pts (max 2 miles)
                CASE
                    WHEN c._origin_dist IS NULL THEN 10  -- partial credit
                    WHEN c._origin_dist <= 0.25 THEN 20
                    WHEN c._origin_dist <= 0.5 THEN 17
                    WHEN c._origin_dist <= 1.0 THEN 14
                    WHEN c._origin_dist <= 1.5 THEN 10
                    ELSE 6
                END
                +
                -- Destination proximity: 20 pts (max 2 miles)
                CASE
                    WHEN c._dest_dist IS NULL THEN 10  -- partial credit
                    WHEN c._dest_dist <= 0.25 THEN 20
                    WHEN c._dest_dist <= 0.5 THEN 17
                    WHEN c._dest_dist <= 1.0 THEN 14
                    WHEN c._dest_dist <= 1.5 THEN 10
                    ELSE 6
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
                            WHEN ABS(EXTRACT(EPOCH FROM (v_my.departure_preferred - c.departure_preferred))) <= 900 THEN 5  -- within 15 min
                            WHEN ABS(EXTRACT(EPOCH FROM (v_my.departure_preferred - c.departure_preferred))) <= 1800 THEN 3  -- within 30 min
                            ELSE 1
                        END
                    ELSE 2  -- partial credit if no preferred time
                END
            )::INTEGER AS _score_time,

            -- ===== TRUST SCORE (15 pts) =====
            (
                -- Phone verified: 5 pts
                CASE WHEN c.p_phone_verified THEN 5 ELSE 0 END
                +
                -- Email verified: 3 pts
                CASE WHEN c.p_email_verified THEN 3 ELSE 0 END
                +
                -- Completed rides: 0-3 pts
                CASE
                    WHEN c.p_completed_rides >= 10 THEN 3
                    WHEN c.p_completed_rides >= 5 THEN 2
                    WHEN c.p_completed_rides >= 1 THEN 1
                    ELSE 0
                END
                +
                -- Rating: 0-4 pts
                CASE
                    WHEN c.p_rating >= 4.5 THEN 4
                    WHEN c.p_rating >= 4.0 THEN 3
                    WHEN c.p_rating >= 3.5 THEN 2
                    WHEN c.p_rating >= 3.0 THEN 1
                    ELSE 0
                END
            )::INTEGER AS _score_trust,

            -- ===== SPACE SCORE (10 pts) =====
            -- For seeker-to-seeker: score based on similar group size
            (
                CASE
                    WHEN ABS(c.seats_needed - v_my.seats_needed) = 0 THEN 10  -- same group size
                    WHEN ABS(c.seats_needed - v_my.seats_needed) = 1 THEN 7   -- close
                    WHEN ABS(c.seats_needed - v_my.seats_needed) = 2 THEN 4   -- different
                    ELSE 2
                END
            )::INTEGER AS _score_space,

            -- ===== PREFERENCES SCORE (5 pts) =====
            (
                -- Gender preference match: 2 pts
                CASE
                    WHEN v_my.gender_pref = 'any' OR c.gender_pref = 'any' THEN 2
                    WHEN v_my.gender_pref = c.gender_pref THEN 2
                    ELSE 0
                END
                +
                -- Quiet ride alignment: 1 pt
                CASE WHEN v_my.quiet_ride = c.quiet_ride THEN 1 ELSE 0 END
                +
                -- Music alignment: 1 pt
                CASE WHEN v_my.music_ok = c.music_ok THEN 1 ELSE 0 END
                +
                -- Pets/smoking: 1 pt combined
                CASE
                    WHEN v_my.pets_ok = c.pets_ok AND v_my.smoking_ok = c.smoking_ok THEN 1
                    ELSE 0
                END
            )::INTEGER AS _score_prefs
        FROM candidates c
        JOIN rides r ON r.id = c.id
    )
    SELECT
        s.id AS ride_id,
        s.user_id,
        s.ride_type,
        s.origin_name,
        s.dest_name,
        s.departure_earliest,
        s.departure_latest,
        s.departure_preferred,
        s.seats_available,
        s.seats_needed,
        s.space_capacity,
        s.gender_pref,
        s.quiet_ride,
        s.music_ok,
        -- Profile
        s.p_first_name AS first_name,
        s.p_last_name AS last_name,
        s.p_photo_url AS photo_url,
        s.p_rating AS rating,
        s.p_total_rides AS total_rides,
        s.p_phone_verified AS phone_verified,
        s.p_email_verified AS email_verified,
        s.p_id_verified AS id_verified,
        -- Scores
        (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs)::INTEGER AS total_score,
        s._score_route AS score_route,
        s._score_time AS score_time,
        s._score_trust AS score_trust,
        s._score_space AS score_space,
        s._score_prefs AS score_prefs,
        -- Metadata
        s._origin_dist AS origin_distance_miles,
        s._dest_dist AS dest_distance_miles,
        s._time_overlap AS time_overlap_minutes,
        -- Match label
        CASE
            WHEN (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) >= 85 THEN 'Excellent Match'
            WHEN (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) >= 65 THEN 'Good Match'
            WHEN (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) >= 45 THEN 'Fair Match'
            ELSE 'Possible Match'
        END AS match_label
    FROM scored s
    WHERE (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) >= p_min_score
    ORDER BY (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) DESC
    LIMIT p_max_results;
END;
$$;
