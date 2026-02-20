-- =============================================
-- 015_clean_suggested_matches.sql
-- When a match is created (request sent) or removed/completed/cancelled,
-- clean ride_matches cache so that pair is never suggested again.
-- find_matches_v3 already excludes ride_requests pairs (see 011); this
-- keeps the ride_matches table in sync for any code that may use it.
-- =============================================

-- Remove cached match rows for (ride_id, requester_ride_id) in either direction
-- whenever a ride_request is inserted or updated (any status), or when a ride
-- is completed (ride_status -> 'completed') so the pair is no longer suggested.
CREATE OR REPLACE FUNCTION ride_requests_clean_ride_matches()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    DELETE FROM ride_matches
    WHERE (ride_id = NEW.ride_id AND matched_ride_id = NEW.requester_ride_id)
       OR (ride_id = NEW.requester_ride_id AND matched_ride_id = NEW.ride_id);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_clean_ride_matches_trigger ON ride_requests;
CREATE TRIGGER ride_requests_clean_ride_matches_trigger
    AFTER INSERT OR UPDATE OF ride_id, requester_ride_id, status, ride_status
    ON ride_requests
    FOR EACH ROW
    EXECUTE FUNCTION ride_requests_clean_ride_matches();
