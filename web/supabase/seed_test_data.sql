-- =============================================
-- seed_test_data.sql — comprehensive test data for ALL scenarios
-- Run AFTER: 006_seeker_matching.sql, 014_multi_match_and_group_chat.sql
-- Covers: single match, group match (3 and 4 people), group chat, 1:1 chat,
--         pending/rejected requests, max 4 matches per ride
-- =============================================

-- =============================================
-- 1. CLEAN UP OLD TEST DATA
-- =============================================

-- Delete in dependency order (messages → ride_groups → ride_requests → rides → profiles)
DELETE FROM messages WHERE sender_id IN (SELECT id FROM profiles WHERE id::text LIKE '11111111-aaaa-bbbb-cccc-%');
DELETE FROM messages WHERE conversation_id IN (SELECT id FROM ride_requests WHERE ride_id IN (SELECT id FROM rides WHERE user_id::text LIKE '11111111-aaaa-bbbb-cccc-%'));
DELETE FROM messages WHERE ride_group_id IN (SELECT id FROM ride_groups WHERE ride_id IN (SELECT id FROM rides WHERE user_id::text LIKE '11111111-aaaa-bbbb-cccc-%'));

DELETE FROM ride_groups WHERE ride_id IN (SELECT id FROM rides WHERE user_id::text LIKE '11111111-aaaa-bbbb-cccc-%');
DELETE FROM ride_requests WHERE ride_id IN (SELECT id FROM rides WHERE user_id::text LIKE '11111111-aaaa-bbbb-cccc-%');
DELETE FROM ride_requests WHERE requester_ride_id IN (SELECT id FROM rides WHERE user_id::text LIKE '11111111-aaaa-bbbb-cccc-%');
DELETE FROM rides WHERE user_id::text LIKE '11111111-aaaa-bbbb-cccc-%';
DELETE FROM profiles WHERE id::text LIKE '11111111-aaaa-bbbb-cccc-%';

-- Also remove rides/requests that reference our test ride IDs (explicit UUIDs)
DELETE FROM messages WHERE conversation_id IN (SELECT id FROM ride_requests WHERE id::text LIKE 'a200000%-%');
DELETE FROM ride_requests WHERE id::text LIKE 'a200000%-%';
DELETE FROM ride_groups WHERE ride_id IN (
  'a1000001-0000-0000-0000-000000000001', 'a1000006-0000-0000-0000-000000000006', 'a1000015-0000-0000-0000-000000000015'
);
DELETE FROM ride_requests WHERE ride_id IN (
  'a1000001-0000-0000-0000-000000000001', 'a1000002-0000-0000-0000-000000000002', 'a1000003-0000-0000-0000-000000000003',
  'a1000004-0000-0000-0000-000000000004', 'a1000005-0000-0000-0000-000000000005', 'a1000006-0000-0000-0000-000000000006',
  'a1000007-0000-0000-0000-000000000007', 'a1000008-0000-0000-0000-000000000008', 'a1000009-0000-0000-0000-000000000009',
  'a1000010-0000-0000-0000-000000000010', 'a1000011-0000-0000-0000-000000000011', 'a1000012-0000-0000-0000-000000000012',
  'a1000013-0000-0000-0000-000000000013', 'a1000014-0000-0000-0000-000000000014', 'a1000015-0000-0000-0000-000000000015',
  'a1000016-0000-0000-0000-000000000016', 'a1000017-0000-0000-0000-000000000017'
) OR requester_ride_id IN (
  'a1000001-0000-0000-0000-000000000001', 'a1000002-0000-0000-0000-000000000002', 'a1000003-0000-0000-0000-000000000003',
  'a1000004-0000-0000-0000-000000000004', 'a1000005-0000-0000-0000-000000000005', 'a1000006-0000-0000-0000-000000000006',
  'a1000007-0000-0000-0000-000000000007', 'a1000008-0000-0000-0000-000000000008', 'a1000009-0000-0000-0000-000000000009',
  'a1000010-0000-0000-0000-000000000010', 'a1000011-0000-0000-0000-000000000011', 'a1000012-0000-0000-0000-000000000012',
  'a1000013-0000-0000-0000-000000000013', 'a1000014-0000-0000-0000-000000000014', 'a1000015-0000-0000-0000-000000000015',
  'a1000016-0000-0000-0000-000000000016', 'a1000017-0000-0000-0000-000000000017'
);
DELETE FROM rides WHERE id IN (
  'a1000001-0000-0000-0000-000000000001', 'a1000002-0000-0000-0000-000000000002', 'a1000003-0000-0000-0000-000000000003',
  'a1000004-0000-0000-0000-000000000004', 'a1000005-0000-0000-0000-000000000005', 'a1000006-0000-0000-0000-000000000006',
  'a1000007-0000-0000-0000-000000000007', 'a1000008-0000-0000-0000-000000000008', 'a1000009-0000-0000-0000-000000000009',
  'a1000010-0000-0000-0000-000000000010', 'a1000011-0000-0000-0000-000000000011', 'a1000012-0000-0000-0000-000000000012',
  'a1000013-0000-0000-0000-000000000013', 'a1000014-0000-0000-0000-000000000014', 'a1000015-0000-0000-0000-000000000015',
  'a1000016-0000-0000-0000-000000000016', 'a1000017-0000-0000-0000-000000000017'
);

-- =============================================
-- 2. DROP FK FOR TEST PROFILES (optional; only if auth.users has no rows for these IDs)
-- =============================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- =============================================
-- 3. INSERT 20 FAKE PROFILES
-- =============================================

INSERT INTO profiles (id, user_id, email, first_name, last_name, school, phone, conversation_pref, music_pref, smoking_pref, gender_preference, is_verified, rating, completed_rides, total_rides, bio, phone_verified, email_verified, id_verified)
VALUES
  ('11111111-aaaa-bbbb-cccc-000000000001', '00000000-0000-0000-0000-000000000001', 'sarah.j@ucla.edu', 'Sarah', 'Johnson', 'UCLA', '310-555-0101', 'chatty', 'yes', 'no', 'any', true, 4.8, 12, 15, 'Film major at UCLA, loves chatting about travel and campus life.', true, true, true),
  ('11111111-aaaa-bbbb-cccc-000000000002', '00000000-0000-0000-0000-000000000002', 'mike.c@usc.edu', 'Mike', 'Chen', 'USC', '213-555-0102', 'chill', 'no_preference', 'no', 'any', true, 4.5, 8, 10, 'CS student at USC, pretty low-key and always on time.', true, true, false),
  ('11111111-aaaa-bbbb-cccc-000000000003', '00000000-0000-0000-0000-000000000003', 'emma.w@berkeley.edu', 'Emma', 'Williams', 'UC Berkeley', '510-555-0103', 'chill', 'yes', 'no', 'any', false, 5.0, 3, 3, 'Loves playlists and good conversation.', true, true, false),
  ('11111111-aaaa-bbbb-cccc-000000000004', '00000000-0000-0000-0000-000000000004', 'james.l@stanford.edu', 'James', 'Lee', 'Stanford', '650-555-0104', 'quiet', 'no', 'no', 'any', true, 4.9, 20, 25, 'Grad student at Stanford, quiet rider.', true, true, true),
  ('11111111-aaaa-bbbb-cccc-000000000005', '00000000-0000-0000-0000-000000000005', 'olivia.m@ucla.edu', 'Olivia', 'Martinez', 'UCLA', '310-555-0105', 'chatty', 'yes', 'no', 'any', true, 4.7, 5, 7, 'Pre-med, always down for a road trip.', true, true, true),
  ('11111111-aaaa-bbbb-cccc-000000000006', '00000000-0000-0000-0000-000000000006', 'david.k@sjsu.edu', 'David', 'Kim', 'SJSU', '408-555-0106', 'chill', 'no_preference', 'no', 'any', true, 4.6, 15, 18, 'Driving up to the Bay often for work.', true, true, false),
  ('11111111-aaaa-bbbb-cccc-000000000007', '00000000-0000-0000-0000-000000000007', 'sophia.t@stanford.edu', 'Sophia', 'Taylor', 'Stanford', '650-555-0107', 'quiet', 'no', 'no', 'any', true, 4.9, 9, 10, 'PhD candidate, prefer quiet rides.', true, true, true),
  ('11111111-aaaa-bbbb-cccc-000000000008', '00000000-0000-0000-0000-000000000008', 'alex.r@berkeley.edu', 'Alex', 'Rivera', 'UC Berkeley', '510-555-0108', 'chatty', 'yes', 'no', 'any', false, 4.4, 2, 4, 'First year, exploring the Bay Area.', true, true, false),
  ('11111111-aaaa-bbbb-cccc-000000000009', '00000000-0000-0000-0000-000000000009', 'chris.p@ucla.edu', 'Chris', 'Park', 'UCLA', '310-555-0109', 'chill', 'yes', 'no', 'any', true, 4.8, 11, 14, 'Engineering student, Burbank to campus often.', true, true, true),
  ('11111111-aaaa-bbbb-cccc-000000000010', '00000000-0000-0000-0000-000000000010', 'jordan.l@usc.edu', 'Jordan', 'Liu', 'USC', '213-555-0110', 'quiet', 'no_preference', 'no', 'any', true, 4.5, 6, 8, 'Music production major, early morning flights.', true, false, false),
  ('11111111-aaaa-bbbb-cccc-000000000011', '00000000-0000-0000-0000-000000000011', 'taylor.g@usc.edu', 'Taylor', 'Green', 'USC', '213-555-0111', 'chatty', 'yes', 'no', 'any', true, 4.7, 7, 9, 'LAX runs every other week.', true, true, false),
  ('11111111-aaaa-bbbb-cccc-000000000012', '00000000-0000-0000-0000-000000000012', 'riley.b@ucla.edu', 'Riley', 'Brown', 'UCLA', '310-555-0112', 'chill', 'yes', 'no', 'any', false, 4.3, 1, 2, 'New to ride share, excited to meet people!', true, true, false),
  ('11111111-aaaa-bbbb-cccc-000000000013', '00000000-0000-0000-0000-000000000013', 'casey.w@usc.edu', 'Casey', 'White', 'USC', '213-555-0113', 'quiet', 'no', 'no', 'any', true, 4.6, 4, 5, 'Prefer minimal chat, on time.', true, true, true),
  ('11111111-aaaa-bbbb-cccc-000000000014', '00000000-0000-0000-0000-000000000014', 'morgan.d@ucla.edu', 'Morgan', 'Davis', 'UCLA', '310-555-0114', 'chatty', 'no_preference', 'no', 'any', false, 4.0, 0, 1, 'Just signed up, one ride so far.', false, true, false),
  ('11111111-aaaa-bbbb-cccc-000000000015', '00000000-0000-0000-0000-000000000015', 'quinn.h@berkeley.edu', 'Quinn', 'Harris', 'UC Berkeley', '510-555-0115', 'chill', 'yes', 'no', 'any', true, 4.8, 14, 16, 'SFO to Berkeley shuttle enthusiast.', true, true, true),
  ('11111111-aaaa-bbbb-cccc-000000000016', '00000000-0000-0000-0000-000000000016', 'sam.f@stanford.edu', 'Sam', 'Foster', 'Stanford', '650-555-0116', 'chatty', 'yes', 'no', 'any', true, 4.5, 3, 5, 'Flying in for interviews, love carpooling.', true, true, false),
  ('11111111-aaaa-bbbb-cccc-000000000017', '00000000-0000-0000-0000-000000000017', 'jesse.n@berkeley.edu', 'Jesse', 'Nguyen', 'UC Berkeley', '510-555-0117', 'chill', 'no_preference', 'no', 'any', false, 4.7, 8, 10, 'Grad student, SFO runs every month.', true, true, false),
  ('11111111-aaaa-bbbb-cccc-000000000018', '00000000-0000-0000-0000-000000000018', 'reese.a@ucla.edu', 'Reese', 'Anderson', 'UCLA', '310-555-0118', 'quiet', 'no', 'no', 'any', true, 4.9, 18, 20, 'Senior, job hunting in LA.', true, true, true),
  ('11111111-aaaa-bbbb-cccc-000000000019', '00000000-0000-0000-0000-000000000019', 'drew.c@usc.edu', 'Drew', 'Clark', 'USC', '213-555-0119', 'chatty', 'yes', 'no', 'any', true, 4.4, 5, 7, 'Film school, always traveling.', true, false, false),
  ('11111111-aaaa-bbbb-cccc-000000000020', '00000000-0000-0000-0000-000000000020', 'skyler.m@stanford.edu', 'Skyler', 'Moore', 'Stanford', '650-555-0120', 'chill', 'no_preference', 'no', 'any', true, 4.6, 10, 12, 'Weekend trips to SFO.', true, true, true)
ON CONFLICT (id) DO NOTHING;

-- Re-add FK (NOT VALID so existing test rows are allowed)
ALTER TABLE profiles ADD CONSTRAINT profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID;

-- =============================================
-- 4. INSERT RIDES — multiple routes for single match, group match, pending/rejected
-- =============================================

-- Route 1: LAX → UCLA (2026-02-20, 10am–6pm Pacific) — 1 OFFERING + 4 SEEKING
-- Wide 8-hour window so any US timezone "afternoon" pick overlaps >= 20 min (matcher requires 20).
-- Offering: Sarah (profile 1), 4 seats
INSERT INTO rides (id, user_id, ride_type, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_earliest, departure_latest, departure_preferred, seats_needed, seats_available, space_capacity, gender_pref, quiet_ride, music_ok, status)
VALUES (
  'a1000001-0000-0000-0000-000000000001', '11111111-aaaa-bbbb-cccc-000000000001', 'offering',
  'Los Angeles International Airport (LAX)', 33.9425, -118.4081,
  'UCLA, Westwood, Los Angeles, CA', 34.0689, -118.4452,
  ('2026-02-20'::date + INTERVAL '10 hours') AT TIME ZONE 'America/Los_Angeles',
  ('2026-02-20'::date + INTERVAL '18 hours') AT TIME ZONE 'America/Los_Angeles',
  ('2026-02-20'::date + INTERVAL '15 hours') AT TIME ZONE 'America/Los_Angeles',
  1, 4, 3, 'any', false, true, 'active'
);
-- Seeking: Mike, Emma, James, Olivia (profiles 2–5)
INSERT INTO rides (id, user_id, ride_type, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_earliest, departure_latest, departure_preferred, seats_needed, seats_available, space_capacity, gender_pref, quiet_ride, music_ok, status)
VALUES
  ('a1000002-0000-0000-0000-000000000002', '11111111-aaaa-bbbb-cccc-000000000002', 'seeking',
   'Los Angeles International Airport (LAX)', 33.9425, -118.4081, 'UCLA, Westwood, Los Angeles, CA', 34.0689, -118.4452,
   ('2026-02-20'::date + INTERVAL '10 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '18 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '15 hours') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active'),
  ('a1000003-0000-0000-0000-000000000003', '11111111-aaaa-bbbb-cccc-000000000003', 'seeking',
   'Los Angeles International Airport (LAX)', 33.9425, -118.4081, 'UCLA, Westwood, Los Angeles, CA', 34.0689, -118.4452,
   ('2026-02-20'::date + INTERVAL '10 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '18 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '15 hours') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active'),
  ('a1000004-0000-0000-0000-000000000004', '11111111-aaaa-bbbb-cccc-000000000004', 'seeking',
   'Los Angeles International Airport (LAX)', 33.9425, -118.4081, 'UCLA, Westwood, Los Angeles, CA', 34.0689, -118.4452,
   ('2026-02-20'::date + INTERVAL '10 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '18 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '15 hours') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active'),
  ('a1000005-0000-0000-0000-000000000005', '11111111-aaaa-bbbb-cccc-000000000005', 'seeking',
   'Los Angeles International Airport (LAX)', 33.9425, -118.4081, 'UCLA, Westwood, Los Angeles, CA', 34.0689, -118.4452,
   ('2026-02-20'::date + INTERVAL '10 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '18 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '15 hours') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active');

-- Route 2: SFO → Stanford (tomorrow ~2:30pm) — 1 OFFERING + 2 SEEKING → group of 3
INSERT INTO rides (id, user_id, ride_type, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_earliest, departure_latest, departure_preferred, seats_needed, seats_available, space_capacity, gender_pref, quiet_ride, music_ok, status)
VALUES (
  'a1000006-0000-0000-0000-000000000006', '11111111-aaaa-bbbb-cccc-000000000006', 'offering',
  'San Francisco International Airport (SFO)', 37.6213, -122.3790, 'Stanford University, Palo Alto, CA', 37.4275, -122.1697,
  ('2026-02-20'::date + INTERVAL '14 hours') AT TIME ZONE 'America/Los_Angeles',
  ('2026-02-20'::date + INTERVAL '15 hours') AT TIME ZONE 'America/Los_Angeles',
  ('2026-02-20'::date + INTERVAL '14 hours 30 minutes') AT TIME ZONE 'America/Los_Angeles',
  1, 3, 2, 'any', false, true, 'active'
);
INSERT INTO rides (id, user_id, ride_type, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_earliest, departure_latest, departure_preferred, seats_needed, seats_available, space_capacity, gender_pref, quiet_ride, music_ok, status)
VALUES
  ('a1000007-0000-0000-0000-000000000007', '11111111-aaaa-bbbb-cccc-000000000007', 'seeking',
   'San Francisco International Airport (SFO)', 37.6213, -122.3790, 'Stanford University, Palo Alto, CA', 37.4275, -122.1697,
   ('2026-02-20'::date + INTERVAL '14 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '15 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '14 hours 30 minutes') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', true, false, 'active'),
  ('a1000008-0000-0000-0000-000000000008', '11111111-aaaa-bbbb-cccc-000000000008', 'seeking',
   'San Francisco International Airport (SFO)', 37.6213, -122.3790, 'Stanford University, Palo Alto, CA', 37.4275, -122.1697,
   ('2026-02-20'::date + INTERVAL '14 hours 15 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '15 hours 15 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '14 hours 45 minutes') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active');

-- Route 3: BUR → UCLA — 1 OFFERING + 1 SEEKING → SINGLE MATCH (1:1 chat only)
INSERT INTO rides (id, user_id, ride_type, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_earliest, departure_latest, departure_preferred, seats_needed, seats_available, space_capacity, gender_pref, quiet_ride, music_ok, status)
VALUES
  ('a1000009-0000-0000-0000-000000000009', '11111111-aaaa-bbbb-cccc-000000000009', 'offering',
   'Hollywood Burbank Airport (BUR)', 34.2000, -118.3587, 'UCLA, Westwood, Los Angeles, CA', 34.0689, -118.4452,
   ('2026-02-20'::date + INTERVAL '8 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '9 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '8 hours 30 minutes') AT TIME ZONE 'America/Los_Angeles',
   1, 2, 1, 'any', false, true, 'active'),
  ('a1000010-0000-0000-0000-000000000010', '11111111-aaaa-bbbb-cccc-000000000010', 'seeking',
   'Hollywood Burbank Airport (BUR)', 34.2000, -118.3587, 'UCLA, Westwood, Los Angeles, CA', 34.0689, -118.4452,
   ('2026-02-20'::date + INTERVAL '8 hours 15 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '9 hours 15 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '8 hours 45 minutes') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active');

-- Route 4: LAX → USC — 1 OFFERING + 3 SEEKING → 1 accepted, 1 pending, 1 rejected (single match + pending/rejected)
INSERT INTO rides (id, user_id, ride_type, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_earliest, departure_latest, departure_preferred, seats_needed, seats_available, space_capacity, gender_pref, quiet_ride, music_ok, status)
VALUES (
  'a1000011-0000-0000-0000-000000000011', '11111111-aaaa-bbbb-cccc-000000000011', 'offering',
  'Los Angeles International Airport (LAX)', 33.9425, -118.4081, 'USC, Los Angeles, CA', 34.0195, -118.2862,
  ('2026-02-20'::date + INTERVAL '16 hours') AT TIME ZONE 'America/Los_Angeles',
  ('2026-02-20'::date + INTERVAL '17 hours 30 minutes') AT TIME ZONE 'America/Los_Angeles',
  ('2026-02-20'::date + INTERVAL '16 hours 45 minutes') AT TIME ZONE 'America/Los_Angeles',
  1, 2, 2, 'any', false, true, 'active'
);
INSERT INTO rides (id, user_id, ride_type, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_earliest, departure_latest, departure_preferred, seats_needed, seats_available, space_capacity, gender_pref, quiet_ride, music_ok, status)
VALUES
  ('a1000012-0000-0000-0000-000000000012', '11111111-aaaa-bbbb-cccc-000000000012', 'seeking',
   'Los Angeles International Airport (LAX)', 33.9425, -118.4081, 'USC, Los Angeles, CA', 34.0195, -118.2862,
   ('2026-02-20'::date + INTERVAL '16 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '17 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '16 hours 30 minutes') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active'),
  ('a1000013-0000-0000-0000-000000000013', '11111111-aaaa-bbbb-cccc-000000000013', 'seeking',
   'Los Angeles International Airport (LAX)', 33.9425, -118.4081, 'USC, Los Angeles, CA', 34.0195, -118.2862,
   ('2026-02-20'::date + INTERVAL '16 hours 15 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '17 hours 15 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '16 hours 45 minutes') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, false, 'active'),
  ('a1000014-0000-0000-0000-000000000014', '11111111-aaaa-bbbb-cccc-000000000014', 'seeking',
   'Los Angeles International Airport (LAX)', 33.9425, -118.4081, 'USC, Los Angeles, CA', 34.0195, -118.2862,
   ('2026-02-20'::date + INTERVAL '16 hours 30 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '17 hours 30 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '17 hours') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active');

-- Route 5: SFO → Berkeley — 1 OFFERING + 2 SEEKING → group of 3
INSERT INTO rides (id, user_id, ride_type, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_earliest, departure_latest, departure_preferred, seats_needed, seats_available, space_capacity, gender_pref, quiet_ride, music_ok, status)
VALUES (
  'a1000015-0000-0000-0000-000000000015', '11111111-aaaa-bbbb-cccc-000000000015', 'offering',
  'San Francisco International Airport (SFO)', 37.6213, -122.3790, 'UC Berkeley, Berkeley, CA', 37.8715, -122.2730,
  ('2026-02-20'::date + INTERVAL '12 hours') AT TIME ZONE 'America/Los_Angeles',
  ('2026-02-20'::date + INTERVAL '13 hours 30 minutes') AT TIME ZONE 'America/Los_Angeles',
  ('2026-02-20'::date + INTERVAL '12 hours 45 minutes') AT TIME ZONE 'America/Los_Angeles',
  1, 3, 2, 'any', false, true, 'active'
);
INSERT INTO rides (id, user_id, ride_type, origin_name, origin_lat, origin_lng, dest_name, dest_lat, dest_lng, departure_earliest, departure_latest, departure_preferred, seats_needed, seats_available, space_capacity, gender_pref, quiet_ride, music_ok, status)
VALUES
  ('a1000016-0000-0000-0000-000000000016', '11111111-aaaa-bbbb-cccc-000000000016', 'seeking',
   'San Francisco International Airport (SFO)', 37.6213, -122.3790, 'UC Berkeley, Berkeley, CA', 37.8715, -122.2730,
   ('2026-02-20'::date + INTERVAL '12 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '13 hours') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '12 hours 30 minutes') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active'),
  ('a1000017-0000-0000-0000-000000000017', '11111111-aaaa-bbbb-cccc-000000000017', 'seeking',
   'San Francisco International Airport (SFO)', 37.6213, -122.3790, 'UC Berkeley, Berkeley, CA', 37.8715, -122.2730,
   ('2026-02-20'::date + INTERVAL '12 hours 15 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '13 hours 15 minutes') AT TIME ZONE 'America/Los_Angeles',
   ('2026-02-20'::date + INTERVAL '12 hours 45 minutes') AT TIME ZONE 'America/Los_Angeles',
   1, 1, 1, 'any', false, true, 'active');

-- =============================================
-- 5. INSERT RIDE_REQUESTS — single match, group match, pending, rejected
-- =============================================

-- Route 1: Sarah’s offering (a1000001) — 4 ACCEPTED (max) → group chat
INSERT INTO ride_requests (id, ride_id, requester_ride_id, status, ride_status)
VALUES
  ('a2000001-0000-0000-0000-000000000001', 'a1000001-0000-0000-0000-000000000001', 'a1000002-0000-0000-0000-000000000002', 'accepted', 'accepted'),
  ('a2000001-0000-0000-0000-000000000002', 'a1000001-0000-0000-0000-000000000001', 'a1000003-0000-0000-0000-000000000003', 'accepted', 'accepted'),
  ('a2000001-0000-0000-0000-000000000003', 'a1000001-0000-0000-0000-000000000001', 'a1000004-0000-0000-0000-000000000004', 'accepted', 'accepted'),
  ('a2000001-0000-0000-0000-000000000004', 'a1000001-0000-0000-0000-000000000001', 'a1000005-0000-0000-0000-000000000005', 'accepted', 'accepted');

-- Route 2: David’s offering (a1000006) — 2 ACCEPTED → group of 3
INSERT INTO ride_requests (id, ride_id, requester_ride_id, status, ride_status)
VALUES
  ('a2000001-0000-0000-0000-000000000005', 'a1000006-0000-0000-0000-000000000006', 'a1000007-0000-0000-0000-000000000007', 'accepted', 'accepted'),
  ('a2000001-0000-0000-0000-000000000006', 'a1000006-0000-0000-0000-000000000006', 'a1000008-0000-0000-0000-000000000008', 'accepted', 'accepted');

-- Route 3: Chris’s offering (a1000009) — 1 ACCEPTED → single match (1:1 only)
INSERT INTO ride_requests (id, ride_id, requester_ride_id, status, ride_status)
VALUES
  ('a2000001-0000-0000-0000-000000000007', 'a1000009-0000-0000-0000-000000000009', 'a1000010-0000-0000-0000-000000000010', 'accepted', 'accepted');

-- Route 4: Taylor’s offering (a1000011) — 1 accepted, 1 pending, 1 rejected
INSERT INTO ride_requests (id, ride_id, requester_ride_id, status, ride_status)
VALUES
  ('a2000001-0000-0000-0000-000000000008', 'a1000011-0000-0000-0000-000000000011', 'a1000012-0000-0000-0000-000000000012', 'accepted', 'accepted'),
  ('a2000001-0000-0000-0000-000000000009', 'a1000011-0000-0000-0000-000000000011', 'a1000013-0000-0000-0000-000000000013', 'pending', 'requested'),
  ('a2000001-0000-0000-0000-00000000000a', 'a1000011-0000-0000-0000-000000000011', 'a1000014-0000-0000-0000-000000000014', 'rejected', 'requested');

-- Route 5: Quinn’s offering (a1000015) — 2 ACCEPTED → group of 3
INSERT INTO ride_requests (id, ride_id, requester_ride_id, status, ride_status)
VALUES
  ('a2000001-0000-0000-0000-00000000000b', 'a1000015-0000-0000-0000-000000000015', 'a1000016-0000-0000-0000-000000000016', 'accepted', 'accepted'),
  ('a2000001-0000-0000-0000-00000000000c', 'a1000015-0000-0000-0000-000000000015', 'a1000017-0000-0000-0000-000000000017', 'accepted', 'accepted');

-- Trigger maybe_create_ride_group will create ride_groups for a1000001, a1000006, a1000015 (each has 2+ accepted requesters)

-- =============================================
-- 6. ENSURE RIDE_GROUPS EXIST (in case trigger didn’t run in same tx)
-- =============================================

INSERT INTO ride_groups (ride_id)
SELECT id FROM rides WHERE id IN (
  'a1000001-0000-0000-0000-000000000001',
  'a1000006-0000-0000-0000-000000000006',
  'a1000015-0000-0000-0000-000000000015'
)
ON CONFLICT (ride_id) DO NOTHING;

-- =============================================
-- 7. INSERT MESSAGES — 1:1 and group chat
-- =============================================

-- 1:1 conversation: BUR→UCLA single match (Chris ↔ Jordan)
INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type)
VALUES
  ('a2000001-0000-0000-0000-000000000007', NULL, '11111111-aaaa-bbbb-cccc-000000000009', 'Hey, see you at BUR tomorrow morning!', 'text'),
  ('a2000001-0000-0000-0000-000000000007', NULL, '11111111-aaaa-bbbb-cccc-000000000010', 'Sounds good, I’ll be at arrivals. Thanks!', 'text');

-- 1:1 conversation: LAX→USC accepted match (Taylor ↔ Riley)
INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type)
VALUES
  ('a2000001-0000-0000-0000-000000000008', NULL, '11111111-aaaa-bbbb-cccc-000000000011', 'Riley, you’re confirmed for the LAX run.', 'text'),
  ('a2000001-0000-0000-0000-000000000008', NULL, '11111111-aaaa-bbbb-cccc-000000000012', 'Awesome, can’t wait!', 'text');

-- Group chat: LAX→UCLA (Sarah’s ride, 4 matched) — ride_group for a1000001
INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type)
SELECT NULL, rg.id, '11111111-aaaa-bbbb-cccc-000000000001', 'Hey everyone, see you at LAX Terminal 1 tomorrow ~3pm!', 'text'
FROM ride_groups rg WHERE rg.ride_id = 'a1000001-0000-0000-0000-000000000001' LIMIT 1;
INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type)
SELECT NULL, rg.id, '11111111-aaaa-bbbb-cccc-000000000002', 'I’ll be there. Mike.', 'text'
FROM ride_groups rg WHERE rg.ride_id = 'a1000001-0000-0000-0000-000000000001' LIMIT 1;
INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type)
SELECT NULL, rg.id, '11111111-aaaa-bbbb-cccc-000000000003', 'Same here, thanks Sarah!', 'text'
FROM ride_groups rg WHERE rg.ride_id = 'a1000001-0000-0000-0000-000000000001' LIMIT 1;

-- Group chat: SFO→Stanford (David’s ride, 2 matched) — ride_group for a1000006
INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type)
SELECT NULL, rg.id, '11111111-aaaa-bbbb-cccc-000000000006', 'SFO pickup at arrivals, look for the gray sedan.', 'text'
FROM ride_groups rg WHERE rg.ride_id = 'a1000006-0000-0000-0000-000000000006' LIMIT 1;
INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type)
SELECT NULL, rg.id, '11111111-aaaa-bbbb-cccc-000000000007', 'Got it, thanks David!', 'text'
FROM ride_groups rg WHERE rg.ride_id = 'a1000006-0000-0000-0000-000000000006' LIMIT 1;

-- Group chat: SFO→Berkeley (Quinn’s ride, 2 matched) — ride_group for a1000015
INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type)
SELECT NULL, rg.id, '11111111-aaaa-bbbb-cccc-000000000015', 'Berkeley crew: meet at SFO at 12:30?', 'text'
FROM ride_groups rg WHERE rg.ride_id = 'a1000015-0000-0000-0000-000000000015' LIMIT 1;
INSERT INTO messages (conversation_id, ride_group_id, sender_id, content, message_type)
SELECT NULL, rg.id, '11111111-aaaa-bbbb-cccc-000000000016', 'Works for me!', 'text'
FROM ride_groups rg WHERE rg.ride_id = 'a1000015-0000-0000-0000-000000000015' LIMIT 1;

-- =============================================
-- HOW TO TEST
-- =============================================
-- 1. Single match + 1:1 chat: Log in as Chris (p9) or Jordan (p10) — BUR→UCLA match; open chat (1:1).
-- 2. Group match + group chat: Log in as Sarah (p1), Mike (p2), Emma (p3), James (p4), or Olivia (p5) — LAX→UCLA; open group chat.
-- 3. Group of 3: David (p6), Sophia (p7), Alex (p8) — SFO→Stanford; or Quinn (p15), Sam (p16), Jesse (p17) — SFO→Berkeley.
-- 4. Pending / rejected: Taylor (p11) has one accepted (Riley), one pending (Casey), one rejected (Morgan).
-- 5. Max 4 matches: Sarah’s ride has 4 accepted requesters (cap); no 5th accept possible.
-- 6. find_matches_v3(ride_id): Use any test ride id to see suggested matches (offering ↔ seeking, same route/time).
-- =============================================
