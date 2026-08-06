-- =============================================
-- 042_explicit_rls_and_profile_privacy.sql
-- Use explicit Data API grants, authenticated-only policies, and safe profile
-- projections. Private profile fields are available only to their owner.
-- =============================================

SET search_path = public;

CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT id
    FROM profiles
    WHERE user_id = (SELECT auth.uid())
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION current_profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION current_profile_id() TO authenticated;

CREATE OR REPLACE FUNCTION get_my_profile()
RETURNS SETOF profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
    SELECT p.*
    FROM profiles p
    WHERE p.user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_profile() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION get_public_profile(p_profile_id UUID)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    is_verified BOOLEAN,
    rating NUMERIC,
    total_rides INTEGER,
    phone_verified BOOLEAN,
    email_verified BOOLEAN,
    id_verified BOOLEAN,
    completed_rides INTEGER,
    gender_preference TEXT,
    gender_identity TEXT,
    bio TEXT,
    school TEXT,
    conversation_pref TEXT,
    music_pref TEXT,
    smoking_pref TEXT
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT
        p.id,
        p.created_at,
        p.first_name,
        p.last_name,
        p.photo_url,
        p.is_verified,
        p.rating,
        p.total_rides,
        p.phone_verified,
        p.email_verified,
        p.id_verified,
        p.completed_rides,
        p.gender_preference,
        p.gender_identity,
        p.bio,
        p.school,
        p.conversation_pref,
        p.music_pref,
        p.smoking_pref
    FROM profiles p
    WHERE p.id = p_profile_id
      AND (SELECT auth.uid()) IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION get_public_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_public_profile(UUID) TO authenticated, service_role;

-- Profiles: everyone signed in may see the social fields, but email, phone,
-- defaults, and trust counters are not directly selectable across accounts.
DROP POLICY IF EXISTS "Profiles are viewable by all authenticated users" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Profiles are viewable by all authenticated users"
    ON profiles FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Rides.
DROP POLICY IF EXISTS "rides_select_active" ON rides;
DROP POLICY IF EXISTS "rides_insert_own" ON rides;
DROP POLICY IF EXISTS "rides_update_own" ON rides;
DROP POLICY IF EXISTS "rides_delete_own" ON rides;

CREATE POLICY "rides_select_active"
    ON rides FOR SELECT TO authenticated
    USING (status = 'active' OR user_id = (SELECT current_profile_id()));

CREATE POLICY "rides_insert_own"
    ON rides FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT current_profile_id()));

CREATE POLICY "rides_update_own"
    ON rides FOR UPDATE TO authenticated
    USING (user_id = (SELECT current_profile_id()))
    WITH CHECK (user_id = (SELECT current_profile_id()));

CREATE POLICY "rides_delete_own"
    ON rides FOR DELETE TO authenticated
    USING (user_id = (SELECT current_profile_id()));

-- Match requests. Trigger functions enforce valid status transitions and join
-- compatibility; RLS restricts rows to the two participating ride owners.
DROP POLICY IF EXISTS "ride_requests_select" ON ride_requests;
DROP POLICY IF EXISTS "ride_requests_insert" ON ride_requests;
DROP POLICY IF EXISTS "ride_requests_update" ON ride_requests;

CREATE POLICY "ride_requests_select"
    ON ride_requests FOR SELECT TO authenticated
    USING (
        ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT current_profile_id()))
        OR requester_ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT current_profile_id()))
    );

CREATE POLICY "ride_requests_insert"
    ON ride_requests FOR INSERT TO authenticated
    WITH CHECK (
        status = 'pending'
        AND requester_ride_id IN (
            SELECT id
            FROM rides
            WHERE user_id = (SELECT current_profile_id())
              AND status = 'active'
              AND departure_latest >= NOW()
        )
        AND ride_id IN (
            SELECT id
            FROM rides
            WHERE status = 'active'
              AND departure_latest >= NOW()
        )
    );

CREATE POLICY "ride_requests_update"
    ON ride_requests FOR UPDATE TO authenticated
    USING (
        ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT current_profile_id()))
        OR requester_ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT current_profile_id()))
    )
    WITH CHECK (
        ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT current_profile_id()))
        OR requester_ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT current_profile_id()))
    );

-- Living ride groups.
DROP POLICY IF EXISTS "ride_groups_select" ON ride_groups;
CREATE POLICY "ride_groups_select"
    ON ride_groups FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT rgm.ride_group_id
            FROM ride_group_members rgm
            JOIN rides r ON r.id = rgm.ride_id
            WHERE rgm.left_at IS NULL
              AND r.user_id = (SELECT current_profile_id())
        )
    );

DROP POLICY IF EXISTS "ride_group_members_select" ON ride_group_members;
CREATE POLICY "ride_group_members_select"
    ON ride_group_members FOR SELECT TO authenticated
    USING (ride_group_members_visible_to_me(ride_id, ride_group_id));

-- Messages.
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

CREATE POLICY "messages_select"
    ON messages FOR SELECT TO authenticated
    USING (
        (
            ride_group_id IS NULL
            AND conversation_id IN (
                SELECT rr.id
                FROM ride_requests rr
                JOIN rides r1 ON r1.id = rr.ride_id
                JOIN rides r2 ON r2.id = rr.requester_ride_id
                WHERE r1.user_id = (SELECT current_profile_id())
                   OR r2.user_id = (SELECT current_profile_id())
            )
        )
        OR
        (
            ride_group_id IS NOT NULL
            AND ride_group_id IN (
                SELECT rgm.ride_group_id
                FROM ride_group_members rgm
                JOIN rides r ON r.id = rgm.ride_id
                WHERE rgm.left_at IS NULL
                  AND r.user_id = (SELECT current_profile_id())
            )
        )
    );

CREATE POLICY "messages_insert"
    ON messages FOR INSERT TO authenticated
    WITH CHECK (
        sender_id = (SELECT current_profile_id())
        AND COALESCE(message_type, 'text') <> 'system'
        AND (
            (
                ride_group_id IS NULL
                AND conversation_id IN (
                    SELECT rr.id
                    FROM ride_requests rr
                    JOIN rides r1 ON r1.id = rr.ride_id
                    JOIN rides r2 ON r2.id = rr.requester_ride_id
                    WHERE r1.user_id = (SELECT current_profile_id())
                       OR r2.user_id = (SELECT current_profile_id())
                )
            )
            OR
            (
                ride_group_id IS NOT NULL
                AND ride_group_id IN (
                    SELECT rgm.ride_group_id
                    FROM ride_group_members rgm
                    JOIN rides r ON r.id = rgm.ride_id
                    WHERE rgm.left_at IS NULL
                      AND r.user_id = (SELECT current_profile_id())
                )
            )
        )
    );

CREATE POLICY "messages_update"
    ON messages FOR UPDATE TO authenticated
    USING (
        (
            ride_group_id IS NULL
            AND conversation_id IN (
                SELECT rr.id
                FROM ride_requests rr
                JOIN rides r1 ON r1.id = rr.ride_id
                JOIN rides r2 ON r2.id = rr.requester_ride_id
                WHERE r1.user_id = (SELECT current_profile_id())
                   OR r2.user_id = (SELECT current_profile_id())
            )
        )
        OR
        (
            ride_group_id IS NOT NULL
            AND ride_group_id IN (
                SELECT rgm.ride_group_id
                FROM ride_group_members rgm
                JOIN rides r ON r.id = rgm.ride_id
                WHERE rgm.left_at IS NULL
                  AND r.user_id = (SELECT current_profile_id())
            )
        )
    )
    WITH CHECK (
        (
            ride_group_id IS NULL
            AND conversation_id IN (
                SELECT rr.id
                FROM ride_requests rr
                JOIN rides r1 ON r1.id = rr.ride_id
                JOIN rides r2 ON r2.id = rr.requester_ride_id
                WHERE r1.user_id = (SELECT current_profile_id())
                   OR r2.user_id = (SELECT current_profile_id())
            )
        )
        OR
        (
            ride_group_id IS NOT NULL
            AND ride_group_id IN (
                SELECT rgm.ride_group_id
                FROM ride_group_members rgm
                JOIN rides r ON r.id = rgm.ride_id
                WHERE rgm.left_at IS NULL
                  AND r.user_id = (SELECT current_profile_id())
            )
        )
    );

-- Safety records.
DROP POLICY IF EXISTS "blocked_users_select_own" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_insert_own" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_delete_own" ON blocked_users;

CREATE POLICY "blocked_users_select_own"
    ON blocked_users FOR SELECT TO authenticated
    USING (blocker_profile_id = (SELECT current_profile_id()));
CREATE POLICY "blocked_users_insert_own"
    ON blocked_users FOR INSERT TO authenticated
    WITH CHECK (blocker_profile_id = (SELECT current_profile_id()));
CREATE POLICY "blocked_users_delete_own"
    ON blocked_users FOR DELETE TO authenticated
    USING (blocker_profile_id = (SELECT current_profile_id()));

DROP POLICY IF EXISTS "user_reports_select_own" ON user_reports;
DROP POLICY IF EXISTS "user_reports_insert_own" ON user_reports;

CREATE POLICY "user_reports_select_own"
    ON user_reports FOR SELECT TO authenticated
    USING (reporter_profile_id = (SELECT current_profile_id()));
CREATE POLICY "user_reports_insert_own"
    ON user_reports FOR INSERT TO authenticated
    WITH CHECK (reporter_profile_id = (SELECT current_profile_id()));

-- Explicit Data API privileges. This is required by Supabase's current table
-- exposure model and prevents anonymous access even before RLS is evaluated.
REVOKE ALL ON TABLE profiles FROM anon, authenticated;
GRANT SELECT (
    id, user_id, created_at, updated_at, first_name, last_name, photo_url,
    is_verified, rating, total_rides, phone_verified, email_verified,
    id_verified, completed_rides, gender_preference, gender_identity, bio,
    school, conversation_pref, music_pref, smoking_pref
) ON profiles TO authenticated;
GRANT INSERT (
    user_id, email, first_name, last_name, phone, photo_url,
    default_party_size, default_luggage, gender_preference, gender_identity,
    bio, school, conversation_pref, music_pref, smoking_pref
) ON profiles TO authenticated;
GRANT UPDATE (
    email, first_name, last_name, phone, photo_url, default_party_size,
    default_luggage, gender_preference, gender_identity, bio, school,
    conversation_pref, music_pref, smoking_pref
) ON profiles TO authenticated;

REVOKE ALL ON TABLE rides FROM anon, authenticated;
GRANT SELECT, DELETE ON TABLE rides TO authenticated;
GRANT INSERT (
    user_id, ride_type, origin_lat, origin_lng, origin_name, dest_lat,
    dest_lng, dest_name, departure_earliest, departure_latest,
    departure_preferred, departure_timezone, seats_available, seats_needed,
    space_capacity, gender_pref, quiet_ride, music_ok, pets_ok, smoking_ok,
    verified_only, status, notes
) ON rides TO authenticated;
GRANT UPDATE (
    origin_lat, origin_lng, origin_name, dest_lat, dest_lng, dest_name,
    departure_earliest, departure_latest, departure_preferred,
    departure_timezone, seats_available, seats_needed, space_capacity,
    gender_pref, quiet_ride, music_ok, pets_ok, smoking_ok, verified_only,
    status, notes
) ON rides TO authenticated;

REVOKE ALL ON TABLE ride_requests FROM anon, authenticated;
GRANT SELECT ON TABLE ride_requests TO authenticated;
GRANT INSERT (ride_id, requester_ride_id) ON ride_requests TO authenticated;
GRANT UPDATE (status, ride_status) ON ride_requests TO authenticated;

REVOKE ALL ON TABLE messages FROM anon, authenticated;
GRANT SELECT ON TABLE messages TO authenticated;
GRANT INSERT (
    conversation_id, ride_group_id, sender_id, content, message_type, metadata
) ON messages TO authenticated;
GRANT UPDATE (read_at) ON messages TO authenticated;

REVOKE ALL ON TABLE ride_groups, ride_group_members FROM anon, authenticated;
GRANT SELECT ON TABLE ride_groups, ride_group_members TO authenticated;

REVOKE ALL ON TABLE blocked_users FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE blocked_users TO authenticated;

REVOKE ALL ON TABLE user_reports FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE user_reports TO authenticated;

REVOKE ALL ON TABLE message_email_cooldowns FROM anon, authenticated;

REVOKE ALL ON TABLE waitlist FROM anon, authenticated;
GRANT INSERT ON TABLE waitlist TO anon;

-- Public defaults make every new function callable. Keep only the intended
-- authenticated RPCs and the intentionally anonymous waitlist counter.
REVOKE ALL ON FUNCTION get_message_thread_summaries(UUID, UUID[], UUID[])
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_message_thread_summaries(UUID, UUID[], UUID[])
    TO authenticated, service_role;

REVOKE ALL ON FUNCTION active_system_sender_for_group(UUID)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION luggage_units_from_space_capacity(INTEGER)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION pick_main_ride_for_group(UUID)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION ride_display_name(UUID)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION set_ride_status_on_accept()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION update_rides_updated_at()
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION update_updated_at_column()
    FROM PUBLIC, anon, authenticated;

-- Cover foreign keys used by safety and notification cleanup queries.
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_profile
    ON blocked_users(blocked_profile_id);
CREATE INDEX IF NOT EXISTS idx_message_email_cooldowns_recipient
    ON message_email_cooldowns(recipient_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter
    ON user_reports(reporter_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported
    ON user_reports(reported_profile_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_request
    ON user_reports(ride_request_id);

-- Remove indexes fully covered by stronger indexes on the same leading keys.
DROP INDEX IF EXISTS idx_profiles_user_id;
DROP INDEX IF EXISTS idx_rides_active;
DROP INDEX IF EXISTS idx_rides_user;
