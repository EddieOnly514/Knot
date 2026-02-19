-- =============================================
-- diagnose_no_matches.sql
-- Run in Supabase SQL Editor to see why find_matches returns nothing.
-- Replace YOUR_RIDE_ID with the id of the ride you just created (from the URL or matches page).
-- =============================================

-- 1) Seed ride (Sarah's LAX→UCLA offering) — what the matcher looks for
SELECT
  'Seed ride (Sarah)' AS label,
  id,
  origin_name,
  dest_name,
  departure_earliest AT TIME ZONE 'UTC' AS earliest_utc,
  departure_latest AT TIME ZONE 'UTC' AS latest_utc,
  departure_earliest AT TIME ZONE 'America/Los_Angeles' AS earliest_pacific,
  departure_latest AT TIME ZONE 'America/Los_Angeles' AS latest_pacific,
  ride_type,
  status,
  seats_available
FROM rides
WHERE id = 'a1000001-0000-0000-0000-000000000001';

-- 2) Your most recent ride (not from seed profiles) — replace with your ride id if you know it
SELECT
  'Your ride (most recent non-seed)' AS label,
  r.id,
  r.origin_name,
  r.dest_name,
  r.departure_earliest AT TIME ZONE 'UTC' AS earliest_utc,
  r.departure_latest AT TIME ZONE 'UTC' AS latest_utc,
  r.departure_earliest AT TIME ZONE 'America/Los_Angeles' AS earliest_pacific,
  r.departure_latest AT TIME ZONE 'America/Los_Angeles' AS latest_pacific,
  r.ride_type,
  r.status,
  r.origin_lat,
  r.origin_lng,
  r.dest_lat,
  r.dest_lng
FROM rides r
WHERE r.user_id NOT IN (SELECT id FROM profiles WHERE id::text LIKE '11111111-aaaa-bbbb-cccc-%')
ORDER BY r.created_at DESC
LIMIT 1;

-- 3) Time overlap (minutes) between your latest ride and Sarah's — need >= 20
SELECT
  r.id AS your_ride_id,
  calculate_time_overlap(
    r.departure_earliest, r.departure_latest,
    s.departure_earliest, s.departure_latest
  ) AS overlap_minutes,
  CASE WHEN calculate_time_overlap(
    r.departure_earliest, r.departure_latest,
    s.departure_earliest, s.departure_latest
  ) >= 20 THEN 'OK (>= 20)' ELSE 'TOO LOW (need >= 20)' END AS overlap_ok
FROM rides r
CROSS JOIN (SELECT departure_earliest, departure_latest FROM rides WHERE id = 'a1000001-0000-0000-0000-000000000001') s
WHERE r.user_id NOT IN (SELECT id FROM profiles WHERE id::text LIKE '11111111-aaaa-bbbb-cccc-%')
ORDER BY r.created_at DESC
LIMIT 1;

-- 4) Call find_matches_v3 with your ride id (uses the ride from step 2)
-- If this returns 0 rows, the diagnostic above shows why (overlap, distance, or RLS).
SELECT
  first_name,
  last_name,
  origin_name,
  dest_name,
  total_score,
  time_overlap_minutes
FROM find_matches_v3(
  (SELECT id FROM rides
   WHERE user_id NOT IN (SELECT id FROM profiles WHERE id::text LIKE '11111111-aaaa-bbbb-cccc-%')
   ORDER BY created_at DESC
   LIMIT 1),
  10,
  30
);
