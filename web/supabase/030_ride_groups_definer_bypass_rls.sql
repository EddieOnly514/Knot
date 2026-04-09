-- =============================================
-- 030_ride_groups_definer_bypass_rls.sql
-- SECURITY DEFINER does not bypass RLS; policies still apply as the invoking user.
-- Group sync triggers INSERT/UPDATE ride_groups (including ride_id = main ride, which
-- may not be the acting user's ride), INSERT ride_group_members (no client INSERT policy),
-- and system messages. Set row_security off on these trusted server functions.
-- =============================================

SET search_path = public;

ALTER FUNCTION public.append_group_system_message(uuid, text, jsonb) SET row_security TO off;
ALTER FUNCTION public.recalculate_ride_group(uuid, text) SET row_security TO off;
ALTER FUNCTION public.upsert_group_member(uuid, uuid, boolean) SET row_security TO off;
ALTER FUNCTION public.validate_group_join_on_accept() SET row_security TO off;
ALTER FUNCTION public.sync_group_after_accept() SET row_security TO off;
ALTER FUNCTION public.sync_group_after_request_exit() SET row_security TO off;
ALTER FUNCTION public.sync_group_after_ride_update() SET row_security TO off;
ALTER FUNCTION public.leave_current_ride_group(uuid) SET row_security TO off;
ALTER FUNCTION public.leave_ride_group(uuid) SET row_security TO off;
