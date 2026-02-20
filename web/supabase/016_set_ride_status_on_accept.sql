-- When a ride request is accepted (status -> 'accepted'), set ride_status to 'accepted'
-- so the chat shows step 2 (Accepted / Confirm meetup) instead of step 1 (Requested).
-- This runs in the DB so it works regardless of which client or code path does the accept.

-- Fix existing accepted rows that still have ride_status = 'requested'
UPDATE ride_requests
SET ride_status = 'accepted'
WHERE status = 'accepted' AND (ride_status IS NULL OR ride_status = 'requested');

CREATE OR REPLACE FUNCTION set_ride_status_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM 'accepted' AND NEW.status = 'accepted' THEN
        NEW.ride_status := 'accepted';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_set_ride_status_on_accept ON ride_requests;
CREATE TRIGGER ride_requests_set_ride_status_on_accept
    BEFORE UPDATE OF status
    ON ride_requests
    FOR EACH ROW
    WHEN (NEW.status = 'accepted')
    EXECUTE FUNCTION set_ride_status_on_accept();
