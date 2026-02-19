-- ============================================
-- 004: Matching Algorithm V2
-- Run in Supabase SQL Editor after 001, 002, 003
-- ============================================

-- ============================================
-- SCHEMA UPDATES: Add address + preference columns
-- ============================================

ALTER TABLE public.trip_intents
  -- Departure (origin) address
  ADD COLUMN IF NOT EXISTS departure_address TEXT,
  ADD COLUMN IF NOT EXISTS departure_city TEXT,
  ADD COLUMN IF NOT EXISTS departure_lat DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS departure_lng DECIMAL(11,8),
  -- Destination address
  ADD COLUMN IF NOT EXISTS destination_address TEXT,
  ADD COLUMN IF NOT EXISTS destination_city TEXT,
  ADD COLUMN IF NOT EXISTS destination_lat DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS destination_lng DECIMAL(11,8),
  -- Car preference
  ADD COLUMN IF NOT EXISTS car_preference TEXT DEFAULT 'standard',
  -- Match expiration (auto-set to departure_time - 2 hours)
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Add constraint for car_preference (safe: only applies to new inserts)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trip_intents_car_preference_check'
  ) THEN
    ALTER TABLE public.trip_intents
      ADD CONSTRAINT trip_intents_car_preference_check
      CHECK (car_preference IN ('standard', 'premium'));
  END IF;
END $$;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_trip_intents_departure_geo
  ON public.trip_intents(departure_lat, departure_lng);
CREATE INDEX IF NOT EXISTS idx_trip_intents_destination_geo
  ON public.trip_intents(destination_lat, destination_lng);
CREATE INDEX IF NOT EXISTS idx_trip_intents_expires
  ON public.trip_intents(expires_at);

-- ============================================
-- REWRITE: find_potential_matches V2
-- Hard filters + 100-point compatibility scoring
-- ============================================

-- Drop the old overload from 002_matching_functions.sql (different arg signature)
DROP FUNCTION IF EXISTS find_potential_matches(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION find_potential_matches(
    p_trip_intent_id UUID,
    p_time_window_minutes INTEGER DEFAULT 45,
    p_max_origin_meters INTEGER DEFAULT 16000,    -- ~10 miles
    p_max_dest_meters INTEGER DEFAULT 16000       -- ~10 miles
)
RETURNS TABLE (
    trip_intent_id UUID,
    user_id UUID,
    -- Address info
    departure_address TEXT,
    departure_city TEXT,
    destination TEXT,
    destination_address TEXT,
    destination_city TEXT,
    departure_time TIMESTAMPTZ,
    party_size INTEGER,
    luggage TEXT,
    car_preference TEXT,
    -- Distances & diffs
    origin_distance_meters DECIMAL,
    dest_distance_meters DECIMAL,
    time_diff_minutes INTEGER,
    combined_party_size INTEGER,
    -- Score
    match_score INTEGER,
    score_origin INTEGER,
    score_destination INTEGER,
    score_time INTEGER,
    score_party INTEGER,
    score_luggage INTEGER,
    score_car_pref INTEGER,
    match_label TEXT,
    estimated_savings_cents INTEGER,
    -- Profile info
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    rating DECIMAL,
    total_rides INTEGER,
    is_verified BOOLEAN
) AS $$
DECLARE
    v_my RECORD;
    v_luggage_weight_me INTEGER;
BEGIN
    -- Get the requesting user's trip
    SELECT * INTO v_my FROM trip_intents WHERE id = p_trip_intent_id;
    IF v_my IS NULL THEN RETURN; END IF;

    RETURN QUERY
    WITH scored AS (
        SELECT
            ti.id AS _trip_intent_id,
            ti.user_id AS _user_id,
            ti.departure_address AS _departure_address,
            ti.departure_city AS _departure_city,
            ti.destination AS _destination,
            ti.destination_address AS _destination_address,
            ti.destination_city AS _destination_city,
            ti.departure_time AS _departure_time,
            ti.party_size AS _party_size,
            ti.luggage AS _luggage,
            ti.car_preference AS _car_preference,

            -- ========== DISTANCES ==========
            CASE
                WHEN v_my.departure_lat IS NOT NULL AND ti.departure_lat IS NOT NULL THEN
                    haversine_distance(v_my.departure_lat, v_my.departure_lng, ti.departure_lat, ti.departure_lng)
                ELSE NULL::DECIMAL
            END AS _origin_dist,

            CASE
                WHEN v_my.destination_lat IS NOT NULL AND ti.destination_lat IS NOT NULL THEN
                    haversine_distance(v_my.destination_lat, v_my.destination_lng, ti.destination_lat, ti.destination_lng)
                ELSE NULL::DECIMAL
            END AS _dest_dist,

            -- Time diff in minutes (absolute)
            ABS(EXTRACT(EPOCH FROM (ti.departure_time - v_my.departure_time)) / 60)::INTEGER AS _time_diff,

            -- Combined party size
            (ti.party_size + v_my.party_size) AS _combined_party,

            -- Car capacity (minimum of both preferences)
            CASE
                WHEN LEAST(ti.car_preference, v_my.car_preference) = 'standard' THEN 4
                ELSE 6
            END AS _car_capacity,

            -- ========== LUGGAGE WEIGHTS ==========
            (CASE v_my.luggage
                WHEN 'none' THEN 0 WHEN 'small' THEN 1 WHEN 'personal' THEN 1
                WHEN 'one_large' THEN 3 WHEN 'one_big' THEN 3
                WHEN 'multiple' THEN 6 ELSE 2
            END) AS _my_lug_weight,

            (CASE ti.luggage
                WHEN 'none' THEN 0 WHEN 'small' THEN 1 WHEN 'personal' THEN 1
                WHEN 'one_large' THEN 3 WHEN 'one_big' THEN 3
                WHEN 'multiple' THEN 6 ELSE 2
            END) AS _their_lug_weight,

            -- Max trunk capacity based on smaller car
            CASE
                WHEN LEAST(ti.car_preference, v_my.car_preference) = 'standard' THEN 5
                ELSE 8
            END AS _max_trunk,

            -- Profile info
            p.first_name AS _first_name,
            p.last_name AS _last_name,
            p.photo_url AS _photo_url,
            p.rating AS _rating,
            p.total_rides AS _total_rides,
            p.is_verified AS _is_verified

        FROM trip_intents ti
        JOIN profiles p ON p.user_id = ti.user_id
        WHERE ti.status = 'searching'
          AND ti.user_id != v_my.user_id
          -- Not expired
          AND (ti.expires_at IS NULL OR ti.expires_at > NOW())
          -- ========== HARD FILTER: Time window ±45 min ==========
          AND ti.departure_time BETWEEN
              v_my.departure_time - (p_time_window_minutes || ' minutes')::INTERVAL
              AND v_my.departure_time + (p_time_window_minutes || ' minutes')::INTERVAL
          -- ========== HARD FILTER: Combined party ≤ car capacity ==========
          AND (ti.party_size + v_my.party_size) <=
              CASE WHEN LEAST(ti.car_preference, v_my.car_preference) = 'standard' THEN 4 ELSE 6 END
    )
    SELECT
        s._trip_intent_id,
        s._user_id,
        s._departure_address,
        s._departure_city,
        s._destination,
        s._destination_address,
        s._destination_city,
        s._departure_time,
        s._party_size,
        s._luggage,
        s._car_preference,
        s._origin_dist,
        s._dest_dist,
        s._time_diff,
        s._combined_party,

        -- ========== TOTAL SCORE ==========
        (
            -- Origin proximity (20 pts)
            CASE WHEN s._origin_dist IS NOT NULL
                THEN GREATEST(0, ROUND(20 * (1.0 - s._origin_dist / p_max_origin_meters)))::INTEGER
                ELSE 10  -- partial credit if no coords
            END
            +
            -- Destination proximity (30 pts)
            CASE WHEN s._dest_dist IS NOT NULL
                THEN GREATEST(0, ROUND(30 * (1.0 - s._dest_dist / p_max_dest_meters)))::INTEGER
                ELSE
                    -- Text fallback
                    CASE
                        WHEN LOWER(s._destination) = LOWER(v_my.destination) THEN 30
                        WHEN LOWER(s._destination) LIKE '%' || LOWER(SPLIT_PART(v_my.destination, ',', 1)) || '%' THEN 20
                        ELSE 5
                    END
            END
            +
            -- Time proximity (20 pts)
            GREATEST(0, ROUND(20 * (1.0 - s._time_diff::DECIMAL / p_time_window_minutes)))::INTEGER
            +
            -- Party size optimization (15 pts)
            CASE
                WHEN s._combined_party = s._car_capacity THEN 15
                WHEN s._combined_party = s._car_capacity - 1 THEN 12
                ELSE 8
            END
            +
            -- Luggage compatibility (10 pts)
            CASE
                WHEN (s._my_lug_weight + s._their_lug_weight) > s._max_trunk THEN 0
                WHEN (s._my_lug_weight + s._their_lug_weight) = 0 THEN 10
                WHEN (s._my_lug_weight + s._their_lug_weight) <= 2 THEN 9
                WHEN (s._my_lug_weight + s._their_lug_weight) <= 4 THEN 7
                ELSE 5
            END
            +
            -- Car preference alignment (5 pts)
            CASE WHEN s._car_preference = v_my.car_preference THEN 5 ELSE 0 END
        )::INTEGER AS match_score,

        -- ========== SCORE BREAKDOWN ==========
        CASE WHEN s._origin_dist IS NOT NULL
            THEN GREATEST(0, ROUND(20 * (1.0 - s._origin_dist / p_max_origin_meters)))::INTEGER
            ELSE 10
        END AS score_origin,

        CASE WHEN s._dest_dist IS NOT NULL
            THEN GREATEST(0, ROUND(30 * (1.0 - s._dest_dist / p_max_dest_meters)))::INTEGER
            ELSE CASE
                WHEN LOWER(s._destination) = LOWER(v_my.destination) THEN 30
                WHEN LOWER(s._destination) LIKE '%' || LOWER(SPLIT_PART(v_my.destination, ',', 1)) || '%' THEN 20
                ELSE 5
            END
        END AS score_destination,

        GREATEST(0, ROUND(20 * (1.0 - s._time_diff::DECIMAL / p_time_window_minutes)))::INTEGER AS score_time,

        CASE
            WHEN s._combined_party = s._car_capacity THEN 15
            WHEN s._combined_party = s._car_capacity - 1 THEN 12
            ELSE 8
        END AS score_party,

        CASE
            WHEN (s._my_lug_weight + s._their_lug_weight) > s._max_trunk THEN 0
            WHEN (s._my_lug_weight + s._their_lug_weight) = 0 THEN 10
            WHEN (s._my_lug_weight + s._their_lug_weight) <= 2 THEN 9
            WHEN (s._my_lug_weight + s._their_lug_weight) <= 4 THEN 7
            ELSE 5
        END AS score_luggage,

        CASE WHEN s._car_preference = v_my.car_preference THEN 5 ELSE 0 END AS score_car_pref,

        -- Match label
        CASE
            WHEN (
                CASE WHEN s._origin_dist IS NOT NULL
                    THEN GREATEST(0, ROUND(20 * (1.0 - s._origin_dist / p_max_origin_meters)))::INTEGER
                    ELSE 10 END
                + CASE WHEN s._dest_dist IS NOT NULL
                    THEN GREATEST(0, ROUND(30 * (1.0 - s._dest_dist / p_max_dest_meters)))::INTEGER
                    ELSE CASE WHEN LOWER(s._destination) = LOWER(v_my.destination) THEN 30
                         WHEN LOWER(s._destination) LIKE '%' || LOWER(SPLIT_PART(v_my.destination, ',', 1)) || '%' THEN 20
                         ELSE 5 END END
                + GREATEST(0, ROUND(20 * (1.0 - s._time_diff::DECIMAL / p_time_window_minutes)))::INTEGER
                + CASE WHEN s._combined_party = s._car_capacity THEN 15
                       WHEN s._combined_party = s._car_capacity - 1 THEN 12 ELSE 8 END
                + CASE WHEN (s._my_lug_weight + s._their_lug_weight) > s._max_trunk THEN 0
                       WHEN (s._my_lug_weight + s._their_lug_weight) = 0 THEN 10
                       WHEN (s._my_lug_weight + s._their_lug_weight) <= 2 THEN 9
                       WHEN (s._my_lug_weight + s._their_lug_weight) <= 4 THEN 7 ELSE 5 END
                + CASE WHEN s._car_preference = v_my.car_preference THEN 5 ELSE 0 END
            ) >= 90 THEN 'Excellent Match'
            WHEN (
                CASE WHEN s._origin_dist IS NOT NULL
                    THEN GREATEST(0, ROUND(20 * (1.0 - s._origin_dist / p_max_origin_meters)))::INTEGER
                    ELSE 10 END
                + CASE WHEN s._dest_dist IS NOT NULL
                    THEN GREATEST(0, ROUND(30 * (1.0 - s._dest_dist / p_max_dest_meters)))::INTEGER
                    ELSE CASE WHEN LOWER(s._destination) = LOWER(v_my.destination) THEN 30
                         WHEN LOWER(s._destination) LIKE '%' || LOWER(SPLIT_PART(v_my.destination, ',', 1)) || '%' THEN 20
                         ELSE 5 END END
                + GREATEST(0, ROUND(20 * (1.0 - s._time_diff::DECIMAL / p_time_window_minutes)))::INTEGER
                + CASE WHEN s._combined_party = s._car_capacity THEN 15
                       WHEN s._combined_party = s._car_capacity - 1 THEN 12 ELSE 8 END
                + CASE WHEN (s._my_lug_weight + s._their_lug_weight) > s._max_trunk THEN 0
                       WHEN (s._my_lug_weight + s._their_lug_weight) = 0 THEN 10
                       WHEN (s._my_lug_weight + s._their_lug_weight) <= 2 THEN 9
                       WHEN (s._my_lug_weight + s._their_lug_weight) <= 4 THEN 7 ELSE 5 END
                + CASE WHEN s._car_preference = v_my.car_preference THEN 5 ELSE 0 END
            ) >= 75 THEN 'Good Match'
            WHEN (
                CASE WHEN s._origin_dist IS NOT NULL
                    THEN GREATEST(0, ROUND(20 * (1.0 - s._origin_dist / p_max_origin_meters)))::INTEGER
                    ELSE 10 END
                + CASE WHEN s._dest_dist IS NOT NULL
                    THEN GREATEST(0, ROUND(30 * (1.0 - s._dest_dist / p_max_dest_meters)))::INTEGER
                    ELSE CASE WHEN LOWER(s._destination) = LOWER(v_my.destination) THEN 30
                         WHEN LOWER(s._destination) LIKE '%' || LOWER(SPLIT_PART(v_my.destination, ',', 1)) || '%' THEN 20
                         ELSE 5 END END
                + GREATEST(0, ROUND(20 * (1.0 - s._time_diff::DECIMAL / p_time_window_minutes)))::INTEGER
                + CASE WHEN s._combined_party = s._car_capacity THEN 15
                       WHEN s._combined_party = s._car_capacity - 1 THEN 12 ELSE 8 END
                + CASE WHEN (s._my_lug_weight + s._their_lug_weight) > s._max_trunk THEN 0
                       WHEN (s._my_lug_weight + s._their_lug_weight) = 0 THEN 10
                       WHEN (s._my_lug_weight + s._their_lug_weight) <= 2 THEN 9
                       WHEN (s._my_lug_weight + s._their_lug_weight) <= 4 THEN 7 ELSE 5 END
                + CASE WHEN s._car_preference = v_my.car_preference THEN 5 ELSE 0 END
            ) >= 55 THEN 'Fair Match'
            ELSE 'Possible Match'
        END AS match_label,

        -- Estimated savings (rough: $2.50/mile, split by combined party)
        -- Convert dest distance meters to miles, multiply by 250 cents/mile, divide by party
        CASE WHEN s._dest_dist IS NOT NULL AND s._combined_party > 1
            THEN ROUND((s._dest_dist / 1609.34) * 250 / s._combined_party)::INTEGER
            ELSE NULL
        END AS estimated_savings_cents,

        -- Profile
        s._first_name,
        s._last_name,
        s._photo_url,
        s._rating,
        s._total_rides,
        s._is_verified

    FROM scored s
    -- ========== HARD FILTER: Luggage feasibility ==========
    WHERE (s._my_lug_weight + s._their_lug_weight) <= s._max_trunk
    -- ========== HARD FILTER: Minimum score threshold ==========
    -- We filter >= 40 after computing
    AND (
        CASE WHEN s._origin_dist IS NOT NULL
            THEN GREATEST(0, ROUND(20 * (1.0 - s._origin_dist / p_max_origin_meters)))::INTEGER
            ELSE 10 END
        + CASE WHEN s._dest_dist IS NOT NULL
            THEN GREATEST(0, ROUND(30 * (1.0 - s._dest_dist / p_max_dest_meters)))::INTEGER
            ELSE CASE WHEN LOWER(s._destination) = LOWER(v_my.destination) THEN 30
                 WHEN LOWER(s._destination) LIKE '%' || LOWER(SPLIT_PART(v_my.destination, ',', 1)) || '%' THEN 20
                 ELSE 5 END END
        + GREATEST(0, ROUND(20 * (1.0 - s._time_diff::DECIMAL / p_time_window_minutes)))::INTEGER
        + CASE WHEN s._combined_party = s._car_capacity THEN 15
               WHEN s._combined_party = s._car_capacity - 1 THEN 12 ELSE 8 END
        + CASE WHEN (s._my_lug_weight + s._their_lug_weight) > s._max_trunk THEN 0
               WHEN (s._my_lug_weight + s._their_lug_weight) = 0 THEN 10
               WHEN (s._my_lug_weight + s._their_lug_weight) <= 2 THEN 9
               WHEN (s._my_lug_weight + s._their_lug_weight) <= 4 THEN 7 ELSE 5 END
        + CASE WHEN s._car_preference = v_my.car_preference THEN 5 ELSE 0 END
    ) >= 40
    ORDER BY match_score DESC, s._time_diff ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_potential_matches(UUID, INTEGER, INTEGER, INTEGER) TO authenticated;
