-- Knot Matching Functions
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- ============================================
-- HAVERSINE DISTANCE FUNCTION
-- Calculate distance in meters between two coordinates
-- ============================================
CREATE OR REPLACE FUNCTION haversine_distance(
    lat1 DECIMAL,
    lon1 DECIMAL,
    lat2 DECIMAL,
    lon2 DECIMAL
) RETURNS DECIMAL AS $$
DECLARE
    r DECIMAL := 6371000; -- Earth radius in meters
    dlat DECIMAL;
    dlon DECIMAL;
    a DECIMAL;
    c DECIMAL;
BEGIN
    dlat := RADIANS(lat2 - lat1);
    dlon := RADIANS(lon2 - lon1);
    a := SIN(dlat/2) * SIN(dlat/2) + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlon/2) * SIN(dlon/2);
    c := 2 * ATAN2(SQRT(a), SQRT(1-a));
    RETURN r * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;

-- ============================================
-- FIND POTENTIAL MATCHES FUNCTION
-- Returns scored potential matches for a trip intent
-- ============================================
CREATE OR REPLACE FUNCTION find_potential_matches(
    p_trip_intent_id UUID,
    p_time_window_minutes INTEGER DEFAULT 30,
    p_max_distance_meters INTEGER DEFAULT 10000
)
RETURNS TABLE (
    trip_intent_id UUID,
    user_id UUID,
    destination TEXT,
    departure_time TIMESTAMPTZ,
    party_size INTEGER,
    luggage TEXT,
    ride_type TEXT,
    rough_location TEXT,
    latitude DECIMAL,
    longitude DECIMAL,
    distance_meters DECIMAL,
    time_diff_minutes INTEGER,
    match_score INTEGER,
    -- Profile info
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    rating DECIMAL,
    total_rides INTEGER
) AS $$
DECLARE
    v_my_trip RECORD;
BEGIN
    -- Get the requesting user's trip
    SELECT * INTO v_my_trip
    FROM trip_intents
    WHERE id = p_trip_intent_id;

    IF v_my_trip IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT 
        ti.id AS trip_intent_id,
        ti.user_id,
        ti.destination,
        ti.departure_time,
        ti.party_size,
        ti.luggage,
        ti.ride_type,
        ti.rough_location,
        ti.latitude,
        ti.longitude,
        -- Distance calculation (if both have coordinates)
        CASE 
            WHEN v_my_trip.latitude IS NOT NULL AND ti.latitude IS NOT NULL THEN
                haversine_distance(v_my_trip.latitude, v_my_trip.longitude, ti.latitude, ti.longitude)
            ELSE 
                NULL::DECIMAL
        END AS distance_meters,
        -- Time difference in minutes
        EXTRACT(EPOCH FROM (ti.departure_time - v_my_trip.departure_time))/60 AS time_diff_minutes,
        -- Match score (0-100)
        (
            -- Base score for matching destination (40 points)
            CASE WHEN LOWER(ti.destination) = LOWER(v_my_trip.destination) THEN 40
                 WHEN LOWER(ti.destination) LIKE '%' || LOWER(SPLIT_PART(v_my_trip.destination, ' ', 1)) || '%' THEN 25
                 ELSE 0
            END
            -- Time proximity bonus (30 points max)
            + GREATEST(0, 30 - ABS(EXTRACT(EPOCH FROM (ti.departure_time - v_my_trip.departure_time))/60))
            -- Same ride type (15 points)
            + CASE WHEN ti.ride_type = v_my_trip.ride_type THEN 15 ELSE 0 END
            -- Party size compatibility (15 points)
            + CASE 
                WHEN ti.party_size + v_my_trip.party_size <= 4 AND v_my_trip.ride_type = 'standard' THEN 15
                WHEN ti.party_size + v_my_trip.party_size <= 6 THEN 15
                ELSE 5
              END
        )::INTEGER AS match_score,
        -- Profile info
        p.first_name,
        p.last_name,
        p.photo_url,
        p.rating,
        p.total_rides
    FROM trip_intents ti
    JOIN profiles p ON p.id = ti.user_id
    WHERE ti.status = 'searching'
      AND ti.user_id != v_my_trip.user_id
      -- Destination must have some similarity
      AND (
          LOWER(ti.destination) = LOWER(v_my_trip.destination)
          OR LOWER(ti.destination) LIKE '%' || LOWER(SPLIT_PART(v_my_trip.destination, ' ', 1)) || '%'
          OR LOWER(v_my_trip.destination) LIKE '%' || LOWER(SPLIT_PART(ti.destination, ' ', 1)) || '%'
      )
      -- Time window
      AND ti.departure_time BETWEEN 
          v_my_trip.departure_time - (p_time_window_minutes || ' minutes')::INTERVAL
          AND v_my_trip.departure_time + (p_time_window_minutes || ' minutes')::INTERVAL
      -- Distance check (if coordinates available)
      AND (
          v_my_trip.latitude IS NULL 
          OR ti.latitude IS NULL 
          OR haversine_distance(v_my_trip.latitude, v_my_trip.longitude, ti.latitude, ti.longitude) <= p_max_distance_meters
      )
    ORDER BY match_score DESC, time_diff_minutes ASC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================
-- CHECK MUTUAL MATCH FUNCTION
-- Check if two users have mutual interest
-- ============================================
CREATE OR REPLACE FUNCTION check_and_update_mutual_match(
    p_match_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_match RECORD;
BEGIN
    SELECT * INTO v_match FROM matches WHERE id = p_match_id;
    
    IF v_match.user_1_interested AND v_match.user_2_interested THEN
        UPDATE matches SET status = 'mutual' WHERE id = p_match_id;
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- ============================================
-- EXPRESS INTEREST FUNCTION
-- Creates or updates match when user expresses interest
-- ============================================
CREATE OR REPLACE FUNCTION express_interest(
    p_my_trip_intent_id UUID,
    p_other_trip_intent_id UUID
) RETURNS UUID AS $$
DECLARE
    v_my_user_id UUID;
    v_other_user_id UUID;
    v_existing_match RECORD;
    v_match_id UUID;
BEGIN
    -- Get user IDs
    SELECT user_id INTO v_my_user_id FROM trip_intents WHERE id = p_my_trip_intent_id;
    SELECT user_id INTO v_other_user_id FROM trip_intents WHERE id = p_other_trip_intent_id;
    
    IF v_my_user_id IS NULL OR v_other_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid trip intent IDs';
    END IF;
    
    -- Check for existing match
    SELECT * INTO v_existing_match FROM matches 
    WHERE (trip_intent_1 = p_my_trip_intent_id AND trip_intent_2 = p_other_trip_intent_id)
       OR (trip_intent_1 = p_other_trip_intent_id AND trip_intent_2 = p_my_trip_intent_id);
    
    IF v_existing_match IS NOT NULL THEN
        -- Update existing match
        IF v_existing_match.user_1 = v_my_user_id THEN
            UPDATE matches SET 
                user_1_interested = TRUE,
                status = CASE WHEN user_2_interested THEN 'mutual' ELSE status END
            WHERE id = v_existing_match.id;
        ELSE
            UPDATE matches SET 
                user_2_interested = TRUE,
                status = CASE WHEN user_1_interested THEN 'mutual' ELSE status END
            WHERE id = v_existing_match.id;
        END IF;
        RETURN v_existing_match.id;
    ELSE
        -- Create new match
        INSERT INTO matches (trip_intent_1, trip_intent_2, user_1, user_2, user_1_interested, user_2_interested, status)
        VALUES (p_my_trip_intent_id, p_other_trip_intent_id, v_my_user_id, v_other_user_id, TRUE, FALSE, 'pending')
        RETURNING id INTO v_match_id;
        RETURN v_match_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION haversine_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION find_potential_matches(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_update_mutual_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION express_interest(UUID, UUID) TO authenticated;
