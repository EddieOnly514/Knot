-- =============================================
-- 032_find_matches_no_active_status.sql
-- find_matches_v3: do not require rides.status = 'active' for anchor or
-- candidates (matching is independent of lifecycle status).
-- Uses defensive column aliasing from 031 to avoid ambiguous references.
-- Re-applies row_security off after REPLACE (see 031).
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
SET row_security = off
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
    WHERE id = p_ride_id;

    IF v_my IS NULL THEN
        RAISE EXCEPTION 'Ride not found: %', p_ride_id;
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

    -- Use the rider's own posted time window for discovery, not the group's
    -- narrowed intersection window.
    v_my_interval_start := v_my.departure_earliest;
    v_my_interval_end := v_my.departure_latest;
    v_my_interval_minutes := GREATEST(
        0,
        EXTRACT(EPOCH FROM (v_my_interval_end - v_my_interval_start))::INTEGER / 60
    );
    v_my_date := COALESCE(v_my.departure_preferred, v_my.departure_earliest)::DATE;

    WITH my_group AS (
        SELECT rgm.ride_group_id
        FROM ride_group_members rgm
        WHERE rgm.ride_id = v_my.id
          AND rgm.left_at IS NULL
        LIMIT 1
    ),
    my_group_rides AS (
        SELECT r.origin_lat, r.origin_lng, r.seats_needed
        FROM rides r
        WHERE r.id = v_my.id
          AND NOT EXISTS (SELECT 1 FROM my_group)
        UNION ALL
        SELECT r.origin_lat, r.origin_lng, r.seats_needed
        FROM ride_group_members rgm
        JOIN rides r ON r.id = rgm.ride_id
        WHERE rgm.left_at IS NULL
          AND rgm.ride_group_id = (SELECT ride_group_id FROM my_group)
    )
    SELECT
        AVG(mgr.origin_lat),
        AVG(mgr.origin_lng),
        COALESCE(SUM(mgr.seats_needed), 0)
    INTO
        v_my_origin_centroid_lat,
        v_my_origin_centroid_lng,
        v_my_total_seats
    FROM my_group_rides mgr;

    RETURN QUERY
    WITH candidate_base AS (
        SELECT
            r.id AS cb_ride_id,
            r.user_id AS cb_user_id,
            r.ride_type AS cb_ride_type,
            r.origin_lat AS cb_origin_lat,
            r.origin_lng AS cb_origin_lng,
            r.origin_name AS cb_origin_name,
            r.dest_lat AS cb_dest_lat,
            r.dest_lng AS cb_dest_lng,
            r.dest_name AS cb_dest_name,
            r.departure_earliest AS cb_departure_earliest,
            r.departure_latest AS cb_departure_latest,
            r.departure_preferred AS cb_departure_preferred,
            r.seats_needed AS cb_seats_needed,
            r.space_capacity AS cb_space_capacity,
            r.gender_pref AS cb_gender_pref,
            r.quiet_ride AS cb_quiet_ride,
            r.music_ok AS cb_music_ok,
            r.notes AS cb_notes,
            p.first_name AS cb_first_name,
            p.last_name AS cb_last_name,
            p.photo_url AS cb_photo_url,
            p.bio AS cb_bio,
            p.school AS cb_school,
            p.conversation_pref AS cb_conversation_pref,
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
            ) AS cb_host_ride_id
        FROM rides r
        JOIN profiles p ON p.id = r.user_id
        WHERE r.id <> p_ride_id
          AND r.user_id <> v_my.user_id
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
        SELECT DISTINCT ON (cb.cb_host_ride_id)
            host.id AS cg_id,
            host.user_id AS cg_user_id,
            host.ride_type AS cg_ride_type,
            host.origin_lat AS cg_origin_lat,
            host.origin_lng AS cg_origin_lng,
            host.origin_name AS cg_origin_name,
            host.dest_lat AS cg_dest_lat,
            host.dest_lng AS cg_dest_lng,
            host.dest_name AS cg_dest_name,
            host.departure_earliest AS cg_departure_earliest,
            host.departure_latest AS cg_departure_latest,
            host.departure_preferred AS cg_departure_preferred,
            host.seats_needed AS cg_seats_needed,
            host.space_capacity AS cg_space_capacity,
            host.gender_pref AS cg_gender_pref,
            host.quiet_ride AS cg_quiet_ride,
            host.music_ok AS cg_music_ok,
            host.notes AS cg_notes,
            hp.first_name AS cg_first_name,
            hp.last_name AS cg_last_name,
            hp.photo_url AS cg_photo_url,
            hp.bio AS cg_bio,
            hp.school AS cg_school,
            hp.conversation_pref AS cg_conversation_pref,
            cb.cb_host_ride_id,
            gs.grp_ride_group_id,
            gs.grp_interval_start,
            gs.grp_interval_end,
            gs.grp_interval_minutes,
            gs.grp_origin_centroid_lat,
            gs.grp_origin_centroid_lng,
            gs.grp_total_seats,
            gs.grp_total_members,
            gs.grp_total_bags,
            gs.grp_has_oversized,
            gs.grp_gender_hard_blocks,
            gs.grp_music_compatible_ratio,
            gs.grp_vibe_compatible_ratio,
            gs.grp_members_json,
            COALESCE(
                gs.grp_effective_date,
                (COALESCE(host.departure_preferred, host.departure_earliest))::DATE
            ) AS cg_effective_date
        FROM candidate_base cb
        JOIN rides host ON host.id = cb.cb_host_ride_id
        JOIN profiles hp ON hp.id = host.user_id
        CROSS JOIN LATERAL (
            WITH target_group AS (
                SELECT rgm.ride_group_id
                FROM ride_group_members rgm
                JOIN ride_groups rg ON rg.id = rgm.ride_group_id
                WHERE rg.ride_id = cb.cb_host_ride_id
                  AND rgm.left_at IS NULL
                LIMIT 1
            ),
            grp_members AS (
                SELECT
                    mr.id            AS mr_id,
                    mr.user_id       AS mr_user_id,
                    mr.departure_earliest  AS mr_departure_earliest,
                    mr.departure_latest    AS mr_departure_latest,
                    mr.departure_preferred AS mr_departure_preferred,
                    mr.origin_lat    AS mr_origin_lat,
                    mr.origin_lng    AS mr_origin_lng,
                    mr.origin_name   AS mr_origin_name,
                    mr.dest_name     AS mr_dest_name,
                    mr.seats_needed  AS mr_seats_needed,
                    mr.space_capacity AS mr_space_capacity,
                    mr.gender_pref   AS mr_gender_pref,
                    mr.quiet_ride    AS mr_quiet_ride,
                    mr.music_ok      AS mr_music_ok,
                    mp.conversation_pref AS mr_conversation_pref,
                    mp.first_name    AS mr_first_name,
                    mp.last_name     AS mr_last_name,
                    mp.photo_url     AS mr_photo_url,
                    mp.school        AS mr_school
                FROM rides mr
                JOIN profiles mp ON mp.id = mr.user_id
                WHERE mr.id = cb.cb_host_ride_id
                  AND NOT EXISTS (SELECT 1 FROM target_group)
                UNION ALL
                SELECT
                    mr.id,
                    mr.user_id,
                    mr.departure_earliest,
                    mr.departure_latest,
                    mr.departure_preferred,
                    mr.origin_lat,
                    mr.origin_lng,
                    mr.origin_name,
                    mr.dest_name,
                    mr.seats_needed,
                    mr.space_capacity,
                    mr.gender_pref,
                    mr.quiet_ride,
                    mr.music_ok,
                    mp.conversation_pref,
                    mp.first_name,
                    mp.last_name,
                    mp.photo_url,
                    mp.school
                FROM ride_group_members rgm2
                JOIN rides mr ON mr.id = rgm2.ride_id
                JOIN profiles mp ON mp.id = mr.user_id
                WHERE rgm2.left_at IS NULL
                  AND rgm2.ride_group_id = (SELECT ride_group_id FROM target_group)
            )
            SELECT
                (SELECT ride_group_id FROM target_group) AS grp_ride_group_id,
                MAX(gm.mr_departure_earliest) AS grp_interval_start,
                MIN(gm.mr_departure_latest) AS grp_interval_end,
                GREATEST(
                    0,
                    EXTRACT(EPOCH FROM (
                        MIN(gm.mr_departure_latest) - MAX(gm.mr_departure_earliest)
                    ))::INTEGER / 60
                ) AS grp_interval_minutes,
                AVG(gm.mr_origin_lat) AS grp_origin_centroid_lat,
                AVG(gm.mr_origin_lng) AS grp_origin_centroid_lng,
                COALESCE(SUM(gm.mr_seats_needed), 0) AS grp_total_seats,
                COUNT(*)::INTEGER AS grp_total_members,
                COALESCE(SUM(
                    CASE gm.mr_space_capacity
                        WHEN 0 THEN 0
                        WHEN 1 THEN 1
                        WHEN 2 THEN 2
                        ELSE 0
                    END
                ), 0)::INTEGER AS grp_total_bags,
                BOOL_OR(gm.mr_space_capacity = 3) AS grp_has_oversized,
                BOOL_OR(gm.mr_gender_pref <> 'any') AS grp_gender_hard_blocks,
                AVG(
                    CASE
                        WHEN cb.cb_music_ok = gm.mr_music_ok THEN 1.0
                        ELSE 0.5
                    END
                )::DECIMAL AS grp_music_compatible_ratio,
                AVG(
                    CASE
                        WHEN gm.mr_conversation_pref IS NULL OR gm.mr_conversation_pref = 'either' THEN 1.0
                        WHEN v_my_profile.conversation_pref IS NULL OR v_my_profile.conversation_pref = 'either' THEN 1.0
                        WHEN gm.mr_conversation_pref = v_my_profile.conversation_pref THEN 1.0
                        ELSE 0.0
                    END
                )::DECIMAL AS grp_vibe_compatible_ratio,
                MAX(COALESCE(gm.mr_departure_preferred, gm.mr_departure_earliest))::DATE AS grp_effective_date,
                jsonb_agg(
                    jsonb_build_object(
                        'ride_id', gm.mr_id,
                        'user_id', gm.mr_user_id,
                        'first_name', gm.mr_first_name,
                        'last_name', gm.mr_last_name,
                        'photo_url', gm.mr_photo_url,
                        'school', gm.mr_school,
                        'origin_name', gm.mr_origin_name,
                        'dest_name', gm.mr_dest_name,
                        'departure_earliest', gm.mr_departure_earliest,
                        'departure_latest', gm.mr_departure_latest,
                        'departure_preferred', gm.mr_departure_preferred,
                        'seats_needed', gm.mr_seats_needed,
                        'space_capacity', gm.mr_space_capacity,
                        'gender_pref', gm.mr_gender_pref,
                        'quiet_ride', gm.mr_quiet_ride,
                        'music_ok', gm.mr_music_ok
                    )
                    ORDER BY gm.mr_departure_preferred NULLS LAST, gm.mr_departure_earliest
                ) AS grp_members_json
            FROM grp_members gm
        ) AS gs
    ),
    compatible AS (
        SELECT
            cg.cg_id,
            cg.cg_user_id,
            cg.cg_ride_type,
            cg.cg_origin_lat,
            cg.cg_origin_lng,
            cg.cg_origin_name,
            cg.cg_dest_lat,
            cg.cg_dest_lng,
            cg.cg_dest_name,
            cg.cg_departure_earliest,
            cg.cg_departure_latest,
            cg.cg_departure_preferred,
            cg.cg_seats_needed,
            cg.cg_space_capacity,
            cg.cg_gender_pref,
            cg.cg_quiet_ride,
            cg.cg_music_ok,
            cg.cg_notes,
            cg.cg_first_name,
            cg.cg_last_name,
            cg.cg_photo_url,
            cg.cg_bio,
            cg.cg_school,
            cg.cg_conversation_pref,
            cg.cb_host_ride_id,
            cg.grp_ride_group_id,
            cg.grp_interval_start,
            cg.grp_interval_end,
            cg.grp_interval_minutes,
            cg.grp_origin_centroid_lat,
            cg.grp_origin_centroid_lng,
            cg.grp_total_seats,
            cg.grp_total_members,
            cg.grp_total_bags,
            cg.grp_has_oversized,
            cg.grp_gender_hard_blocks,
            cg.grp_music_compatible_ratio,
            cg.grp_vibe_compatible_ratio,
            cg.grp_members_json,
            cg.cg_effective_date,
            haversine_miles(
                v_my_origin_centroid_lat, v_my_origin_centroid_lng,
                cg.grp_origin_centroid_lat, cg.grp_origin_centroid_lng
            ) AS d_origin,
            haversine_miles(
                v_my.dest_lat, v_my.dest_lng,
                cg.cg_dest_lat, cg.cg_dest_lng
            ) AS d_destination,
            GREATEST(
                0,
                EXTRACT(EPOCH FROM (
                    LEAST(v_my_interval_end, cg.cg_departure_latest)
                    - GREATEST(v_my_interval_start, cg.cg_departure_earliest)
                ))::INTEGER / 60
            ) AS overlap_minutes_calc,
            CASE
                WHEN LEAST(v_my_interval_end, cg.cg_departure_latest)
                     > GREATEST(v_my_interval_start, cg.cg_departure_earliest) THEN 0
                ELSE GREATEST(
                    0,
                    EXTRACT(EPOCH FROM (
                        GREATEST(v_my_interval_start, cg.cg_departure_earliest)
                        - LEAST(v_my_interval_end, cg.cg_departure_latest)
                    ))::INTEGER / 60
                )
            END AS gap_minutes_calc
        FROM candidate_grouped cg
        WHERE cg.cg_effective_date = v_my_date
          AND cg.grp_total_seats + v_my_total_seats <= 6
          AND haversine_miles(v_my.dest_lat, v_my.dest_lng, cg.cg_dest_lat, cg.cg_dest_lng) <= 2.0
          AND haversine_miles(
                v_my_origin_centroid_lat, v_my_origin_centroid_lng,
                cg.grp_origin_centroid_lat, cg.grp_origin_centroid_lng
              ) <= 2.0
    ),
    tiered AS (
        SELECT
            co.*,
            CASE
                WHEN co.overlap_minutes_calc >= 60 THEN 'STRONG'
                WHEN co.overlap_minutes_calc >= 30 THEN 'OKAY'
                WHEN co.overlap_minutes_calc >= 1 THEN 'WEAK'
                WHEN co.gap_minutes_calc <= 240
                     AND LEAST(v_my_interval_minutes, GREATEST(0, EXTRACT(EPOCH FROM (co.cg_departure_latest - co.cg_departure_earliest))::INTEGER / 60)) < 30 THEN 'WEAK'
                WHEN co.gap_minutes_calc <= 60 THEN 'BORDERLINE'
                WHEN co.gap_minutes_calc <= 240 THEN 'LAST_RESORT'
                ELSE NULL
            END AS computed_time_tier,
            CASE
                WHEN co.d_origin <= 0.5 THEN 'CLOSE'
                WHEN co.d_origin <= 1.0 THEN 'NEAR'
                ELSE 'OKAY'
            END AS computed_origin_tier,
            CASE
                WHEN co.d_destination <= 0.5 THEN 'SAME_AREA'
                WHEN co.d_destination <= 1.0 THEN 'VERY_CLOSE'
                ELSE 'NEARBY'
            END AS computed_destination_tier,
            CASE
                WHEN co.grp_total_bags
                     + CASE co.cg_space_capacity WHEN 1 THEN 1 WHEN 2 THEN 2 ELSE 0 END >= 4
                  OR co.grp_has_oversized
                  OR co.cg_space_capacity = 3
                THEN TRUE
                ELSE FALSE
            END AS computed_needs_xl,
            GREATEST(0, 6 - (co.grp_total_seats + v_my_total_seats))
                AS computed_seats_remaining,
            CASE
                WHEN (6 - co.grp_total_seats) <= 0 THEN 1.0::DECIMAL
                ELSE ROUND(
                    (v_my.seats_needed::DECIMAL / GREATEST(6 - co.grp_total_seats, 1)), 3
                )
            END AS computed_fill_efficiency,
            CASE
                WHEN co.grp_gender_hard_blocks THEN FALSE
                ELSE TRUE
            END AS computed_gender_compatible,
            ROUND(
                ((COALESCE(co.grp_music_compatible_ratio, 0.5)
                  + COALESCE(co.grp_vibe_compatible_ratio, 0.5)) / 2.0)::NUMERIC, 3
            )::DECIMAL AS computed_pref_overall
        FROM compatible co
        WHERE co.overlap_minutes_calc > 0
           OR co.gap_minutes_calc <= 240
    )
    SELECT
        COALESCE(t.grp_ride_group_id, t.cb_host_ride_id) AS candidate_id,
        CASE WHEN t.grp_total_members > 1 THEN 'group' ELSE 'solo' END AS candidate_type,
        t.cb_host_ride_id AS request_target_ride_id,
        t.grp_ride_group_id AS ride_group_id,
        t.cg_id AS ride_id,
        t.cg_user_id AS user_id,
        t.cg_ride_type AS ride_type,
        t.cg_origin_name AS origin_name,
        t.cg_dest_name AS dest_name,
        t.cg_departure_earliest AS departure_earliest,
        t.cg_departure_latest AS departure_latest,
        t.cg_departure_preferred AS departure_preferred,
        t.cg_seats_needed AS seats_needed,
        t.cg_space_capacity AS space_capacity,
        t.cg_gender_pref AS gender_pref,
        t.cg_quiet_ride AS quiet_ride,
        t.cg_music_ok AS music_ok,
        t.cg_notes AS notes,
        t.cg_first_name AS first_name,
        t.cg_last_name AS last_name,
        t.cg_photo_url AS photo_url,
        t.cg_bio AS bio,
        t.cg_school AS school,
        t.computed_time_tier AS time_tier,
        t.overlap_minutes_calc AS overlap_minutes,
        t.gap_minutes_calc AS gap_minutes,
        ROUND(t.d_origin::NUMERIC, 2)::DECIMAL AS d_origin_miles,
        t.computed_origin_tier AS d_origin_tier,
        ROUND(t.d_destination::NUMERIC, 2)::DECIMAL AS d_destination_miles,
        t.computed_destination_tier AS d_destination_tier,
        t.computed_needs_xl AS needs_xl,
        CASE WHEN t.computed_needs_xl THEN 'This group may need Uber XL' ELSE NULL END
            AS xl_flag_message,
        t.computed_seats_remaining AS seats_remaining_after_join,
        t.computed_fill_efficiency AS fill_efficiency,
        t.computed_gender_compatible AS gender_compatible,
        t.computed_pref_overall AS pref_overall,
        t.grp_total_members AS group_size_before_join,
        t.grp_total_members + 1 AS group_size_after_join,
        t.grp_members_json AS members,
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

ALTER FUNCTION public.find_matches_v3(UUID, INTEGER, INTEGER) SET row_security TO off;
GRANT EXECUTE ON FUNCTION find_matches_v3(UUID, INTEGER, INTEGER) TO authenticated;
