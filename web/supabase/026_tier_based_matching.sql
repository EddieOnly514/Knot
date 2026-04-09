-- =============================================
-- 026_tier_based_matching.sql
-- Seeker-only, tier-based matching for Knot
-- Replaces score-based matching with:
-- - hard filters
-- - time tiers
-- - distance buckets
-- - soft preference compatibility
-- - luggage / Uber XL warning metadata
-- =============================================

DROP FUNCTION IF EXISTS find_matches_v3(UUID, INTEGER, INTEGER);

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
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_my rides%ROWTYPE;
    v_my_profile profiles%ROWTYPE;
    v_my_host_ride_id UUID;
    v_my_interval_start TIMESTAMPTZ;
    v_my_interval_end TIMESTAMPTZ;
    v_my_interval_minutes INTEGER;
    v_my_origin_centroid_lat DECIMAL;
    v_my_origin_centroid_lng DECIMAL;
    v_my_total_seats INTEGER;
    v_my_date DATE;
BEGIN
    SELECT * INTO v_my
    FROM rides
    WHERE id = p_ride_id
      AND status = 'active';

    IF v_my IS NULL THEN
        RAISE EXCEPTION 'Ride not found or inactive: %', p_ride_id;
    END IF;

    SELECT * INTO v_my_profile
    FROM profiles
    WHERE id = v_my.user_id;

    -- Knot is now seeker-only. Legacy "offering" rides are ignored by the matcher.
    IF v_my.ride_type IS DISTINCT FROM 'seeking' THEN
        RETURN;
    END IF;

    SELECT COALESCE(
        (
            SELECT rg.ride_id
            FROM ride_group_members rgm
            JOIN ride_groups rg ON rg.id = rgm.ride_group_id
            WHERE rgm.ride_id = v_my.id
              AND rgm.left_at IS NULL
            LIMIT 1
        ),
        v_my.id
    ) INTO v_my_host_ride_id;

    WITH my_group AS (
        SELECT rgm.ride_group_id
        FROM ride_group_members rgm
        WHERE rgm.ride_id = v_my.id
          AND rgm.left_at IS NULL
        LIMIT 1
    ),
    my_group_members AS (
        SELECT r.*
        FROM rides r
        WHERE r.id = v_my.id
          AND NOT EXISTS (SELECT 1 FROM my_group)
        UNION ALL
        SELECT r.*
        FROM ride_group_members rgm
        JOIN rides r ON r.id = rgm.ride_id
        WHERE rgm.left_at IS NULL
          AND rgm.ride_group_id = (SELECT ride_group_id FROM my_group)
    )
    SELECT
        MAX(mgm.departure_earliest),
        MIN(mgm.departure_latest),
        AVG(mgm.origin_lat),
        AVG(mgm.origin_lng),
        COALESCE(SUM(mgm.seats_needed), 0),
        COALESCE((MAX(COALESCE(mgm.departure_preferred, mgm.departure_earliest)))::DATE, (MAX(mgm.departure_earliest))::DATE)
    INTO
        v_my_interval_start,
        v_my_interval_end,
        v_my_origin_centroid_lat,
        v_my_origin_centroid_lng,
        v_my_total_seats,
        v_my_date
    FROM my_group_members mgm;

    v_my_interval_minutes := GREATEST(
        0,
        EXTRACT(EPOCH FROM (v_my_interval_end - v_my_interval_start))::INTEGER / 60
    );

    RETURN QUERY
    WITH candidate_base AS (
        SELECT
            r.*,
            p.first_name,
            p.last_name,
            p.photo_url,
            p.bio,
            p.school,
            p.conversation_pref,
            COALESCE(
                (
                    SELECT rg.ride_id
                    FROM ride_group_members rgm
                    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
                    WHERE rgm.ride_id = r.id
                      AND rgm.left_at IS NULL
                    LIMIT 1
                ),
                r.id
            ) AS host_ride_id
        FROM rides r
        JOIN profiles p ON p.id = r.user_id
        WHERE r.id <> p_ride_id
          AND r.user_id <> v_my.user_id
          AND r.status = 'active'
          AND r.ride_type = 'seeking'
          AND NOT EXISTS (
              SELECT 1
              FROM ride_requests rr
              WHERE rr.created_at > NOW() - INTERVAL '7 days'
                AND (
                    (rr.ride_id = p_ride_id AND rr.requester_ride_id = r.id)
                    OR
                    (rr.ride_id = r.id AND rr.requester_ride_id = p_ride_id)
                )
          )
    ),
    candidate_grouped AS (
        SELECT DISTINCT ON (c.host_ride_id)
            host.id,
            host.user_id,
            host.ride_type,
            host.origin_lat,
            host.origin_lng,
            host.origin_name,
            host.dest_lat,
            host.dest_lng,
            host.dest_name,
            host.departure_earliest,
            host.departure_latest,
            host.departure_preferred,
            host.seats_needed,
            host.space_capacity,
            host.gender_pref,
            host.quiet_ride,
            host.music_ok,
            host.notes,
            host_profile.first_name,
            host_profile.last_name,
            host_profile.photo_url,
            host_profile.bio,
            host_profile.school,
            host_profile.conversation_pref,
            c.host_ride_id,
            group_stats.ride_group_id,
            group_stats.interval_start,
            group_stats.interval_end,
            group_stats.interval_minutes,
            group_stats.origin_centroid_lat,
            group_stats.origin_centroid_lng,
            group_stats.total_seats,
            group_stats.total_members,
            group_stats.total_bags,
            group_stats.has_oversized,
            group_stats.gender_hard_blocks,
            group_stats.music_compatible_ratio,
            group_stats.vibe_compatible_ratio,
            group_stats.members_json,
            COALESCE((group_stats.effective_date)::DATE, (COALESCE(host.departure_preferred, host.departure_earliest))::DATE) AS effective_date
        FROM candidate_base c
        JOIN rides host ON host.id = c.host_ride_id
        JOIN profiles host_profile ON host_profile.id = host.user_id
        CROSS JOIN LATERAL (
            WITH target_group AS (
                SELECT rgm.ride_group_id
                FROM ride_group_members rgm
                JOIN ride_groups rg ON rg.id = rgm.ride_group_id
                WHERE rg.ride_id = c.host_ride_id
                  AND rgm.left_at IS NULL
                LIMIT 1
            ),
            members AS (
                SELECT r2.*, p2.conversation_pref, p2.first_name, p2.last_name, p2.photo_url, p2.school
                FROM rides r2
                JOIN profiles p2 ON p2.id = r2.user_id
                WHERE r2.id = c.host_ride_id
                  AND NOT EXISTS (SELECT 1 FROM target_group)
                UNION ALL
                SELECT r2.*, p2.conversation_pref, p2.first_name, p2.last_name, p2.photo_url, p2.school
                FROM ride_group_members rgm2
                JOIN rides r2 ON r2.id = rgm2.ride_id
                JOIN profiles p2 ON p2.id = r2.user_id
                WHERE rgm2.left_at IS NULL
                  AND rgm2.ride_group_id = (SELECT ride_group_id FROM target_group)
            )
            SELECT
                (SELECT ride_group_id FROM target_group) AS ride_group_id,
                MAX(m.departure_earliest) AS interval_start,
                MIN(m.departure_latest) AS interval_end,
                GREATEST(
                    0,
                    EXTRACT(EPOCH FROM (MIN(m.departure_latest) - MAX(m.departure_earliest)))::INTEGER / 60
                ) AS interval_minutes,
                AVG(m.origin_lat) AS origin_centroid_lat,
                AVG(m.origin_lng) AS origin_centroid_lng,
                COALESCE(SUM(m.seats_needed), 0) AS total_seats,
                COUNT(*)::INTEGER AS total_members,
                COALESCE(SUM(
                    CASE m.space_capacity
                        WHEN 0 THEN 0
                        WHEN 1 THEN 1
                        WHEN 2 THEN 2
                        ELSE 0
                    END
                ), 0)::INTEGER AS total_bags,
                BOOL_OR(m.space_capacity = 3) AS has_oversized,
                BOOL_OR(m.gender_pref <> 'any') AS gender_hard_blocks,
                AVG(
                    CASE
                        WHEN c.music_ok = m.music_ok THEN 1.0
                        ELSE 0.5
                    END
                )::DECIMAL AS music_compatible_ratio,
                AVG(
                    CASE
                        WHEN m.conversation_pref IS NULL OR m.conversation_pref = 'either' THEN 1.0
                        WHEN v_my_profile.conversation_pref IS NULL OR v_my_profile.conversation_pref = 'either' THEN 1.0
                        WHEN m.conversation_pref = v_my_profile.conversation_pref THEN 1.0
                        ELSE 0.0
                    END
                )::DECIMAL AS vibe_compatible_ratio,
                MAX(COALESCE(m.departure_preferred, m.departure_earliest))::DATE AS effective_date,
                jsonb_agg(
                    jsonb_build_object(
                        'ride_id', m.id,
                        'user_id', m.user_id,
                        'first_name', m.first_name,
                        'last_name', m.last_name,
                        'photo_url', m.photo_url,
                        'school', m.school,
                        'origin_name', m.origin_name,
                        'dest_name', m.dest_name,
                        'departure_earliest', m.departure_earliest,
                        'departure_latest', m.departure_latest,
                        'departure_preferred', m.departure_preferred,
                        'seats_needed', m.seats_needed,
                        'space_capacity', m.space_capacity,
                        'gender_pref', m.gender_pref,
                        'quiet_ride', m.quiet_ride,
                        'music_ok', m.music_ok
                    )
                    ORDER BY m.departure_preferred NULLS LAST, m.departure_earliest
                ) AS members_json
            FROM members m
        ) AS group_stats
    ),
    compatible AS (
        SELECT
            c.*,
            haversine_miles(v_my_origin_centroid_lat, v_my_origin_centroid_lng, c.origin_centroid_lat, c.origin_centroid_lng) AS d_origin,
            haversine_miles(v_my.dest_lat, v_my.dest_lng, c.dest_lat, c.dest_lng) AS d_destination,
            GREATEST(
                0,
                EXTRACT(EPOCH FROM (
                    LEAST(v_my_interval_end, c.interval_end) - GREATEST(v_my_interval_start, c.interval_start)
                ))::INTEGER / 60
            ) AS overlap_minutes_calc,
            CASE
                WHEN LEAST(v_my_interval_end, c.interval_end) > GREATEST(v_my_interval_start, c.interval_start) THEN 0
                ELSE GREATEST(
                    0,
                    EXTRACT(EPOCH FROM (
                        GREATEST(v_my_interval_start, c.interval_start) - LEAST(v_my_interval_end, c.interval_end)
                    ))::INTEGER / 60
                )
            END AS gap_minutes_calc
        FROM candidate_grouped c
        WHERE c.effective_date = v_my_date
          AND c.total_seats + v_my_total_seats <= 6
          AND haversine_miles(v_my.dest_lat, v_my.dest_lng, c.dest_lat, c.dest_lng) <= 2.0
          AND haversine_miles(v_my_origin_centroid_lat, v_my_origin_centroid_lng, c.origin_centroid_lat, c.origin_centroid_lng) <= 2.0
    ),
    tiered AS (
        SELECT
            c.*,
            CASE
                WHEN c.overlap_minutes_calc >= 60 THEN 'STRONG'
                WHEN c.overlap_minutes_calc >= 30 THEN 'OKAY'
                WHEN c.overlap_minutes_calc >= 1 THEN 'WEAK'
                WHEN c.gap_minutes_calc <= 180 AND LEAST(v_my_interval_minutes, c.interval_minutes) < 30 THEN 'WEAK'
                WHEN c.gap_minutes_calc <= 60 THEN 'BORDERLINE'
                WHEN c.gap_minutes_calc <= 180 THEN 'LAST_RESORT'
                ELSE NULL
            END AS computed_time_tier,
            CASE
                WHEN c.d_origin <= 0.5 THEN 'CLOSE'
                WHEN c.d_origin <= 1.0 THEN 'NEAR'
                ELSE 'OKAY'
            END AS computed_origin_tier,
            CASE
                WHEN c.d_destination <= 0.5 THEN 'SAME_AREA'
                WHEN c.d_destination <= 1.0 THEN 'VERY_CLOSE'
                ELSE 'NEARBY'
            END AS computed_destination_tier,
            CASE
                WHEN c.total_bags + CASE c.space_capacity WHEN 1 THEN 1 WHEN 2 THEN 2 ELSE 0 END >= 4
                  OR c.has_oversized
                  OR c.space_capacity = 3
                THEN TRUE
                ELSE FALSE
            END AS computed_needs_xl,
            GREATEST(0, 6 - (c.total_seats + v_my_total_seats)) AS computed_seats_remaining_after_join,
            CASE
                WHEN (6 - c.total_seats) <= 0 THEN 1.0::DECIMAL
                ELSE ROUND((v_my.seats_needed::DECIMAL / GREATEST(6 - c.total_seats, 1)), 3)
            END AS computed_fill_efficiency,
            CASE
                WHEN c.gender_hard_blocks THEN FALSE
                ELSE TRUE
            END AS computed_gender_compatible,
            ROUND(((COALESCE(c.music_compatible_ratio, 0.5) + COALESCE(c.vibe_compatible_ratio, 0.5)) / 2.0)::NUMERIC, 3)::DECIMAL AS computed_pref_overall
        FROM compatible c
        WHERE c.overlap_minutes_calc > 0
           OR c.gap_minutes_calc <= 180
    )
    SELECT
        COALESCE(t.ride_group_id, t.host_ride_id) AS candidate_id,
        CASE WHEN t.total_members > 1 THEN 'group' ELSE 'solo' END AS candidate_type,
        t.host_ride_id AS request_target_ride_id,
        t.ride_group_id,
        t.id AS ride_id,
        t.user_id,
        t.ride_type,
        t.origin_name,
        t.dest_name,
        t.departure_earliest,
        t.departure_latest,
        t.departure_preferred,
        t.seats_needed,
        t.space_capacity,
        t.gender_pref,
        t.quiet_ride,
        t.music_ok,
        t.notes,
        t.first_name,
        t.last_name,
        t.photo_url,
        t.bio,
        t.school,
        t.computed_time_tier AS time_tier,
        t.overlap_minutes_calc AS overlap_minutes,
        t.gap_minutes_calc AS gap_minutes,
        ROUND(t.d_origin::NUMERIC, 2)::DECIMAL AS d_origin_miles,
        t.computed_origin_tier AS d_origin_tier,
        ROUND(t.d_destination::NUMERIC, 2)::DECIMAL AS d_destination_miles,
        t.computed_destination_tier AS d_destination_tier,
        t.computed_needs_xl AS needs_xl,
        CASE
            WHEN t.computed_needs_xl THEN 'This group may need Uber XL'
            ELSE NULL
        END AS xl_flag_message,
        t.computed_seats_remaining_after_join AS seats_remaining_after_join,
        t.computed_fill_efficiency AS fill_efficiency,
        t.computed_gender_compatible AS gender_compatible,
        t.computed_pref_overall AS pref_overall,
        t.total_members AS group_size_before_join,
        t.total_members + 1 AS group_size_after_join,
        t.members_json AS members,
        CASE t.computed_time_tier
            WHEN 'STRONG' THEN 'Great Match'
            WHEN 'OKAY' THEN 'Okay Match'
            WHEN 'WEAK' THEN 'Possible Match'
            WHEN 'BORDERLINE' THEN 'Possible Match'
            ELSE 'Low Match'
        END AS match_label,
        CASE t.computed_time_tier
            WHEN 'STRONG' THEN 'Strong time overlap, close enough to share a ride.'
            WHEN 'OKAY' THEN 'Good time overlap for a shared ride.'
            WHEN 'WEAK' THEN 'Some time overlap, but less flexibility.'
            WHEN 'BORDERLINE' THEN 'Time windows are close but do not fully overlap.'
            ELSE 'Shown because there are no better nearby time matches.'
        END AS match_explanation
    FROM tiered t
    WHERE t.computed_time_tier IS NOT NULL
    ORDER BY
        CASE t.computed_time_tier
            WHEN 'STRONG' THEN 1
            WHEN 'OKAY' THEN 2
            WHEN 'WEAK' THEN 3
            WHEN 'BORDERLINE' THEN 4
            ELSE 5
        END,
        GREATEST(
            CASE t.computed_origin_tier WHEN 'CLOSE' THEN 1 WHEN 'NEAR' THEN 2 ELSE 3 END,
            CASE t.computed_destination_tier WHEN 'SAME_AREA' THEN 1 WHEN 'VERY_CLOSE' THEN 2 ELSE 3 END
        ),
        (
            CASE t.computed_origin_tier WHEN 'CLOSE' THEN 1 WHEN 'NEAR' THEN 2 ELSE 3 END
            +
            CASE t.computed_destination_tier WHEN 'SAME_AREA' THEN 1 WHEN 'VERY_CLOSE' THEN 2 ELSE 3 END
        ),
        CASE WHEN t.computed_gender_compatible THEN 0 ELSE 1 END,
        t.computed_pref_overall DESC,
        t.d_destination,
        t.d_origin
    LIMIT p_max_results;
END;
$$;
