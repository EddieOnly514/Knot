-- Seed Data for Knot App Testing
-- Run this in Supabase SQL Editor after the main migration

-- ============================================
-- TEST USERS (Profiles)
-- ============================================
-- Note: These are standalone test profiles without auth.users
-- For real testing, users need to sign up via the app

INSERT INTO public.profiles (id, user_id, phone, email, first_name, last_name, photo_url, default_party_size, default_luggage, is_verified, rating, total_rides)
VALUES 
  -- Test User 1: Sarah
  ('11111111-1111-1111-1111-111111111111', NULL, '+15551111111', 'sarah@test.com', 'Sarah', 'Chen', 'https://randomuser.me/api/portraits/women/44.jpg', 1, 'one', true, 4.9, 12),
  
  -- Test User 2: Mike
  ('22222222-2222-2222-2222-222222222222', NULL, '+15552222222', 'mike@test.com', 'Mike', 'Johnson', 'https://randomuser.me/api/portraits/men/32.jpg', 2, 'two', true, 4.7, 8),
  
  -- Test User 3: Emily
  ('33333333-3333-3333-3333-333333333333', NULL, '+15553333333', 'emily@test.com', 'Emily', 'Rodriguez', 'https://randomuser.me/api/portraits/women/68.jpg', 1, 'none', true, 4.8, 5),
  
  -- Test User 4: Alex (dev user)
  ('44444444-4444-4444-4444-444444444444', NULL, '+15554444444', 'alex@test.com', 'Alex', 'Developer', NULL, 1, 'none', true, 5.0, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- TEST TRIP INTENTS
-- ============================================
INSERT INTO public.trip_intents (id, user_id, destination, departure_time, party_size, luggage, ride_type, status, rough_location)
VALUES
  -- Sarah's trip - searching
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Downtown SF', NOW() + INTERVAL '30 minutes', 1, 'one', 'standard', 'searching', 'Near Terminal 2, SFO'),
  
  -- Mike's trip - searching
  ('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Downtown SF', NOW() + INTERVAL '45 minutes', 2, 'two', 'xl', 'searching', 'Near Terminal 1, SFO'),
  
  -- Emily's trip - searching
  ('aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Oakland', NOW() + INTERVAL '20 minutes', 1, 'none', 'standard', 'searching', 'Near Baggage Claim, SFO')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFY DATA
-- ============================================
-- Run these queries to verify seed data:
-- SELECT * FROM public.profiles;
-- SELECT * FROM public.trip_intents;

SELECT 'Seed data inserted successfully!' AS status;
SELECT COUNT(*) AS profile_count FROM public.profiles;
SELECT COUNT(*) AS trip_intent_count FROM public.trip_intents;
