-- =============================================
-- 039_security_advisor_cleanup.sql
-- Close dashboard-only views and internal helper functions that were exposed
-- by PostgreSQL's default function/view privileges.
-- =============================================

SET search_path = public;

ALTER VIEW match_stats SET (security_invoker = true);
ALTER VIEW accepted_matches SET (security_invoker = true);

REVOKE ALL ON TABLE match_stats FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE accepted_matches FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE match_stats TO service_role;
GRANT SELECT ON TABLE accepted_matches TO service_role;

ALTER FUNCTION bounding_box_contains(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC)
    SET search_path = public;
ALTER FUNCTION haversine_miles(NUMERIC, NUMERIC, NUMERIC, NUMERIC)
    SET search_path = public;
ALTER FUNCTION calculate_time_overlap(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
    SET search_path = public;

REVOKE ALL ON FUNCTION bounding_box_contains(NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION haversine_miles(NUMERIC, NUMERIC, NUMERIC, NUMERIC)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION calculate_time_overlap(TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
    FROM PUBLIC, anon, authenticated;

-- This is an obsolete trip-intent maintenance function. Current Knot uses
-- rides and ride groups, so it must not be exposed through PostgREST.
ALTER FUNCTION expire_old_trip_intents() SET search_path = public;
REVOKE ALL ON FUNCTION expire_old_trip_intents()
    FROM PUBLIC, anon, authenticated;

-- Supabase owns this maintenance helper; clients never need to execute it.
REVOKE ALL ON FUNCTION rls_auto_enable()
    FROM PUBLIC, anon, authenticated;

-- PostGIS metadata helpers are not part of Knot's API surface.
REVOKE ALL ON FUNCTION st_estimatedextent(TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION st_estimatedextent(TEXT, TEXT, TEXT)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION st_estimatedextent(TEXT, TEXT, TEXT, BOOLEAN)
    FROM PUBLIC, anon, authenticated;
