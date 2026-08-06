-- =============================================
-- 040_matcher_safety_before_ranking.sql
-- Ensure blocked, expired, and different-date candidates are removed before
-- time-tier suppression and result limiting.
-- =============================================

SET search_path = public;

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
          AND r.departure_latest >= NOW()
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
          -- Apply safety filters before tier suppression and LIMIT. Otherwise a
          -- blocked, expired, or different-date candidate can hide an eligible
          -- LAST_RESORT match and consume the candidate window used by V4.
          AND NOT EXISTS (
              SELECT 1
              FROM my_member_rides my_member
              WHERE my_member.departure_latest < NOW()
                 OR COALESCE(
                        my_member.departure_preferred,
                        my_member.departure_earliest
                    )::DATE IS DISTINCT FROM
                    COALESCE(mr.departure_preferred, mr.departure_earliest)::DATE
          )
          AND NOT EXISTS (
              SELECT 1
              FROM candidate_members cm
              WHERE cm.host_ride_id = ch.host_ride_id
                AND cm.group_id IS NOT DISTINCT FROM ch.group_id
                AND (
                    cm.departure_latest < NOW()
                    OR COALESCE(
                           cm.departure_preferred,
                           cm.departure_earliest
                       )::DATE IS DISTINCT FROM
                       COALESCE(mr.departure_preferred, mr.departure_earliest)::DATE
                )
          )
          AND NOT EXISTS (
              SELECT 1
              FROM my_member_rides my_member
              JOIN candidate_members cm
                ON cm.host_ride_id = ch.host_ride_id
               AND cm.group_id IS NOT DISTINCT FROM ch.group_id
              JOIN blocked_users bu
                ON (
                    bu.blocker_profile_id = my_member.user_id
                    AND bu.blocked_profile_id = cm.user_id
                )
                OR (
                    bu.blocker_profile_id = cm.user_id
                    AND bu.blocked_profile_id = my_member.user_id
                )
          )
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
        CASE
            WHEN v.group_interval_start <= v.group_interval_end
                THEN v.group_interval_start
            ELSE v.group_interval_start - INTERVAL '2 hours'
        END AS departure_earliest,
        CASE
            WHEN v.group_interval_start <= v.group_interval_end
                THEN v.group_interval_end
            ELSE v.group_interval_end + INTERVAL '2 hours'
        END AS departure_latest,
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


REVOKE ALL ON FUNCTION find_matches_v3(UUID, INTEGER, INTEGER)
    FROM PUBLIC, anon, authenticated;
