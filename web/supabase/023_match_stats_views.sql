-- =============================================
-- 023: Match stats views for Supabase dashboard
-- "Matches made" = ride_requests with status = 'accepted'.
-- Use these views in Table Editor or SQL Editor to see counts and list.
-- =============================================

-- Single-row summary: run "SELECT * FROM match_stats" or open view in Table Editor
CREATE OR REPLACE VIEW match_stats AS
SELECT
    (SELECT COUNT(*)::BIGINT FROM ride_requests WHERE status = 'accepted') AS total_accepted_matches,
    (SELECT COUNT(*)::BIGINT FROM ride_requests WHERE status = 'pending') AS total_pending_requests,
    (SELECT COUNT(*)::BIGINT FROM ride_requests WHERE status = 'rejected') AS total_rejected,
    (SELECT COUNT(*)::BIGINT FROM ride_requests) AS total_requests;

-- List of accepted matches with route labels (for Table Editor or "SELECT * FROM accepted_matches")
CREATE OR REPLACE VIEW accepted_matches AS
SELECT
    rr.id AS request_id,
    rr.created_at AS matched_at,
    rr.ride_id,
    rr.requester_ride_id,
    host.origin_name AS host_origin,
    host.dest_name AS host_dest,
    req.origin_name AS requester_origin,
    req.dest_name AS requester_dest
FROM ride_requests rr
JOIN rides host ON host.id = rr.ride_id
JOIN rides req ON req.id = rr.requester_ride_id
WHERE rr.status = 'accepted'
ORDER BY rr.created_at DESC;

COMMENT ON VIEW match_stats IS 'One row: total_accepted_matches, total_pending_requests, total_rejected, total_requests. Use in Supabase to see how many matches were made.';
COMMENT ON VIEW accepted_matches IS 'List of accepted matches (ride pairs). Actual "matches made" come from ride_requests where status = accepted.';
