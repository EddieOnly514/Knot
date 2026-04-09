-- =============================================
-- 031_fix_find_matches_rls_bypass.sql
-- find_matches_v3 and get_ride_requests_enriched query ride_group_members
-- and other RLS-protected tables. Even though they are SECURITY DEFINER,
-- Supabase's postgres role may not bypass RLS unless row_security is off.
-- Without this, find_matches_v3 silently fails or returns empty results
-- when evaluating candidate group membership.
-- =============================================

SET search_path = public;

ALTER FUNCTION public.find_matches_v3(UUID, INTEGER, INTEGER) SET row_security TO off;
ALTER FUNCTION public.get_ride_requests_enriched(UUID) SET row_security TO off;
ALTER FUNCTION public.count_group_seats_for_ride(UUID) SET row_security TO off;
ALTER FUNCTION public.check_ride_match_cap() SET row_security TO off;
ALTER FUNCTION public.ride_fits_group_core(UUID, TIMESTAMPTZ, TIMESTAMPTZ, DECIMAL, DECIMAL, INTEGER, UUID) SET row_security TO off;
