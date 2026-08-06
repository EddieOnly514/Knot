-- =============================================
-- 036_secure_profile_rpcs.sql
-- Prevent authenticated callers from reading another profile's ride requests
-- or completed ride history through SECURITY DEFINER helper functions.
-- =============================================

SET search_path = public;

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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    WITH authorized_profile AS (
        SELECT p.id
        FROM profiles p
        WHERE p.id = p_profile_id
          AND (
              p.user_id = auth.uid()
              OR auth.role() = 'service_role'
          )
    ),
    my_rides AS (
        SELECT r.id, r.origin_name, r.dest_name
        FROM rides r
        JOIN authorized_profile ap ON ap.id = r.user_id
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
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    WITH authorized_profile AS (
        SELECT p.id
        FROM profiles p
        WHERE p.id = p_profile_id
          AND (
              p.user_id = auth.uid()
              OR auth.role() = 'service_role'
          )
    ),
    my_rides AS (
        SELECT
            r.id,
            r.origin_name,
            r.dest_name,
            r.departure_earliest,
            r.departure_latest
        FROM rides r
        JOIN authorized_profile ap ON ap.id = r.user_id
    ),
    completed AS (
        SELECT
            rr.*,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN rr.ride_id ELSE rr.requester_ride_id END AS my_ride_id,
            CASE WHEN EXISTS (SELECT 1 FROM my_rides WHERE id = rr.ride_id)
                 THEN rr.requester_ride_id ELSE rr.ride_id END AS other_ride_id
        FROM ride_requests rr
        WHERE (
                rr.ride_id IN (SELECT id FROM my_rides)
                OR rr.requester_ride_id IN (SELECT id FROM my_rides)
              )
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

REVOKE EXECUTE ON FUNCTION get_ride_requests_enriched(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_completed_rides_enriched(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_ride_requests_enriched(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_completed_rides_enriched(UUID) TO authenticated, service_role;
