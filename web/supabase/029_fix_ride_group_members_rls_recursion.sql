-- =============================================
-- 029_fix_ride_group_members_rls_recursion.sql
-- The original ride_group_members_select policy subqueried ride_group_members,
-- which re-entered the same policy and caused: infinite recursion detected in policy
-- for relation "ride_group_members". Use a SECURITY DEFINER helper with
-- row_security off for the membership check.
-- =============================================

SET search_path = public;

CREATE OR REPLACE FUNCTION ride_group_members_visible_to_me(
    p_ride_id UUID,
    p_ride_group_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM rides r
        WHERE r.id = p_ride_id
          AND r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    )
    OR EXISTS (
        SELECT 1
        FROM ride_group_members rgm
        JOIN rides r ON r.id = rgm.ride_id
        WHERE rgm.ride_group_id = p_ride_group_id
          AND rgm.left_at IS NULL
          AND r.user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );
$$;

REVOKE EXECUTE ON FUNCTION ride_group_members_visible_to_me(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ride_group_members_visible_to_me(UUID, UUID) TO authenticated;

DROP POLICY IF EXISTS "ride_group_members_select" ON ride_group_members;
CREATE POLICY "ride_group_members_select" ON ride_group_members
    FOR SELECT USING (ride_group_members_visible_to_me(ride_id, ride_group_id));
