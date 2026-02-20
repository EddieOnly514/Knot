-- =============================================
-- 021_fix_match_cap_trigger.sql
-- Cap: group has max 4 people (host + 3 accepted requesters).
-- Fix: cap check must count the row being accepted (BEFORE UPDATE sees old state).
-- =============================================

CREATE OR REPLACE FUNCTION check_ride_match_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    -- Max 4 people = 1 host + 3 accepted requesters (v_count = accepted count for this ride_id)
    v_count := count_accepted_matches_for_ride(NEW.ride_id);
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'accepted') THEN
        v_count := v_count + 1;
    END IF;
    IF v_count > 3 THEN
        RAISE EXCEPTION 'ride_match_cap_exceeded: Reached max ride limit. Group can have at most 4 people.';
    END IF;

    v_count := count_accepted_matches_for_ride(NEW.requester_ride_id);
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM 'accepted') THEN
        v_count := v_count + 1;
    END IF;
    IF v_count > 3 THEN
        RAISE EXCEPTION 'ride_match_cap_exceeded: Reached max ride limit. Group can have at most 4 people.';
    END IF;

    RETURN NEW;
END;
$$;
