-- =============================================
-- 020_group_edge_cases.sql
-- 1) Group when 2+ accepted (3+ people); 3rd and 4th join the SAME group chat.
-- 2) When someone leaves → delete group (no history carryover) so a later new
--    group (e.g. A,C,D after B left) is fresh.
-- =============================================

-- =============================================
-- 1. CREATE GROUP WHEN 2+ ACCEPTED; ALL JOIN SAME GROUP (INCLUDING 4TH PERSON)
-- =============================================
-- When the 2nd request is accepted we create the group; when 3rd/4th are
-- accepted we add their 1:1 messages to the same group so everyone is in one chat.

CREATE OR REPLACE FUNCTION maybe_create_ride_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_accepted_count INTEGER;
    v_group_id UUID;
BEGIN
    IF NEW.status <> 'accepted' THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_accepted_count
    FROM ride_requests
    WHERE ride_id = NEW.ride_id AND status = 'accepted';

    -- 2+ accepted requesters = 3+ people → create group if not exists
    IF v_accepted_count >= 2 THEN
        INSERT INTO ride_groups (ride_id)
        VALUES (NEW.ride_id)
        ON CONFLICT (ride_id) DO NOTHING;

        SELECT id INTO v_group_id FROM ride_groups WHERE ride_id = NEW.ride_id LIMIT 1;

        -- Migrate ALL accepted requesters' 1:1 messages into the group (including 3rd, 4th).
        IF v_group_id IS NOT NULL THEN
            UPDATE messages
            SET conversation_id = NULL,
                ride_group_id = v_group_id
            WHERE conversation_id IN (
                SELECT id FROM ride_requests
                WHERE ride_id = NEW.ride_id AND status = 'accepted'
            )
              AND ride_group_id IS NULL;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- =============================================
-- 2. WHEN SOMEONE LEAVES: DISSOLVE GROUP (NO HISTORY CARRYOVER)
-- =============================================
-- When a ride_request changes from 'accepted' to something else (rejected/cancelled):
-- - If 0 accepted left → delete ride_group (messages CASCADE).
-- - If 1 accepted left (2 people) → delete ride_group only; do NOT move group messages
--   into the remaining 1:1. So when the host later accepts new people (e.g. C, D), the
--   new group (A,C,D) is fresh and does not include the old A,B,C thread.

CREATE OR REPLACE FUNCTION maybe_dissolve_ride_group()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    v_ride_id UUID;
    v_accepted_count INTEGER;
    v_group_id UUID;
BEGIN
    -- Only run when status changes from accepted to something else
    IF OLD.status <> 'accepted' OR NEW.status = 'accepted' THEN
        RETURN NEW;
    END IF;

    v_ride_id := OLD.ride_id;

    SELECT id INTO v_group_id FROM ride_groups WHERE ride_id = v_ride_id LIMIT 1;
    IF v_group_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT COUNT(*) INTO v_accepted_count
    FROM ride_requests
    WHERE ride_id = v_ride_id AND status = 'accepted';

    -- Always just delete the group. Messages CASCADE (no migration to remaining 1:1).
    -- Remaining two people keep their 1:1 thread but it has no old group history;
    -- when host accepts new people later, the new group is fresh (A,C,D not with B).
    DELETE FROM ride_groups WHERE id = v_group_id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_maybe_dissolve_group ON ride_requests;
CREATE TRIGGER ride_requests_maybe_dissolve_group
    AFTER UPDATE OF status
    ON ride_requests
    FOR EACH ROW
    WHEN (OLD.status = 'accepted' AND NEW.status IS DISTINCT FROM 'accepted')
    EXECUTE FUNCTION maybe_dissolve_ride_group();
