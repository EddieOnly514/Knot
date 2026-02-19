-- =============================================
-- 005_schema_v3.sql
-- Full matching system overhaul
-- =============================================

-- =============================================
-- 1. PROFILES — add trust/verification fields
-- =============================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS completed_rides INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender_preference TEXT DEFAULT 'any';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS conversation_pref TEXT DEFAULT 'chill';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS music_pref TEXT DEFAULT 'no_preference';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS smoking_pref TEXT DEFAULT 'no';


-- =============================================
-- 2. RIDES TABLE (replaces trip_intents)
-- =============================================

CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Type: offering a ride or seeking one
    ride_type TEXT NOT NULL CHECK (ride_type IN ('offering', 'seeking')),

    -- Origin location
    origin_lat DECIMAL(10, 7),
    origin_lng DECIMAL(10, 7),
    origin_name TEXT NOT NULL,

    -- Destination location
    dest_lat DECIMAL(10, 7),
    dest_lng DECIMAL(10, 7),
    dest_name TEXT NOT NULL,

    -- Time window
    departure_earliest TIMESTAMPTZ NOT NULL,
    departure_latest TIMESTAMPTZ NOT NULL,
    departure_preferred TIMESTAMPTZ,

    -- Capacity
    seats_available INTEGER DEFAULT 1 CHECK (seats_available >= 0 AND seats_available <= 6),
    seats_needed INTEGER DEFAULT 1 CHECK (seats_needed >= 1 AND seats_needed <= 4),
    space_capacity INTEGER DEFAULT 1 CHECK (space_capacity >= 0 AND space_capacity <= 3),
    -- 0 = no extra space, 1 = small bag, 2 = a suitcase, 3 = multiple/bulky items

    -- Ride preferences
    gender_pref TEXT DEFAULT 'any' CHECK (gender_pref IN ('any', 'male', 'female')),
    quiet_ride BOOLEAN DEFAULT FALSE,
    music_ok BOOLEAN DEFAULT TRUE,
    pets_ok BOOLEAN DEFAULT FALSE,
    smoking_ok BOOLEAN DEFAULT FALSE,
    verified_only BOOLEAN DEFAULT FALSE,

    -- Status tracking
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'matched', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure departure_latest >= departure_earliest
    CONSTRAINT valid_time_window CHECK (departure_latest >= departure_earliest)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_rides_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

DROP TRIGGER IF EXISTS rides_updated_at ON rides;
CREATE TRIGGER rides_updated_at
    BEFORE UPDATE ON rides
    FOR EACH ROW EXECUTE FUNCTION update_rides_updated_at();


-- =============================================
-- 3. RIDE_MATCHES — pre-computed score cache
-- =============================================

CREATE TABLE IF NOT EXISTS ride_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    matched_ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,

    -- Scores
    total_score INTEGER NOT NULL DEFAULT 0,
    score_route INTEGER NOT NULL DEFAULT 0,
    score_time INTEGER NOT NULL DEFAULT 0,
    score_trust INTEGER NOT NULL DEFAULT 0,
    score_space INTEGER NOT NULL DEFAULT 0,
    score_prefs INTEGER NOT NULL DEFAULT 0,

    -- Metadata
    time_overlap_minutes INTEGER DEFAULT 0,
    detour_ratio DECIMAL(5, 3) DEFAULT 1.0,
    origin_distance_miles DECIMAL(8, 2),
    dest_distance_miles DECIMAL(8, 2),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ride_id, matched_ride_id)
);


-- =============================================
-- 4. RIDE_REQUESTS — accept/reject tracking
-- =============================================

CREATE TABLE IF NOT EXISTS ride_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    requester_ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ride_id, requester_ride_id)
);


-- =============================================
-- 5. INDEXES
-- =============================================

-- Active rides lookup (most common query)
CREATE INDEX IF NOT EXISTS idx_rides_active
    ON rides(status, ride_type, departure_earliest)
    WHERE status = 'active';

-- Geographic: origin and destination
CREATE INDEX IF NOT EXISTS idx_rides_origin_geo
    ON rides(origin_lat, origin_lng)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_rides_dest_geo
    ON rides(dest_lat, dest_lng)
    WHERE status = 'active';

-- User's rides
CREATE INDEX IF NOT EXISTS idx_rides_user
    ON rides(user_id, status);

-- Match cache: fast lookup by ride + score
CREATE INDEX IF NOT EXISTS idx_ride_matches_lookup
    ON ride_matches(ride_id, total_score DESC);

-- Requests: lookup by ride
CREATE INDEX IF NOT EXISTS idx_ride_requests_ride
    ON ride_requests(ride_id, status);

CREATE INDEX IF NOT EXISTS idx_ride_requests_requester
    ON ride_requests(requester_ride_id, status);


-- =============================================
-- 6. HAVERSINE DISTANCE (miles)
-- =============================================

CREATE OR REPLACE FUNCTION haversine_miles(
    lat1 DECIMAL, lng1 DECIMAL,
    lat2 DECIMAL, lng2 DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    r CONSTANT DECIMAL := 3959.0;  -- Earth radius in miles
    dlat DECIMAL;
    dlng DECIMAL;
    a DECIMAL;
BEGIN
    IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
        RETURN NULL;
    END IF;

    dlat := RADIANS(lat2 - lat1);
    dlng := RADIANS(lng2 - lng1);
    a := SIN(dlat / 2) ^ 2
       + COS(RADIANS(lat1)) * COS(RADIANS(lat2)) * SIN(dlng / 2) ^ 2;
    RETURN r * 2 * ASIN(SQRT(a));
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;


-- =============================================
-- 7. TIME OVERLAP CALCULATOR
-- =============================================

CREATE OR REPLACE FUNCTION calculate_time_overlap(
    earliest1 TIMESTAMPTZ, latest1 TIMESTAMPTZ,
    earliest2 TIMESTAMPTZ, latest2 TIMESTAMPTZ
)
RETURNS INTEGER AS $$
DECLARE
    overlap_start TIMESTAMPTZ;
    overlap_end TIMESTAMPTZ;
BEGIN
    overlap_start := GREATEST(earliest1, earliest2);
    overlap_end := LEAST(latest1, latest2);

    IF overlap_end <= overlap_start THEN
        RETURN 0;
    END IF;

    RETURN EXTRACT(EPOCH FROM (overlap_end - overlap_start))::INTEGER / 60;
END;
$$ LANGUAGE plpgsql IMMUTABLE
SET search_path = public;


-- =============================================
-- 8. MAIN MATCHING FUNCTION — find_matches_v3
-- =============================================

DROP FUNCTION IF EXISTS find_matches_v3(UUID, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION find_matches_v3(
    p_ride_id UUID,
    p_max_results INTEGER DEFAULT 10,
    p_min_score INTEGER DEFAULT 30
)
RETURNS TABLE (
    ride_id UUID,
    user_id UUID,
    ride_type TEXT,
    origin_name TEXT,
    dest_name TEXT,
    departure_earliest TIMESTAMPTZ,
    departure_latest TIMESTAMPTZ,
    departure_preferred TIMESTAMPTZ,
    seats_available INTEGER,
    seats_needed INTEGER,
    space_capacity INTEGER,
    gender_pref TEXT,
    quiet_ride BOOLEAN,
    music_ok BOOLEAN,
    -- User profile
    first_name TEXT,
    last_name TEXT,
    photo_url TEXT,
    bio TEXT,
    rating DECIMAL,
    total_rides INTEGER,
    phone_verified BOOLEAN,
    email_verified BOOLEAN,
    id_verified BOOLEAN,
    -- Scores
    total_score INTEGER,
    score_route INTEGER,
    score_time INTEGER,
    score_trust INTEGER,
    score_space INTEGER,
    score_prefs INTEGER,
    -- Metadata
    origin_distance_miles DECIMAL,
    dest_distance_miles DECIMAL,
    time_overlap_minutes INTEGER,
    match_label TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_my rides%ROWTYPE;
    v_my_profile profiles%ROWTYPE;
BEGIN
    -- Get the requesting ride
    SELECT * INTO v_my FROM rides WHERE id = p_ride_id;
    IF v_my IS NULL THEN
        RAISE EXCEPTION 'Ride not found: %', p_ride_id;
    END IF;

    -- Get the requesting user's profile
    SELECT * INTO v_my_profile FROM profiles WHERE id = v_my.user_id;

    RETURN QUERY
    WITH candidates AS (
        SELECT
            r.*,
            p.first_name AS p_first_name,
            p.last_name AS p_last_name,
            p.photo_url AS p_photo_url,
            p.bio AS p_bio,
            p.rating AS p_rating,
            p.total_rides AS p_total_rides,
            p.phone_verified AS p_phone_verified,
            p.email_verified AS p_email_verified,
            p.id_verified AS p_id_verified,
            p.completed_rides AS p_completed_rides,
            -- Pre-compute distances
            haversine_miles(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng) AS _origin_dist,
            haversine_miles(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng) AS _dest_dist,
            -- Pre-compute time overlap
            calculate_time_overlap(
                v_my.departure_earliest, v_my.departure_latest,
                r.departure_earliest, r.departure_latest
            ) AS _time_overlap,
            -- Smaller window size for percentage calculation
            LEAST(
                EXTRACT(EPOCH FROM (v_my.departure_latest - v_my.departure_earliest))::INTEGER / 60,
                EXTRACT(EPOCH FROM (r.departure_latest - r.departure_earliest))::INTEGER / 60
            ) AS _smaller_window
        FROM rides r
        JOIN profiles p ON p.id = r.user_id
        WHERE r.id != p_ride_id
          AND r.user_id != v_my.user_id
          AND r.status = 'active'
          -- Opposite ride types
          AND r.ride_type != v_my.ride_type
          -- Time window overlap >= 20 minutes
          AND calculate_time_overlap(
                v_my.departure_earliest, v_my.departure_latest,
                r.departure_earliest, r.departure_latest
              ) >= 20
          -- Seats fit
          AND (
              (v_my.ride_type = 'seeking' AND r.seats_available >= v_my.seats_needed)
              OR
              (v_my.ride_type = 'offering' AND v_my.seats_available >= r.seats_needed)
          )
          -- Origin proximity: within 5 miles (or no coords)
          AND (
              v_my.origin_lat IS NULL OR r.origin_lat IS NULL
              OR haversine_miles(v_my.origin_lat, v_my.origin_lng, r.origin_lat, r.origin_lng) <= 5.0
          )
          -- Destination proximity: within 5 miles (or no coords)
          AND (
              v_my.dest_lat IS NULL OR r.dest_lat IS NULL
              OR haversine_miles(v_my.dest_lat, v_my.dest_lng, r.dest_lat, r.dest_lng) <= 5.0
          )
          -- Verified-only filter
          AND (
              NOT r.verified_only
              OR v_my_profile.id_verified
          )
          AND (
              NOT v_my.verified_only
              OR p.id_verified
          )
    ),
    scored AS (
        SELECT
            c.*,
            -- ===== ROUTE SCORE (40 pts) =====
            (
                -- Origin proximity: 20 pts
                CASE
                    WHEN c._origin_dist IS NULL THEN 10  -- partial credit
                    WHEN c._origin_dist <= 0.5 THEN 20
                    WHEN c._origin_dist <= 1.0 THEN 17
                    WHEN c._origin_dist <= 2.0 THEN 14
                    WHEN c._origin_dist <= 3.0 THEN 10
                    WHEN c._origin_dist <= 4.0 THEN 6
                    ELSE 3
                END
                +
                -- Destination proximity: 20 pts
                CASE
                    WHEN c._dest_dist IS NULL THEN 10  -- partial credit
                    WHEN c._dest_dist <= 0.5 THEN 20
                    WHEN c._dest_dist <= 1.0 THEN 17
                    WHEN c._dest_dist <= 2.0 THEN 14
                    WHEN c._dest_dist <= 3.0 THEN 10
                    WHEN c._dest_dist <= 4.0 THEN 6
                    ELSE 3
                END
            )::INTEGER AS _score_route,

            -- ===== TIME SCORE (30 pts) =====
            (
                -- Time overlap as % of smaller window: 25 pts
                CASE
                    WHEN c._smaller_window <= 0 THEN 0
                    ELSE LEAST(25, ROUND(25.0 * c._time_overlap / GREATEST(c._smaller_window, 1)))
                END
                +
                -- Preferred time proximity bonus: 5 pts
                CASE
                    WHEN v_my.departure_preferred IS NOT NULL AND c.departure_preferred IS NOT NULL THEN
                        CASE
                            WHEN ABS(EXTRACT(EPOCH FROM (v_my.departure_preferred - c.departure_preferred))) <= 900 THEN 5  -- within 15 min
                            WHEN ABS(EXTRACT(EPOCH FROM (v_my.departure_preferred - c.departure_preferred))) <= 1800 THEN 3  -- within 30 min
                            ELSE 1
                        END
                    ELSE 2  -- partial credit if no preferred time
                END
            )::INTEGER AS _score_time,

            -- ===== TRUST SCORE (15 pts) =====
            (
                -- Phone verified: 5 pts
                CASE WHEN c.p_phone_verified THEN 5 ELSE 0 END
                +
                -- Email verified: 3 pts
                CASE WHEN c.p_email_verified THEN 3 ELSE 0 END
                +
                -- Completed rides: 0-3 pts
                CASE
                    WHEN c.p_completed_rides >= 10 THEN 3
                    WHEN c.p_completed_rides >= 5 THEN 2
                    WHEN c.p_completed_rides >= 1 THEN 1
                    ELSE 0
                END
                +
                -- Rating: 0-4 pts
                CASE
                    WHEN c.p_rating >= 4.5 THEN 4
                    WHEN c.p_rating >= 4.0 THEN 3
                    WHEN c.p_rating >= 3.5 THEN 2
                    WHEN c.p_rating >= 3.0 THEN 1
                    ELSE 0
                END
            )::INTEGER AS _score_trust,

            -- ===== SPACE SCORE (10 pts) =====
            (
                CASE
                    WHEN v_my.ride_type = 'seeking' THEN
                        -- How much surplus capacity the offering has
                        CASE
                            WHEN r.seats_available - v_my.seats_needed >= 3 THEN 10
                            WHEN r.seats_available - v_my.seats_needed >= 2 THEN 8
                            WHEN r.seats_available - v_my.seats_needed >= 1 THEN 6
                            ELSE 4  -- exact fit
                        END
                    ELSE
                        -- Offering: how well our capacity fits their need
                        CASE
                            WHEN v_my.seats_available - c.seats_needed >= 3 THEN 10
                            WHEN v_my.seats_available - c.seats_needed >= 2 THEN 8
                            WHEN v_my.seats_available - c.seats_needed >= 1 THEN 6
                            ELSE 4
                        END
                END
            )::INTEGER AS _score_space,

            -- ===== PREFERENCES SCORE (5 pts) =====
            (
                -- Gender preference match: 2 pts
                CASE
                    WHEN v_my.gender_pref = 'any' OR c.gender_pref = 'any' THEN 2
                    WHEN v_my.gender_pref = c.gender_pref THEN 2
                    ELSE 0
                END
                +
                -- Quiet ride alignment: 1 pt
                CASE WHEN v_my.quiet_ride = c.quiet_ride THEN 1 ELSE 0 END
                +
                -- Music alignment: 1 pt
                CASE WHEN v_my.music_ok = c.music_ok THEN 1 ELSE 0 END
                +
                -- Pets/smoking: 1 pt combined
                CASE
                    WHEN v_my.pets_ok = c.pets_ok AND v_my.smoking_ok = c.smoking_ok THEN 1
                    ELSE 0
                END
            )::INTEGER AS _score_prefs
        FROM candidates c
        -- Alias r to use in space score
        JOIN rides r ON r.id = c.id
    )
    SELECT
        s.id AS ride_id,
        s.user_id,
        s.ride_type,
        s.origin_name,
        s.dest_name,
        s.departure_earliest,
        s.departure_latest,
        s.departure_preferred,
        s.seats_available,
        s.seats_needed,
        s.space_capacity,
        s.gender_pref,
        s.quiet_ride,
        s.music_ok,
        -- Profile
        s.p_first_name AS first_name,
        s.p_last_name AS last_name,
        s.p_photo_url AS photo_url,
        s.p_bio AS bio,
        s.p_rating AS rating,
        s.p_total_rides AS total_rides,
        s.p_phone_verified AS phone_verified,
        s.p_email_verified AS email_verified,
        s.p_id_verified AS id_verified,
        -- Scores
        (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs)::INTEGER AS total_score,
        s._score_route AS score_route,
        s._score_time AS score_time,
        s._score_trust AS score_trust,
        s._score_space AS score_space,
        s._score_prefs AS score_prefs,
        -- Metadata
        s._origin_dist AS origin_distance_miles,
        s._dest_dist AS dest_distance_miles,
        s._time_overlap AS time_overlap_minutes,
        -- Match label
        CASE
            WHEN (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) >= 85 THEN 'Excellent Match'
            WHEN (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) >= 65 THEN 'Good Match'
            WHEN (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) >= 45 THEN 'Fair Match'
            ELSE 'Possible Match'
        END AS match_label
    FROM scored s
    WHERE (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) >= p_min_score
    ORDER BY (s._score_route + s._score_time + s._score_trust + s._score_space + s._score_prefs) DESC
    LIMIT p_max_results;
END;
$$;


-- =============================================
-- 9. ROW LEVEL SECURITY
-- =============================================

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ride_requests ENABLE ROW LEVEL SECURITY;

-- Rides: users see all active rides, but only modify their own
DROP POLICY IF EXISTS "rides_select_active" ON rides;
CREATE POLICY "rides_select_active" ON rides
    FOR SELECT USING (status = 'active' OR user_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "rides_insert_own" ON rides;
CREATE POLICY "rides_insert_own" ON rides
    FOR INSERT WITH CHECK (user_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "rides_update_own" ON rides;
CREATE POLICY "rides_update_own" ON rides
    FOR UPDATE USING (user_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "rides_delete_own" ON rides;
CREATE POLICY "rides_delete_own" ON rides
    FOR DELETE USING (user_id = (
        SELECT id FROM profiles WHERE user_id = auth.uid()
    ));

-- Ride matches: users see matches involving their rides
DROP POLICY IF EXISTS "ride_matches_select" ON ride_matches;
CREATE POLICY "ride_matches_select" ON ride_matches
    FOR SELECT USING (
        ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
        OR
        matched_ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    );

-- Ride requests: users see requests they sent or received
DROP POLICY IF EXISTS "ride_requests_select" ON ride_requests;
CREATE POLICY "ride_requests_select" ON ride_requests
    FOR SELECT USING (
        ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
        OR
        requester_ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "ride_requests_insert" ON ride_requests;
CREATE POLICY "ride_requests_insert" ON ride_requests
    FOR INSERT WITH CHECK (
        requester_ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    );

DROP POLICY IF EXISTS "ride_requests_update" ON ride_requests;
CREATE POLICY "ride_requests_update" ON ride_requests
    FOR UPDATE USING (
        ride_id IN (SELECT id FROM rides WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid()))
    );
