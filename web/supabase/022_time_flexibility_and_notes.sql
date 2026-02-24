-- =============================================
-- 022: Time flexibility + show ride notes in matches
-- - Loosen time filter: show matches in reasonable range (up to 2h gap), score by overlap/gap
-- - Return ride notes so they show when viewing a match
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
    notes TEXT,
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
    v_my_time_window INTEGER;
BEGIN
    SELECT * INTO v_my FROM rides WHERE id = p_ride_id;
    IF v_my IS NULL THEN
        RAISE EXCEPTION 'Ride not found: %', p_ride_id;
    END IF;

    SELECT * INTO v_my_profile FROM profiles WHERE id = v_my.user_id;
    v_my_time_window := EXTRACT(EPOCH FROM (v_my.departure_latest - v_my.departure_earliest))::INTEGER / 60;

    RETURN QUERY
    WITH prefiltered AS (
        SELECT r.*
        FROM rides r
        WHERE r.id != p_ride_id
          AND r.user_id != v_my.user_id
          AND r.status = 'active'
          -- Time: allow overlap OR within 4 hours (reasonable range for human error)
          AND r.departure_latest >= (v_my.departure_earliest - INTERVAL '240 minutes')
          AND r.departure_earliest <= (v_my.departure_latest + INTERVAL '240 minutes')
          AND (
              v_my.origin_lat IS NULL OR r.origin_lat IS NULL
              OR bounding_box_contains(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng, 5.0)
          )
          AND (
              v_my.dest_lat IS NULL OR r.dest_lat IS NULL
              OR bounding_box_contains(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng, 5.0)
          )
          AND (NOT r.verified_only OR v_my_profile.id_verified)
          AND NOT EXISTS (
              SELECT 1 FROM ride_requests rr
              WHERE (rr.ride_id = p_ride_id AND rr.requester_ride_id = r.id)
                 OR (rr.ride_id = r.id AND rr.requester_ride_id = p_ride_id)
          )
    ),
    candidates AS (
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
            haversine_miles(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng) AS _origin_dist,
            haversine_miles(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng) AS _dest_dist,
            calculate_time_overlap(
                v_my.departure_earliest, v_my.departure_latest,
                r.departure_earliest, r.departure_latest
            ) AS _time_overlap,
            -- Gap in minutes when windows don't overlap (0 when they do)
            CASE
                WHEN calculate_time_overlap(
                    v_my.departure_earliest, v_my.departure_latest,
                    r.departure_earliest, r.departure_latest
                ) > 0 THEN 0
                ELSE GREATEST(0, EXTRACT(EPOCH FROM (
                    GREATEST(v_my.departure_earliest, r.departure_earliest)
                    - LEAST(v_my.departure_latest, r.departure_latest)
                )) / 60)::INTEGER
            END AS _time_gap_minutes,
            LEAST(
                v_my_time_window,
                EXTRACT(EPOCH FROM (r.departure_latest - r.departure_earliest))::INTEGER / 60
            ) AS _smaller_window
        FROM prefiltered r
        JOIN profiles p ON p.id = r.user_id
        WHERE
            (NOT v_my.verified_only OR p.id_verified)
            AND (
                v_my.origin_lat IS NULL OR r.origin_lat IS NULL
                OR haversine_miles(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng) <= 5.0
            )
            AND (
                v_my.dest_lat IS NULL OR r.dest_lat IS NULL
                OR haversine_miles(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng) <= 5.0
            )
            AND (
                (v_my.ride_type = 'seeking' AND r.seats_available >= v_my.seats_needed)
                OR (v_my.ride_type = 'offering' AND v_my.seats_available >= r.seats_needed)
                OR (v_my.ride_type = 'seeking' AND r.ride_type = 'seeking')
            )
    ),
    scored AS (
        SELECT
            c.*,
            (
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

            -- TIME SCORE (30 pts): overlap = full score; no overlap but within 2h = partial (human error)
            (
                CASE
                    WHEN c._time_overlap > 0 THEN
                        LEAST(25, ROUND(25.0 * c._time_overlap / GREATEST(c._smaller_window, 1)))
                    WHEN c._time_gap_minutes <= 240 THEN
                        GREATEST(0, LEAST(25, 25 - ROUND((c._time_gap_minutes::DECIMAL / 240) * 25)))
                    ELSE 0
                END
                +
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

            (
                CASE WHEN c.p_phone_verified THEN 5 ELSE 0 END
                + CASE WHEN c.p_email_verified THEN 3 ELSE 0 END
                + CASE
                    WHEN c.p_completed_rides >= 10 THEN 3
                    WHEN c.p_completed_rides >= 5 THEN 2
                    WHEN c.p_completed_rides >= 1 THEN 1
                    ELSE 0
                END
                + CASE
                    WHEN c.p_rating >= 4.5 THEN 4
                    WHEN c.p_rating >= 4.0 THEN 3
                    WHEN c.p_rating >= 3.5 THEN 2
                    WHEN c.p_rating >= 3.0 THEN 1
                    ELSE 0
                END
            )::INTEGER AS _score_trust,

            (
                CASE
                    WHEN v_my.ride_type = 'seeking' AND c.ride_type = 'seeking' THEN
                        CASE
                            WHEN ABS(c.seats_needed - v_my.seats_needed) = 0 THEN 10
                            WHEN ABS(c.seats_needed - v_my.seats_needed) = 1 THEN 7
                            WHEN ABS(c.seats_needed - v_my.seats_needed) = 2 THEN 4
                            ELSE 2
                        END
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

            (
                CASE
                    WHEN v_my.gender_pref = 'any' OR c.gender_pref = 'any' THEN 2
                    WHEN v_my.gender_pref = c.gender_pref THEN 2
                    ELSE 0
                END
                + CASE WHEN v_my.quiet_ride = c.quiet_ride THEN 1 ELSE 0 END
                + CASE WHEN v_my.music_ok = c.music_ok THEN 1 ELSE 0 END
                + CASE WHEN v_my.pets_ok = c.pets_ok AND v_my.smoking_ok = c.smoking_ok THEN 1 ELSE 0 END
            )::INTEGER AS _score_prefs
        FROM candidates c
    ),
    with_total_score AS (
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
        t.notes,
        t.p_first_name AS first_name,
        t.p_last_name AS last_name,
        t.p_photo_url AS photo_url,
        NULL::TEXT AS bio,
        t.p_rating AS rating,
        t.p_total_rides AS total_rides,
        t.p_phone_verified AS phone_verified,
        t.p_email_verified AS email_verified,
        t.p_id_verified AS id_verified,
        t._total_score AS total_score,
        t._score_route AS score_route,
        t._score_time AS score_time,
        t._score_trust AS score_trust,
        t._score_space AS score_space,
        t._score_prefs AS score_prefs,
        t._origin_dist AS origin_distance_miles,
        t._dest_dist AS dest_distance_miles,
        t._time_overlap AS time_overlap_minutes,
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
