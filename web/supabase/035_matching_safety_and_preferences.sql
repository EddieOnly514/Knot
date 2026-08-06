-- =============================================
-- 035_matching_safety_and_preferences.sql
-- Tighten the matcher without rewriting migration history:
-- - authorize match searches at the database boundary
-- - enforce same-day, future-time, and blocked-user guards
-- - align gender preferences with Any / Same gender
-- - keep acceptance validation consistent with discovery
-- =============================================

SET search_path = public;

ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS gender_identity TEXT;

ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS profiles_gender_identity_check;
ALTER TABLE profiles
    ADD CONSTRAINT profiles_gender_identity_check
    CHECK (
        gender_identity IS NULL
        OR gender_identity IN ('woman', 'man', 'nonbinary', 'prefer_not_to_say')
    );

-- Legacy values described a requested gender, not the rider's identity. Keep
-- those users eligible and let them choose the new safer preference explicitly.
UPDATE profiles
SET gender_preference = 'any'
WHERE gender_preference IS NULL
   OR gender_preference NOT IN ('any', 'same_only');

ALTER TABLE profiles
    DROP CONSTRAINT IF EXISTS profiles_gender_preference_check;
ALTER TABLE profiles
    ADD CONSTRAINT profiles_gender_preference_check
    CHECK (gender_preference IN ('any', 'same_only'));

UPDATE rides
SET gender_pref = 'any',
    updated_at = NOW()
WHERE gender_pref IS NULL
   OR gender_pref NOT IN ('any', 'same_only');

ALTER TABLE rides
    DROP CONSTRAINT IF EXISTS rides_gender_pref_check;
ALTER TABLE rides
    ADD CONSTRAINT rides_gender_pref_check
    CHECK (gender_pref IN ('any', 'same_only'));

-- Acceptance is revalidated because a candidate or group may have changed
-- after it was first shown in Suggested Matches.
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
       OR v_candidate.ride_type <> 'seeking'
       OR v_anchor.departure_latest < NOW()
       OR v_candidate.departure_latest < NOW() THEN
        RETURN FALSE;
    END IF;

    IF COALESCE(v_anchor.departure_preferred, v_anchor.departure_earliest)::DATE
       IS DISTINCT FROM
       COALESCE(v_candidate.departure_preferred, v_candidate.departure_earliest)::DATE THEN
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

    -- A profile cannot join the same group through a second ride post.
    IF EXISTS (
        SELECT 1
        FROM ride_group_members anchor_membership
        JOIN ride_groups rg
          ON rg.id = anchor_membership.ride_group_id
         AND rg.status = 'active'
        JOIN ride_group_members member
          ON member.ride_group_id = rg.id
         AND member.left_at IS NULL
        JOIN rides r ON r.id = member.ride_id
        WHERE anchor_membership.ride_id = p_anchor_ride_id
          AND anchor_membership.left_at IS NULL
          AND r.user_id = v_candidate.user_id
    ) THEN
        RETURN FALSE;
    END IF;

    -- A block in either direction prevents discovery and joining.
    IF EXISTS (
        WITH existing_profiles AS (
            SELECT v_anchor.user_id AS profile_id
            UNION
            SELECT r.user_id
            FROM ride_group_members anchor_membership
            JOIN ride_groups rg
              ON rg.id = anchor_membership.ride_group_id
             AND rg.status = 'active'
            JOIN ride_group_members member
              ON member.ride_group_id = rg.id
             AND member.left_at IS NULL
            JOIN rides r ON r.id = member.ride_id
            WHERE anchor_membership.ride_id = p_anchor_ride_id
              AND anchor_membership.left_at IS NULL
        )
        SELECT 1
        FROM existing_profiles ep
        JOIN blocked_users bu
          ON (
              bu.blocker_profile_id = ep.profile_id
              AND bu.blocked_profile_id = v_candidate.user_id
          )
          OR (
              bu.blocker_profile_id = v_candidate.user_id
              AND bu.blocked_profile_id = ep.profile_id
          )
        LIMIT 1
    ) THEN
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

-- V4 wraps the established group-aware matcher, then applies caller-sensitive
-- safety filters and preference calculations that require profile data.
DROP FUNCTION IF EXISTS find_matches_v4(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS find_matches_v4(UUID, INTEGER);
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    WITH selected_ride AS (
        SELECT
            r.*,
            p.gender_identity,
            p.gender_preference,
            p.music_pref,
            p.conversation_pref,
            COALESCE(r.departure_preferred, r.departure_earliest)::DATE AS ride_date
        FROM rides r
        JOIN profiles p ON p.id = r.user_id
        WHERE r.id = p_ride_id
          AND r.status = 'active'
          AND r.ride_type = 'seeking'
          AND r.departure_latest >= NOW()
          AND (
              p.user_id = auth.uid()
              OR auth.role() = 'service_role'
          )
    ),
    my_group AS (
        SELECT rgm.ride_group_id
        FROM ride_group_members rgm
        JOIN ride_groups rg ON rg.id = rgm.ride_group_id
        WHERE rgm.ride_id = p_ride_id
          AND rgm.left_at IS NULL
          AND rg.status = 'active'
        LIMIT 1
    ),
    my_party AS (
        SELECT
            r.id AS member_ride_id,
            r.user_id AS profile_id,
            r.gender_pref,
            r.departure_latest,
            COALESCE(r.departure_preferred, r.departure_earliest)::DATE AS ride_date,
            p.gender_identity,
            p.music_pref,
            p.conversation_pref
        FROM rides r
        JOIN profiles p ON p.id = r.user_id
        WHERE r.id = p_ride_id
          AND NOT EXISTS (SELECT 1 FROM my_group)

        UNION ALL

        SELECT
            r.id,
            r.user_id,
            r.gender_pref,
            r.departure_latest,
            COALESCE(r.departure_preferred, r.departure_earliest)::DATE,
            p.gender_identity,
            p.music_pref,
            p.conversation_pref
        FROM my_group mg
        JOIN ride_group_members rgm
          ON rgm.ride_group_id = mg.ride_group_id
         AND rgm.left_at IS NULL
        JOIN rides r ON r.id = rgm.ride_id
        JOIN profiles p ON p.id = r.user_id
        WHERE r.status = 'active'
    ),
    raw_matches AS (
        SELECT *
        FROM find_matches_v3(
            p_ride_id,
            GREATEST(COALESCE(p_max_results, 10) * 5, 50),
            0
        )
    ),
    candidate_party AS (
        SELECT
            rm.candidate_id,
            (member->>'ride_id')::UUID AS member_ride_id,
            (member->>'user_id')::UUID AS profile_id,
            COALESCE(member->>'gender_pref', 'any') AS gender_pref,
            (member->>'departure_latest')::TIMESTAMPTZ AS departure_latest,
            COALESCE(
                NULLIF(member->>'departure_preferred', '')::TIMESTAMPTZ,
                (member->>'departure_earliest')::TIMESTAMPTZ
            )::DATE AS ride_date,
            p.gender_identity,
            p.music_pref,
            p.conversation_pref
        FROM raw_matches rm
        CROSS JOIN LATERAL jsonb_array_elements(rm.members) AS member
        JOIN profiles p ON p.id = (member->>'user_id')::UUID
    ),
    compatibility AS (
        SELECT
            cp.candidate_id,
            BOOL_AND(
                (
                    mp.gender_pref <> 'same_only'
                    OR (
                        mp.gender_identity IS NOT NULL
                        AND mp.gender_identity <> 'prefer_not_to_say'
                        AND cp.gender_identity = mp.gender_identity
                    )
                )
                AND
                (
                    cp.gender_pref <> 'same_only'
                    OR (
                        cp.gender_identity IS NOT NULL
                        AND cp.gender_identity <> 'prefer_not_to_say'
                        AND mp.gender_identity = cp.gender_identity
                    )
                )
            ) AS gender_ok,
            AVG(
                CASE
                    WHEN mp.music_pref IS NULL
                      OR cp.music_pref IS NULL
                      OR mp.music_pref = 'no_preference'
                      OR cp.music_pref = 'no_preference'
                      OR mp.music_pref = cp.music_pref THEN 1.0
                    ELSE 0.0
                END
            ) AS music_ratio,
            AVG(
                CASE
                    WHEN mp.conversation_pref IS NULL
                      OR cp.conversation_pref IS NULL
                      OR mp.conversation_pref = 'chill'
                      OR cp.conversation_pref = 'chill'
                      OR mp.conversation_pref = cp.conversation_pref THEN 1.0
                    ELSE 0.0
                END
            ) AS vibe_ratio
        FROM my_party mp
        CROSS JOIN candidate_party cp
        GROUP BY cp.candidate_id
    ),
    safe_matches AS (
        SELECT
            rm.*,
            COALESCE(c.gender_ok, TRUE) AS safe_gender_compatible,
            ROUND(((COALESCE(c.music_ratio, 0.5) + COALESCE(c.vibe_ratio, 0.5)) / 2.0)::NUMERIC, 3)::DECIMAL
                AS safe_pref_overall
        FROM raw_matches rm
        JOIN compatibility c ON c.candidate_id = rm.candidate_id
        CROSS JOIN selected_ride sr
        WHERE NOT EXISTS (
            SELECT 1
            FROM my_party mp
            WHERE mp.departure_latest < NOW()
               OR mp.ride_date IS DISTINCT FROM sr.ride_date
        )
          AND NOT EXISTS (
              SELECT 1
              FROM candidate_party cp
              WHERE cp.candidate_id = rm.candidate_id
                AND (
                    cp.departure_latest < NOW()
                    OR cp.ride_date IS DISTINCT FROM sr.ride_date
                )
          )
          AND NOT EXISTS (
              SELECT 1
              FROM my_party mp
              JOIN candidate_party cp
                ON cp.candidate_id = rm.candidate_id
               AND cp.profile_id = mp.profile_id
          )
          AND NOT EXISTS (
              SELECT 1
              FROM my_party mp
              JOIN candidate_party cp ON cp.candidate_id = rm.candidate_id
              JOIN blocked_users bu
                ON (
                    bu.blocker_profile_id = mp.profile_id
                    AND bu.blocked_profile_id = cp.profile_id
                )
                OR (
                    bu.blocker_profile_id = cp.profile_id
                    AND bu.blocked_profile_id = mp.profile_id
                )
          )
    ),
    visible_matches AS (
        SELECT sm.*
        FROM safe_matches sm
        WHERE sm.time_tier <> 'LAST_RESORT'
           OR NOT EXISTS (
               SELECT 1
               FROM safe_matches better
               WHERE better.time_tier <> 'LAST_RESORT'
           )
    )
    SELECT
        vm.candidate_id,
        vm.candidate_type,
        vm.request_target_ride_id,
        vm.ride_group_id,
        vm.ride_id,
        vm.user_id,
        vm.ride_type,
        vm.origin_name,
        vm.dest_name,
        vm.departure_earliest,
        vm.departure_latest,
        vm.departure_preferred,
        vm.seats_needed,
        vm.space_capacity,
        vm.gender_pref,
        vm.quiet_ride,
        vm.music_ok,
        vm.notes,
        vm.first_name,
        vm.last_name,
        vm.photo_url,
        vm.bio,
        vm.school,
        vm.time_tier,
        vm.overlap_minutes,
        vm.gap_minutes,
        vm.d_origin_miles,
        vm.d_origin_tier,
        vm.d_destination_miles,
        vm.d_destination_tier,
        vm.needs_xl,
        vm.xl_flag_message,
        vm.seats_remaining_after_join,
        vm.fill_efficiency,
        vm.safe_gender_compatible,
        vm.safe_pref_overall,
        vm.group_size_before_join,
        vm.group_size_after_join,
        vm.members,
        vm.match_label,
        vm.match_explanation
    FROM visible_matches vm
    ORDER BY
        CASE vm.time_tier
            WHEN 'STRONG' THEN 1
            WHEN 'OKAY' THEN 2
            WHEN 'WEAK' THEN 3
            WHEN 'BORDERLINE' THEN 4
            ELSE 5
        END,
        GREATEST(
            CASE vm.d_origin_tier WHEN 'CLOSE' THEN 1 WHEN 'NEAR' THEN 2 ELSE 3 END,
            CASE vm.d_destination_tier WHEN 'SAME_AREA' THEN 1 WHEN 'VERY_CLOSE' THEN 2 ELSE 3 END
        ),
        CASE WHEN vm.safe_gender_compatible THEN 0 ELSE 1 END,
        vm.safe_pref_overall DESC,
        vm.d_destination_miles,
        vm.d_origin_miles
    LIMIT GREATEST(COALESCE(p_max_results, 10), 0);
$$;

-- V3 remains callable only by trusted database code so arbitrary ride UUIDs
-- cannot be used to bypass ownership checks.
REVOKE EXECUTE ON FUNCTION ride_fits_group_core(UUID, TIMESTAMPTZ, TIMESTAMPTZ, DECIMAL, DECIMAL, INTEGER, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION find_matches_v3(UUID, INTEGER, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION find_matches_v3(UUID, INTEGER, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION find_matches_v4(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION find_matches_v4(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION find_matches_v4(UUID, INTEGER) TO service_role;
