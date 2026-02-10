-- Knot Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    phone TEXT,
    email TEXT,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    photo_url TEXT,
    default_party_size INTEGER DEFAULT 1,
    default_luggage TEXT DEFAULT 'none',
    is_verified BOOLEAN DEFAULT FALSE,
    rating DECIMAL(3,2) DEFAULT 5.00,
    total_rides INTEGER DEFAULT 0
);

-- ============================================
-- TRIP INTENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trip_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    destination TEXT NOT NULL,
    departure_time TIMESTAMPTZ NOT NULL,
    party_size INTEGER NOT NULL DEFAULT 1,
    luggage TEXT NOT NULL DEFAULT 'none',
    ride_type TEXT NOT NULL DEFAULT 'standard' CHECK (ride_type IN ('standard', 'xl')),
    status TEXT NOT NULL DEFAULT 'searching' CHECK (status IN ('searching', 'matched', 'confirmed', 'completed', 'cancelled')),
    rough_location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8)
);

-- ============================================
-- MATCHES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    trip_intent_1 UUID REFERENCES public.trip_intents(id) ON DELETE CASCADE NOT NULL,
    trip_intent_2 UUID REFERENCES public.trip_intents(id) ON DELETE CASCADE NOT NULL,
    user_1 UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_2 UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    user_1_interested BOOLEAN DEFAULT FALSE,
    user_2_interested BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'mutual', 'meetup_pending', 'meetup_confirmed', 'completed')),
    UNIQUE(trip_intent_1, trip_intent_2)
);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE
);

-- ============================================
-- MEETUP CONFIRMATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.meetup_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    location_name TEXT NOT NULL,
    location_type TEXT NOT NULL DEFAULT 'landmark' CHECK (location_type IN ('terminal', 'landmark', 'rideshare_zone', 'custom')),
    confirmed BOOLEAN DEFAULT TRUE,
    UNIQUE(match_id, user_id)
);

-- ============================================
-- TRIP RATINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.trip_ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    match_id UUID REFERENCES public.matches(id) ON DELETE CASCADE NOT NULL,
    rater_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rated_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    would_ride_again BOOLEAN DEFAULT TRUE,
    comment TEXT,
    UNIQUE(match_id, rater_id)
);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetup_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_ratings ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all profiles but only update their own
CREATE POLICY "Profiles are viewable by all authenticated users" ON public.profiles
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trip Intents: Users can manage their own, view searching trips
CREATE POLICY "Users can view searching trip intents" ON public.trip_intents
    FOR SELECT USING (status = 'searching' OR user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their own trip intents" ON public.trip_intents
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their own trip intents" ON public.trip_intents
    FOR UPDATE USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their own trip intents" ON public.trip_intents
    FOR DELETE USING (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Matches: Users can view matches they're part of
CREATE POLICY "Users can view their matches" ON public.matches
    FOR SELECT USING (
        user_1 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR 
        user_2 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert matches" ON public.matches
    FOR INSERT WITH CHECK (
        user_1 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR 
        user_2 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update their matches" ON public.matches
    FOR UPDATE USING (
        user_1 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR 
        user_2 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

-- Messages: Users can view/send messages in their matches
CREATE POLICY "Users can view messages in their matches" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.matches 
            WHERE matches.id = messages.match_id 
            AND (
                matches.user_1 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR 
                matches.user_2 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can send messages in their matches" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) AND
        EXISTS (
            SELECT 1 FROM public.matches 
            WHERE matches.id = messages.match_id 
            AND (
                matches.user_1 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR 
                matches.user_2 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
            )
        )
    );

-- Meetup Confirmations: Users can manage their own confirmations
CREATE POLICY "Users can view confirmations in their matches" ON public.meetup_confirmations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.matches 
            WHERE matches.id = meetup_confirmations.match_id 
            AND (
                matches.user_1 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR 
                matches.user_2 IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
            )
        )
    );

CREATE POLICY "Users can create their own confirmations" ON public.meetup_confirmations
    FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Trip Ratings: Users can view ratings about themselves, create ratings for completed trips
CREATE POLICY "Users can view ratings about them" ON public.trip_ratings
    FOR SELECT USING (
        rated_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()) OR 
        rater_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create ratings" ON public.trip_ratings
    FOR INSERT WITH CHECK (rater_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, phone, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.phone,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_intents_user_id ON public.trip_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_trip_intents_status ON public.trip_intents(status);
CREATE INDEX IF NOT EXISTS idx_trip_intents_departure_time ON public.trip_intents(departure_time);
CREATE INDEX IF NOT EXISTS idx_matches_users ON public.matches(user_1, user_2);
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);

-- ============================================
-- ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
