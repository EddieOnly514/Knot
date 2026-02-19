-- =============================================
-- 009_user_safety.sql
-- Blocked users and user reports
-- =============================================

-- 1. Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT blocked_users_unique_pair UNIQUE (blocker_profile_id, blocked_profile_id),
    CONSTRAINT blocked_users_not_self CHECK (blocker_profile_id <> blocked_profile_id)
);

-- 2. User reports table
CREATE TABLE IF NOT EXISTS user_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    ride_request_id UUID REFERENCES ride_requests(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Row Level Security
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- Blocked users: users can see and manage only their own block list
DROP POLICY IF EXISTS "blocked_users_select_own" ON blocked_users;
CREATE POLICY "blocked_users_select_own" ON blocked_users
    FOR SELECT USING (
        blocker_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "blocked_users_insert_own" ON blocked_users;
CREATE POLICY "blocked_users_insert_own" ON blocked_users
    FOR INSERT WITH CHECK (
        blocker_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "blocked_users_delete_own" ON blocked_users;
CREATE POLICY "blocked_users_delete_own" ON blocked_users
    FOR DELETE USING (
        blocker_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

-- User reports: users can create reports; read access can be restricted to admins later
DROP POLICY IF EXISTS "user_reports_insert_own" ON user_reports;
CREATE POLICY "user_reports_insert_own" ON user_reports
    FOR INSERT WITH CHECK (
        reporter_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

-- Optional: allow reporters to see their own reports
DROP POLICY IF EXISTS "user_reports_select_own" ON user_reports;
CREATE POLICY "user_reports_select_own" ON user_reports
    FOR SELECT USING (
        reporter_profile_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
    );

