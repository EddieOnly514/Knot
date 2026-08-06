-- =============================================
-- 037_function_acl_hardening.sql
-- Supabase may auto-grant newly created functions to anon/authenticated.
-- Keep only the RPCs intentionally exposed by the current Knot application.
-- =============================================

SET search_path = public;

-- Current matcher: signed-in riders only. Ownership is also checked in V4.
REVOKE EXECUTE ON FUNCTION find_matches_v4(UUID, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION find_matches_v4(UUID, INTEGER) TO authenticated, service_role;

-- Group exits validate the caller internally, but anonymous users do not need
-- function access at all.
REVOKE EXECUTE ON FUNCTION leave_current_ride_group(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION leave_ride_group(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION leave_current_ride_group(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_ride_group(UUID) TO authenticated;

-- This helper is used by an RLS policy and validates auth.uid().
REVOKE EXECUTE ON FUNCTION ride_group_members_visible_to_me(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ride_group_members_visible_to_me(UUID, UUID) TO authenticated;

-- Retired trip-intent APIs are not used by the rides-based Next.js app and
-- predate its ownership protections.
REVOKE EXECUTE ON FUNCTION check_and_update_mutual_match(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION express_interest(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION find_potential_matches(UUID, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
