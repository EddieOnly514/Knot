-- =============================================
-- 044_remove_retired_matching_helpers.sql
-- Remove the final helper functions and enum types left by the retired
-- trip_intents/swipe matcher. The living group flow uses leave_ride_group().
-- =============================================

SET search_path = public;

DROP FUNCTION IF EXISTS count_group_seats_for_ride(UUID);
DROP FUNCTION IF EXISTS leave_current_ride_group(UUID);

DROP TYPE IF EXISTS luggage_level;
DROP TYPE IF EXISTS match_status;
DROP TYPE IF EXISTS swipe_action;
DROP TYPE IF EXISTS trip_mode;
DROP TYPE IF EXISTS trip_status;

