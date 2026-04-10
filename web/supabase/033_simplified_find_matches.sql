-- =============================================
-- 033_simplified_find_matches.sql
-- Rewrite find_matches_v3 with a flat CTE structure.
-- Uses pre-computed ride_groups columns (from 027 triggers) instead of
-- nested CTEs inside CROSS JOIN LATERAL.
-- Adds #variable_conflict use_column to eliminate PL/pgSQL scoping bugs.
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
#variable_conflict use_column
DECLARE
    v_my          rides%ROWTYPE;
    v_my_profile  profiles%ROWTYPE;
    v_anchor_grp  UUID;
    v_host_id     UUID;
    v_dep_start   TIMESTAMPTZ;
    v_dep_end     TIMESTAMPTZ;
    v_dep_min     INTEGER;
    v_cent_lat    DECIMAL;
    v_cent_lng    DECIMAL;
    v_seats       INTEGER;
    v_date        DATE;
BEGIN
    -- ── 1. Load anchor ride & profile ──────────────────────────────────
    SELECT * INTO v_my FROM rides WHERE id = p_ride_id;
    IF v_my IS NULL THEN
        RAISE EXCEPTION 'Ride not found: %', p_ride_id;
    END IF;

    SELECT * INTO v_my_profile FROM profiles WHERE id = v_my.user_id;

    IF v_my.ride_type IS DISTINCT FROM 'seeking' THEN
        RETURN;
    END IF;

    -- ── 2. Anchor group stats (procedural – no CTEs needed) ───────────
    SELECT rg.id, rg.ride_id,
           rg.effective_departure_earliest, rg.effective_departure_latest,
           rg.effective_date,
           rg.origin_centroid_lat, rg.origin_centroid_lng
    INTO v_anchor_grp, v_host_id,
         v_dep_start, v_dep_end, v_date,
         v_cent_lat, v_cent_lng
    FROM ride_group_members rgm
    JOIN ride_groups rg ON rg.id = rgm.ride_group_id
    WHERE rgm.ride_id = v_my.id AND rgm.left_at IS NULL
    LIMIT 1;

    -- Always use the ride's OWN time window for matching (not the
    -- narrowed group intersection which hides valid candidates).
    v_dep_start := v_my.departure_earliest;
    v_dep_end   := v_my.departure_latest;
    v_date      := COALESCE(v_my.departure_preferred, v_my.departure_earliest)::DATE;

    IF v_anchor_grp IS NOT NULL THEN
        SELECT COALESCE(SUM(r.seats_needed), 0)
        INTO v_seats
        FROM ride_group_members m
        JOIN rides r ON r.id = m.ride_id
        WHERE m.ride_group_id = v_anchor_grp AND m.left_at IS NULL;
    ELSE
        v_host_id   := v_my.id;
        v_cent_lat  := v_my.origin_lat;
        v_cent_lng  := v_my.origin_lng;
        v_seats     := COALESCE(v_my.seats_needed, 1);
    END IF;

    v_dep_min := GREATEST(0,
        EXTRACT(EPOCH FROM (v_dep_end - v_dep_start))::INTEGER / 60);

    -- ── 3. Find, score, and return matches ─────────────────────────────
    RETURN QUERY

    WITH base AS (
        SELECT r.id   AS b_rid,
               COALESCE(rg.ride_id, r.id) AS b_host,
               rg.id  AS b_grp
        FROM rides r
        LEFT JOIN ride_group_members rgm
            ON rgm.ride_id = r.id AND rgm.left_at IS NULL
        LEFT JOIN ride_groups rg
            ON rg.id = rgm.ride_group_id
        WHERE r.id        <> p_ride_id
          AND r.user_id   <> v_my.user_id
          AND r.ride_type  = 'seeking'
          AND r.status    <> 'cancelled'
          AND NOT EXISTS (
              SELECT 1 FROM ride_requests rr
              WHERE (  (rr.ride_id = p_ride_id AND rr.requester_ride_id = r.id)
                    OR (rr.ride_id = r.id      AND rr.requester_ride_id = p_ride_id))
                AND (rr.status IN ('accepted', 'rejected', 'withdrawn')
                     OR rr.created_at > NOW() - INTERVAL '7 days')
          )
    ),

    cand AS (
        SELECT DISTINCT ON (b.b_host)
            b.b_host,
            b.b_grp,
            h.id              AS c_id,
            h.user_id         AS c_uid,
            h.ride_type       AS c_rtype,
            h.origin_name     AS c_oname,
            h.dest_name       AS c_dname,
            h.dest_lat        AS c_dlat,
            h.dest_lng        AS c_dlng,
            h.departure_earliest  AS c_dep_e,
            h.departure_latest    AS c_dep_l,
            h.departure_preferred AS c_dep_p,
            h.seats_needed    AS c_seats,
            h.space_capacity  AS c_space,
            h.gender_pref     AS c_gpref,
            h.quiet_ride      AS c_quiet,
            h.music_ok        AS c_music,
            h.notes           AS c_notes,
            hp.first_name     AS c_fname,
            hp.last_name      AS c_lname,
            hp.photo_url      AS c_photo,
            hp.bio            AS c_bio,
            hp.school         AS c_school,
            hp.conversation_pref AS c_convpref,

            h.departure_earliest AS c_g_start,
            h.departure_latest   AS c_g_end,
            COALESCE(h.departure_preferred, h.departure_earliest)::DATE AS c_g_date,
            COALESCE(grp.origin_centroid_lat, h.origin_lat) AS c_g_lat,
            COALESCE(grp.origin_centroid_lng, h.origin_lng) AS c_g_lng,
            COALESCE(grp.rider_count, 1)::INTEGER           AS c_g_size,
            COALESCE(grp.total_bags,
                     luggage_units_from_space_capacity(h.space_capacity)) AS c_g_bags,
            COALESCE(grp.has_oversized, h.space_capacity = 3) AS c_g_over,
            GREATEST(0,
                EXTRACT(EPOCH FROM (
                    h.departure_latest - h.departure_earliest
                ))::INTEGER / 60
            ) AS c_g_dep_min,

            CASE WHEN b.b_grp IS NOT NULL THEN
                (SELECT COALESCE(SUM(r2.seats_needed), 0)::INTEGER
                 FROM ride_group_members m2
                 JOIN rides r2 ON r2.id = m2.ride_id
                 WHERE m2.ride_group_id = b.b_grp AND m2.left_at IS NULL)
            ELSE COALESCE(h.seats_needed, 1)
            END AS c_g_seats,

            CASE WHEN b.b_grp IS NOT NULL THEN
                COALESCE((SELECT BOOL_OR(r2.gender_pref <> 'any')
                 FROM ride_group_members m2
                 JOIN rides r2 ON r2.id = m2.ride_id
                 WHERE m2.ride_group_id = b.b_grp AND m2.left_at IS NULL), FALSE)
            ELSE (h.gender_pref <> 'any')
            END AS c_g_gender_block

        FROM base b
        JOIN rides    h   ON h.id  = b.b_host
        JOIN profiles hp  ON hp.id = h.user_id
        LEFT JOIN ride_groups grp ON grp.id = b.b_grp
        ORDER BY b.b_host
    ),

    scored AS (
        SELECT c.*,
            haversine_miles(v_cent_lat, v_cent_lng,
                            c.c_g_lat, c.c_g_lng)    AS c_d_ori,
            haversine_miles(v_my.dest_lat, v_my.dest_lng,
                            c.c_dlat, c.c_dlng)       AS c_d_dst,
            GREATEST(0,
                EXTRACT(EPOCH FROM (
                    LEAST(v_dep_end, c.c_g_end)
                  - GREATEST(v_dep_start, c.c_g_start)
                ))::INTEGER / 60
            ) AS c_overlap,
            CASE
                WHEN LEAST(v_dep_end, c.c_g_end)
                   > GREATEST(v_dep_start, c.c_g_start) THEN 0
                ELSE GREATEST(0,
                    EXTRACT(EPOCH FROM (
                        GREATEST(v_dep_start, c.c_g_start)
                      - LEAST(v_dep_end, c.c_g_end)
                    ))::INTEGER / 60)
            END AS c_gap
        FROM cand c
        WHERE c.c_g_date = v_date
          AND c.c_g_seats + v_seats <= 6
          AND haversine_miles(v_my.dest_lat, v_my.dest_lng,
                              c.c_dlat, c.c_dlng) <= 2.0
          AND haversine_miles(v_cent_lat, v_cent_lng,
                              c.c_g_lat, c.c_g_lng) <= 2.0
    ),

    tiered AS (
        SELECT s.*,
            CASE
                -- Any overlap + both distances within 1 mi → Great
                WHEN s.c_overlap >= 1 AND s.c_d_ori <= 1.0 AND s.c_d_dst <= 1.0
                    THEN 'STRONG'
                -- Any overlap + at least one distance within 1 mi → Okay
                WHEN s.c_overlap >= 1 AND (s.c_d_ori <= 1.0 OR s.c_d_dst <= 1.0)
                    THEN 'OKAY'
                -- Any overlap but farther apart → Possible
                WHEN s.c_overlap >= 1
                    THEN 'WEAK'
                -- No overlap but within 2 hr per party (4 hr total gap) → Possible
                WHEN s.c_gap <= 240
                    THEN 'WEAK'
                ELSE NULL
            END AS c_tier,
            CASE
                WHEN s.c_d_ori <= 0.5 THEN 'CLOSE'
                WHEN s.c_d_ori <= 1.0 THEN 'NEAR'
                ELSE 'OKAY'
            END AS c_otier,
            CASE
                WHEN s.c_d_dst <= 0.5 THEN 'SAME_AREA'
                WHEN s.c_d_dst <= 1.0 THEN 'VERY_CLOSE'
                ELSE 'NEARBY'
            END AS c_dtier,
            (s.c_g_bags
                + CASE s.c_space WHEN 1 THEN 1 WHEN 2 THEN 2 ELSE 0 END >= 4
             OR s.c_g_over
             OR s.c_space = 3) AS c_xl,
            GREATEST(0, 6 - (s.c_g_seats + v_seats)) AS c_seats_rem,
            CASE
                WHEN (6 - s.c_g_seats) <= 0 THEN 1.0::DECIMAL
                ELSE ROUND(v_my.seats_needed::DECIMAL
                           / GREATEST(6 - s.c_g_seats, 1), 3)
            END AS c_fill,
            (NOT s.c_g_gender_block) AS c_gender_ok,
            ROUND(
                ((CASE WHEN v_my.music_ok = s.c_music THEN 1.0 ELSE 0.5 END
                  + CASE
                      WHEN s.c_convpref IS NULL OR s.c_convpref = 'either' THEN 1.0
                      WHEN v_my_profile.conversation_pref IS NULL OR v_my_profile.conversation_pref = 'either' THEN 1.0
                      WHEN s.c_convpref = v_my_profile.conversation_pref THEN 1.0
                      ELSE 0.0
                    END
                ) / 2.0)::NUMERIC, 3
            )::DECIMAL AS c_pref
        FROM scored s
        WHERE s.c_overlap > 0 OR s.c_gap <= 240
    )

    SELECT
        COALESCE(t.b_grp, t.b_host),
        CASE WHEN t.c_g_size > 1 THEN 'group' ELSE 'solo' END,
        t.b_host,
        t.b_grp,
        t.c_id,
        t.c_uid,
        t.c_rtype,
        t.c_oname,
        t.c_dname,
        t.c_dep_e,
        t.c_dep_l,
        t.c_dep_p,
        t.c_seats,
        t.c_space,
        t.c_gpref,
        t.c_quiet,
        t.c_music,
        t.c_notes,
        t.c_fname,
        t.c_lname,
        t.c_photo,
        t.c_bio,
        t.c_school,
        t.c_tier,
        t.c_overlap,
        t.c_gap,
        ROUND(t.c_d_ori::NUMERIC, 2)::DECIMAL,
        t.c_otier,
        ROUND(t.c_d_dst::NUMERIC, 2)::DECIMAL,
        t.c_dtier,
        t.c_xl,
        CASE WHEN t.c_xl THEN 'This group may need Uber XL' ELSE NULL END,
        t.c_seats_rem,
        t.c_fill,
        t.c_gender_ok,
        t.c_pref,
        t.c_g_size,
        t.c_g_size + 1,
        -- members JSON
        CASE WHEN t.b_grp IS NOT NULL THEN
            (SELECT jsonb_agg(jsonb_build_object(
                'ride_id',    mr.id,
                'user_id',    mr.user_id,
                'first_name', mp.first_name,
                'last_name',  mp.last_name,
                'photo_url',  mp.photo_url,
                'school',     mp.school,
                'origin_name',       mr.origin_name,
                'dest_name',         mr.dest_name,
                'departure_earliest',  mr.departure_earliest,
                'departure_latest',    mr.departure_latest,
                'departure_preferred', mr.departure_preferred,
                'seats_needed',   mr.seats_needed,
                'space_capacity', mr.space_capacity,
                'gender_pref',    mr.gender_pref,
                'quiet_ride',     mr.quiet_ride,
                'music_ok',       mr.music_ok
            ) ORDER BY mr.departure_preferred NULLS LAST, mr.departure_earliest)
            FROM ride_group_members mgm
            JOIN rides    mr ON mr.id = mgm.ride_id
            JOIN profiles mp ON mp.id = mr.user_id
            WHERE mgm.ride_group_id = t.b_grp AND mgm.left_at IS NULL)
        ELSE
            jsonb_build_array(jsonb_build_object(
                'ride_id',    t.c_id,
                'user_id',    t.c_uid,
                'first_name', t.c_fname,
                'last_name',  t.c_lname,
                'photo_url',  t.c_photo,
                'school',     t.c_school,
                'origin_name',       t.c_oname,
                'dest_name',         t.c_dname,
                'departure_earliest',  t.c_dep_e,
                'departure_latest',    t.c_dep_l,
                'departure_preferred', t.c_dep_p,
                'seats_needed',   t.c_seats,
                'space_capacity', t.c_space,
                'gender_pref',    t.c_gpref,
                'quiet_ride',     t.c_quiet,
                'music_ok',       t.c_music
            ))
        END,
        CASE t.c_tier
            WHEN 'STRONG' THEN 'Great Match'
            WHEN 'OKAY'   THEN 'Okay Match'
            ELSE 'Possible Match'
        END,
        CASE t.c_tier
            WHEN 'STRONG' THEN 'Strong time overlap, close enough to share a ride.'
            WHEN 'OKAY'   THEN 'Good time overlap for a shared ride.'
            ELSE 'Some time overlap, but less flexibility.'
        END
    FROM tiered t
    WHERE t.c_tier IS NOT NULL
    ORDER BY
        CASE t.c_tier
            WHEN 'STRONG' THEN 1  WHEN 'OKAY' THEN 2
            ELSE 3
        END,
        GREATEST(
            CASE t.c_otier WHEN 'CLOSE' THEN 1 WHEN 'NEAR' THEN 2 ELSE 3 END,
            CASE t.c_dtier WHEN 'SAME_AREA' THEN 1 WHEN 'VERY_CLOSE' THEN 2 ELSE 3 END
        ),
        CASE t.c_otier WHEN 'CLOSE' THEN 1 WHEN 'NEAR' THEN 2 ELSE 3 END
          + CASE t.c_dtier WHEN 'SAME_AREA' THEN 1 WHEN 'VERY_CLOSE' THEN 2 ELSE 3 END,
        CASE WHEN t.c_gender_ok THEN 0 ELSE 1 END,
        t.c_pref DESC,
        t.c_d_dst,
        t.c_d_ori
    LIMIT p_max_results;
END;
$$;

ALTER FUNCTION public.find_matches_v3(UUID, INTEGER, INTEGER) SET row_security TO off;
GRANT EXECUTE ON FUNCTION find_matches_v3(UUID, INTEGER, INTEGER) TO authenticated;

-- =============================================
-- Fix RLS bypass for match-accept trigger functions.
-- check_ride_match_cap (028) and count_group_seats_for_ride (028) query
-- ride_group_members but were never given SECURITY DEFINER.
-- Migration 031 added SET row_security = off, but without SECURITY DEFINER
-- the authenticated role cannot disable RLS → error 42501.
-- Recreate both with SECURITY DEFINER so they run as the function owner.
-- =============================================

CREATE OR REPLACE FUNCTION count_group_seats_for_ride(p_ride_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT COALESCE(SUM(r.seats_needed), 0)::INTEGER
    FROM ride_group_members rgm
    JOIN rides r ON r.id = rgm.ride_id
    WHERE rgm.left_at IS NULL
      AND rgm.ride_group_id IN (
          SELECT rgm2.ride_group_id
          FROM ride_group_members rgm2
          WHERE rgm2.ride_id = p_ride_id
            AND rgm2.left_at IS NULL
      );
$$;

CREATE OR REPLACE FUNCTION check_ride_match_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
    v_existing_seats INTEGER;
    v_new_seats INTEGER;
    v_total INTEGER;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    v_existing_seats := count_group_seats_for_ride(NEW.ride_id);

    IF v_existing_seats = 0 THEN
        SELECT COALESCE(r.seats_needed, 1)
        INTO v_existing_seats
        FROM rides r WHERE r.id = NEW.ride_id;
    END IF;

    SELECT COALESCE(r.seats_needed, 1)
    INTO v_new_seats
    FROM rides r WHERE r.id = NEW.requester_ride_id;

    v_total := v_existing_seats + v_new_seats;

    IF v_total > 6 THEN
        RAISE EXCEPTION 'ride_match_cap_exceeded: Group is full. Max 6 people per ride group (current: %, adding: %).', v_existing_seats, v_new_seats;
    END IF;

    RETURN NEW;
END;
$$;
