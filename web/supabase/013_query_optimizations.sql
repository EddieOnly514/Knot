-- =============================================
-- 013_query_optimizations.sql
-- Targeted fixes for top slow queries from pg_stat_statements
--
-- Problem:
--   #4  rides WHERE user_id (29k calls, 13% of DB time) — missing covering index
--   #6  find_matches_v3 (5.6k calls, 5.2%) — PL/pgSQL helpers can't be inlined
--   #7  ride_requests OR query (2k calls, 2.4%) — N+1 waterfall from client
--   #10 rides WHERE user_id+status ORDER BY created_at (29k calls, 1.5%)
-- =============================================


-- =============================================
-- 1. COVERING INDEXES
-- =============================================

-- #4: SELECT id, origin_name, dest_name FROM rides WHERE user_id = $1
-- Enable index-only scans for the most-called app query
CREATE INDEX IF NOT EXISTS idx_rides_user_covering
    ON rides(user_id)
    INCLUDE (origin_name, dest_name, status, created_at, departure_earliest, departure_latest);

-- #10: rides WHERE user_id AND status ORDER BY created_at DESC
-- Composite index with sort order so Postgres can skip the sort step
CREATE INDEX IF NOT EXISTS idx_rides_user_status_created
    ON rides(user_id, status, created_at DESC);

-- ride_requests: the OR query needs efficient access on both columns
-- Include commonly selected columns to enable index-only scans
CREATE INDEX IF NOT EXISTS idx_ride_requests_ride_covering
    ON ride_requests(ride_id)
    INCLUDE (requester_ride_id, status, ride_status, created_at, updated_at);

CREATE INDEX IF NOT EXISTS idx_ride_requests_requester_covering
    ON ride_requests(requester_ride_id)
    INCLUDE (ride_id, status, ride_status, created_at, updated_at);


-- =============================================
-- 2. CONVERT HELPER FUNCTIONS FROM PL/pgSQL TO SQL
--    SQL functions can be inlined by the query planner,
--    eliminating ~0.01ms per-call overhead in find_matches_v3
--    (called for every candidate row × 5.6k invocations)
-- =============================================

CREATE OR REPLACE FUNCTION calculate_time_overlap(
    earliest1 TIMESTAMPTZ, latest1 TIMESTAMPTZ,
    earliest2 TIMESTAMPTZ, latest2 TIMESTAMPTZ
)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT GREATEST(
        0,
        EXTRACT(EPOCH FROM (LEAST(latest1, latest2) - GREATEST(earliest1, earliest2)))::INTEGER / 60
    )::INTEGER;
$$;

CREATE OR REPLACE FUNCTION bounding_box_contains(
    center_lat DECIMAL, center_lng DECIMAL,
    test_lat DECIMAL, test_lng DECIMAL,
    radius_miles DECIMAL
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN center_lat IS NULL OR center_lng IS NULL
          OR test_lat IS NULL OR test_lng IS NULL
        THEN true
        ELSE
            test_lat BETWEEN center_lat - radius_miles * 0.0145
                         AND center_lat + radius_miles * 0.0145
            AND
            test_lng BETWEEN center_lng - radius_miles * (0.0145 / COS(RADIANS(center_lat)))
                         AND center_lng + radius_miles * (0.0145 / COS(RADIANS(center_lat)))
    END;
$$;

CREATE OR REPLACE FUNCTION haversine_miles(
    lat1 DECIMAL, lng1 DECIMAL,
    lat2 DECIMAL, lng2 DECIMAL
)
RETURNS DECIMAL
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN NULL
        ELSE
            3959.0 * 2 * ASIN(SQRT(
                SIN(RADIANS(lat2 - lat1) / 2) ^ 2
                + COS(RADIANS(lat1)) * COS(RADIANS(lat2))
                  * SIN(RADIANS(lng2 - lng1) / 2) ^ 2
            ))
    END;
$$;


-- =============================================
-- 3. SERVER-SIDE FUNCTION: get_ride_requests_enriched
--    Replaces the 4-query waterfall in getMyRequests():
--      1) SELECT rides WHERE user_id
--      2) SELECT ride_requests WHERE ride_id OR requester_ride_id
--      3) SELECT rides WHERE id IN (other_ids)
--      4) SELECT profiles WHERE id IN (profile_ids)
--    Now a single round-trip.
-- =============================================

CREATE OR REPLACE FUNCTION get_ride_requests_enriched(p_profile_id UUID)
RETURNS TABLE (
    request_id UUID,
    request_status TEXT,
    ride_status TEXT,
    created_at TIMESTAMPTZ,
    ride_id UUID,
    my_ride_origin TEXT,
    my_ride_dest TEXT,
    requester_ride_id UUID,
    requester_name TEXT,
    requester_photo TEXT,
    requester_school TEXT,
    requester_rating DECIMAL,
    requester_origin TEXT,
    requester_dest TEXT,
    requester_departure TIMESTAMPTZ,
    requester_seats INTEGER,
    requester_profile_id UUID,
    direction TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    WITH my_rides AS (
        SELECT r.id, r.origin_name, r.dest_name
        FROM rides r
        WHERE r.user_id = p_profile_id
    ),
    relevant_requests AS (
        SELECT
            rr.*,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN 'incoming' ELSE 'outgoing' END AS dir,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN rr.ride_id ELSE rr.requester_ride_id END AS my_ride_id,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN rr.requester_ride_id ELSE rr.ride_id END AS other_ride_id
        FROM ride_requests rr
        WHERE rr.ride_id IN (SELECT id FROM my_rides)
           OR rr.requester_ride_id IN (SELECT id FROM my_rides)
    )
    SELECT
        rr.id AS request_id,
        rr.status AS request_status,
        rr.ride_status,
        rr.created_at,
        rr.ride_id,
        mr.origin_name AS my_ride_origin,
        mr.dest_name AS my_ride_dest,
        rr.requester_ride_id,
        COALESCE(p.first_name || ' ' || LEFT(p.last_name, 1) || '.', 'Unknown') AS requester_name,
        p.photo_url AS requester_photo,
        p.school AS requester_school,
        COALESCE(p.rating, 0::DECIMAL) AS requester_rating,
        other_r.origin_name AS requester_origin,
        other_r.dest_name AS requester_dest,
        other_r.departure_preferred AS requester_departure,
        COALESCE(other_r.seats_needed, 1) AS requester_seats,
        other_r.user_id AS requester_profile_id,
        rr.dir AS direction
    FROM relevant_requests rr
    LEFT JOIN my_rides mr ON mr.id = rr.my_ride_id
    LEFT JOIN rides other_r ON other_r.id = rr.other_ride_id
    LEFT JOIN profiles p ON p.id = other_r.user_id
    ORDER BY rr.created_at DESC;
$$;


-- =============================================
-- 4. SERVER-SIDE FUNCTION: get_completed_rides_enriched
--    Replaces the 5-query waterfall in getCompletedRides():
--      1) SELECT rides WHERE user_id
--      2) SELECT ride_requests WHERE ... AND ride_status = 'completed'
--      3) SELECT rides WHERE id IN (other_ids)
--      4) SELECT profiles WHERE id IN (profile_ids)
--      5) Client-side join assembly
--    Now a single round-trip.
-- =============================================

CREATE OR REPLACE FUNCTION get_completed_rides_enriched(p_profile_id UUID)
RETURNS TABLE (
    request_id UUID,
    ride_status TEXT,
    completed_at TIMESTAMPTZ,
    my_origin TEXT,
    my_dest TEXT,
    departure_earliest TIMESTAMPTZ,
    departure_latest TIMESTAMPTZ,
    partner_name TEXT,
    partner_photo TEXT,
    partner_school TEXT,
    partner_profile_id UUID,
    partner_origin TEXT,
    partner_dest TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
STABLE
AS $$
    WITH my_rides AS (
        SELECT r.id, r.origin_name, r.dest_name,
               r.departure_earliest, r.departure_latest
        FROM rides r
        WHERE r.user_id = p_profile_id
    ),
    completed AS (
        SELECT
            rr.*,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN rr.ride_id ELSE rr.requester_ride_id END AS my_ride_id,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN rr.requester_ride_id ELSE rr.ride_id END AS other_ride_id
        FROM ride_requests rr
        WHERE (rr.ride_id IN (SELECT id FROM my_rides)
            OR rr.requester_ride_id IN (SELECT id FROM my_rides))
          AND rr.ride_status = 'completed'
    )
    SELECT
        c.id AS request_id,
        c.ride_status,
        c.updated_at AS completed_at,
        mr.origin_name AS my_origin,
        mr.dest_name AS my_dest,
        mr.departure_earliest,
        mr.departure_latest,
        COALESCE(p.first_name || ' ' || LEFT(p.last_name, 1) || '.', 'Unknown') AS partner_name,
        p.photo_url AS partner_photo,
        p.school AS partner_school,
        p.id AS partner_profile_id,
        other_r.origin_name AS partner_origin,
        other_r.dest_name AS partner_dest
    FROM completed c
    LEFT JOIN my_rides mr ON mr.id = c.my_ride_id
    LEFT JOIN rides other_r ON other_r.id = c.other_ride_id
    LEFT JOIN profiles p ON p.id = other_r.user_id
    ORDER BY c.updated_at DESC;
$$;


-- =============================================
-- 5. PERMISSIONS
-- =============================================

GRANT EXECUTE ON FUNCTION get_ride_requests_enriched(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_completed_rides_enriched(UUID) TO authenticated;


-- =============================================
-- 6. REFRESH PLANNER STATISTICS
-- =============================================

ANALYZE rides;
ANALYZE ride_requests;
ANALYZE profiles;
