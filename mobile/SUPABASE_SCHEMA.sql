-- Knot App Database Schema for Supabase
-- MVP Version matching exact specifications

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- For geospatial queries

-- Create custom types/enums
CREATE TYPE trip_mode AS ENUM ('now', 'arrival');
CREATE TYPE trip_status AS ENUM ('active', 'expired', 'canceled', 'completed');
CREATE TYPE match_status AS ENUM ('pending', 'matched', 'meetup_confirmed', 'canceled', 'completed', 'blocked');
CREATE TYPE luggage_level AS ENUM ('none', 'carry_on', 'one_suitcase', 'two_plus');
CREATE TYPE swipe_action AS ENUM ('interested', 'pass');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    photo_url TEXT NOT NULL,
    bio TEXT,
    phone_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip Intents table
CREATE TABLE trip_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    mode trip_mode NOT NULL,
    status trip_status DEFAULT 'active',
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    origin_airport_code TEXT, -- Required if mode='arrival'
    destination_label TEXT NOT NULL, -- e.g., "Downtown", "UCI", "Santa Monica"
    destination_lat DOUBLE PRECISION NOT NULL, -- centroid
    destination_lng DOUBLE PRECISION NOT NULL,
    destination_radius_m INTEGER NOT NULL, -- e.g., 1500
    time_start TIMESTAMP WITH TIME ZONE NOT NULL,
    time_end TIMESTAMP WITH TIME ZONE NOT NULL,
    party_size INTEGER CHECK (party_size >= 1 AND party_size <= 2) DEFAULT 1,
    luggage luggage_level NOT NULL DEFAULT 'carry_on',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Add constraint for arrival mode
    CONSTRAINT arrival_mode_requires_airport CHECK (
        (mode = 'arrival' AND origin_airport_code IS NOT NULL) OR
        (mode = 'now')
    )
);

-- Swipes table (interest actions)
CREATE TABLE swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    trip_intent_id UUID NOT NULL REFERENCES trip_intents(id) ON DELETE CASCADE,
    action swipe_action NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint to prevent duplicate swipes
    UNIQUE(from_user_id, to_user_id, trip_intent_id)
);

-- Matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    trip_intent_a UUID NOT NULL REFERENCES trip_intents(id) ON DELETE CASCADE,
    trip_intent_b UUID NOT NULL REFERENCES trip_intents(id) ON DELETE CASCADE,
    status match_status DEFAULT 'matched',
    meetup_confirm_a BOOLEAN DEFAULT false,
    meetup_confirm_b BOOLEAN DEFAULT false,
    meetup_label TEXT,
    meetup_lat DOUBLE PRECISION,
    meetup_lng DOUBLE PRECISION,
    destination_revealed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure users are different
    CONSTRAINT different_users CHECK (user_a != user_b),
    -- Ensure unique match per user pair and trip
    UNIQUE(user_a, user_b, trip_intent_a, trip_intent_b)
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Blocks table
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint
    UNIQUE(blocker_id, blocked_id)
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ratings table
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    rater_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    ratee_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
    stars INTEGER CHECK (stars >= 1 AND stars <= 5) NOT NULL,
    would_ride_again BOOLEAN NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure one rating per rater/match combination
    UNIQUE(match_id, rater_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_trip_intents_user_id ON trip_intents(user_id);
CREATE INDEX idx_trip_intents_status ON trip_intents(status);
CREATE INDEX idx_trip_intents_time ON trip_intents(time_start, time_end);
CREATE INDEX idx_trip_intents_mode ON trip_intents(mode);
CREATE INDEX idx_trip_intents_location ON trip_intents USING GIST (
    ST_MakePoint(origin_lng, origin_lat)
);
CREATE INDEX idx_trip_intents_destination ON trip_intents USING GIST (
    ST_MakePoint(destination_lng, destination_lat)
);

CREATE INDEX idx_swipes_from_user ON swipes(from_user_id);
CREATE INDEX idx_swipes_to_user ON swipes(to_user_id);

CREATE INDEX idx_matches_users ON matches(user_a, user_b);
CREATE INDEX idx_matches_status ON matches(status);

CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

CREATE INDEX idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX idx_blocks_blocked ON blocks(blocked_id);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles
CREATE POLICY "Users can view all profiles" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trip Intents
CREATE POLICY "Users can view active trip intents" ON trip_intents
    FOR SELECT USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create own trip intents" ON trip_intents
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trip intents" ON trip_intents
    FOR UPDATE USING (auth.uid() = user_id);

-- Swipes
CREATE POLICY "Users can view own swipes" ON swipes
    FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can create own swipes" ON swipes
    FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- Matches
CREATE POLICY "Users can view own matches" ON matches
    FOR SELECT USING (user_a = auth.uid() OR user_b = auth.uid());

CREATE POLICY "Users can update own matches" ON matches
    FOR UPDATE USING (user_a = auth.uid() OR user_b = auth.uid());

-- Messages
CREATE POLICY "Users can view messages in their matches" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM matches
            WHERE matches.id = messages.match_id
            AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
        )
    );

CREATE POLICY "Users can send messages in their matches" ON messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM matches
            WHERE matches.id = match_id
            AND (matches.user_a = auth.uid() OR matches.user_b = auth.uid())
        )
    );

-- Blocks
CREATE POLICY "Users can view their blocks" ON blocks
    FOR SELECT USING (blocker_id = auth.uid());

CREATE POLICY "Users can create blocks" ON blocks
    FOR INSERT WITH CHECK (blocker_id = auth.uid());

-- Reports
CREATE POLICY "Users can create reports" ON reports
    FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- Ratings
CREATE POLICY "Users can view ratings they gave or received" ON ratings
    FOR SELECT USING (rater_id = auth.uid() OR ratee_id = auth.uid());

CREATE POLICY "Users can create ratings" ON ratings
    FOR INSERT WITH CHECK (rater_id = auth.uid());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trip_intents_updated_at BEFORE UPDATE ON trip_intents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically expire old trip intents
CREATE OR REPLACE FUNCTION expire_old_trip_intents()
RETURNS void AS $$
BEGIN
    UPDATE trip_intents
    SET status = 'expired'
    WHERE status = 'active' AND time_end < NOW();
END;
$$ LANGUAGE plpgsql;