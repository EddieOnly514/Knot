-- =============================================
-- 041_remove_retired_matching_schema.sql
-- Remove the unused driver-era and cached-score schema. Knot now uses rides,
-- ride_requests, living ride_groups, and deterministic Haversine matching.
-- =============================================

SET search_path = public;

-- Refuse to delete legacy data silently. The connected Knot project has no
-- rows in these tables, but another environment must migrate any rows first.
DO $$
DECLARE
    v_table TEXT;
    v_count BIGINT;
BEGIN
    FOREACH v_table IN ARRAY ARRAY[
        'swipes',
        'blocks',
        'reports',
        'ratings',
        'trip_intents',
        'matches',
        'meetup_confirmations',
        'trip_ratings',
        'ride_matches'
    ]
    LOOP
        IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
            IF v_table = 'trip_intents' THEN
                SELECT COUNT(*)
                INTO v_count
                FROM trip_intents
                WHERE id NOT IN (
                    'aaaa1111-1111-1111-1111-111111111111'::UUID,
                    'aaaa2222-2222-2222-2222-222222222222'::UUID,
                    'aaaa3333-3333-3333-3333-333333333333'::UUID
                )
                   OR departure_time >= NOW();
            ELSE
                EXECUTE format('SELECT COUNT(*) FROM public.%I', v_table)
                INTO v_count;
            END IF;

            IF v_count > 0 THEN
                RAISE EXCEPTION
                    'schema_cleanup_blocked: public.% contains % row(s)',
                    v_table,
                    v_count;
            END IF;
        END IF;
    END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS ride_requests_clean_ride_matches_trigger ON ride_requests;
DROP FUNCTION IF EXISTS ride_requests_clean_ride_matches();

DROP FUNCTION IF EXISTS check_and_update_mutual_match(UUID);
DROP FUNCTION IF EXISTS express_interest(UUID, UUID);
DROP FUNCTION IF EXISTS find_potential_matches(UUID, INTEGER, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS expire_old_trip_intents();
DROP FUNCTION IF EXISTS haversine_distance(NUMERIC, NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS bounding_box_contains(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC);
DROP FUNCTION IF EXISTS calculate_time_overlap(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS count_accepted_matches_for_ride(UUID);
DROP FUNCTION IF EXISTS get_ride_group_id(UUID);

-- Keep the living-group helpers. Even when a helper has no direct Next.js
-- caller, active triggers still use it for capacity and leave recalculation.

DROP TABLE IF EXISTS meetup_confirmations;
DROP TABLE IF EXISTS trip_ratings;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS trip_intents;
DROP TABLE IF EXISTS swipes;
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS ride_matches;

-- There are no geometry/geography columns and the active matcher uses the
-- numeric haversine_miles() helper, so PostGIS only exposes unused API objects.
DROP EXTENSION IF EXISTS postgis;
