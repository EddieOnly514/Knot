# SQL Migration Checklist - All Files Ready ✅

## Security Fixes Applied

### ✅ All Functions Have `SET search_path = public`
All database functions now have the `SET search_path = public` clause to prevent search_path manipulation vulnerabilities:

- ✅ `001_initial_schema.sql`: `update_updated_at_column()`, `handle_new_user()`
- ✅ `002_matching_functions.sql`: `haversine_distance()`, `find_potential_matches()`, `check_and_update_mutual_match()`, `express_interest()`
- ✅ `003_google_oauth_trigger.sql`: `handle_new_user()`
- ✅ `004_matching_v2.sql`: `find_potential_matches()`
- ✅ `005_schema_v3.sql`: `update_rides_updated_at()`, `haversine_miles()`, `calculate_time_overlap()`, `find_matches_v3()`
- ✅ `006_seeker_matching.sql`: `find_matches_v3()`
- ✅ `011_performance_optimizations.sql`: `bounding_box_contains()`, `find_matches_v3()`

### ✅ All Policies Are Idempotent
All `CREATE POLICY` statements now have `DROP POLICY IF EXISTS` before them:

- ✅ `001_initial_schema.sql`: All 12 policies
- ✅ `005_schema_v3.sql`: All 8 policies
- ✅ `008_messages.sql`: All 4 policies
- ✅ `009_user_safety.sql`: All 5 policies
- ✅ `012_spatial_ref_sys_rls.sql`: 1 policy (conditional)

## Schema Compatibility

### ✅ Messages Table Handling
`001_initial_schema.sql` now conditionally creates policies for the old schema (`match_id`) only if that column exists. The new schema (`conversation_id`) is handled by `008_messages.sql`.

## Performance Optimizations

### ✅ Indexes
- Composite indexes for common query patterns (`005_schema_v3.sql`, `011_performance_optimizations.sql`)
- Geographic indexes for location-based queries
- Covering indexes for user lookups
- Partial indexes for filtered queries (e.g., `WHERE status = 'active'`)

### ✅ Query Optimizations
- `bounding_box_contains()` function for fast geographic pre-filtering before expensive haversine calculations
- Optimized `find_matches_v3()` with two-pass filtering (cheap checks first, expensive calculations second)
- Pre-calculated time windows to avoid redundant calculations

### ✅ Table Statistics
`011_performance_optimizations.sql` includes `ANALYZE` statements to update query planner statistics.

## File Execution Order

Run files in this order for a fresh database:

1. `001_initial_schema.sql` - Base schema (profiles, trip_intents, matches, etc.)
2. `002_matching_functions.sql` - Matching functions for old schema
3. `003_google_oauth_trigger.sql` - OAuth user handling
4. `004_matching_v2.sql` - Updated matching algorithm
5. `005_schema_v3.sql` - New rides-based schema
6. `006_seeker_matching.sql` - Seeker-to-seeker matching
7. `007_ride_notes.sql` - Add notes column
8. `008_messages.sql` - Messaging system
9. `009_user_safety.sql` - Blocking and reporting
10. `010_profile_extras.sql` - Additional profile fields
11. `011_performance_optimizations.sql` - Performance indexes and optimized functions
12. `012_spatial_ref_sys_rls.sql` - PostGIS RLS (if using PostGIS)

## Notes

- All files use `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, etc. for idempotency
- Functions use `CREATE OR REPLACE FUNCTION` so they can be rerun safely
- Policies are dropped before creation to allow reruns
- Conditional logic handles schema evolution (old vs new messages table)

## Remaining Manual Steps

1. **Extension in Public Schema**: Move `postgis` extension to a different schema (Dashboard → Database → Extensions)
2. **Leaked Password Protection**: Enable in Dashboard → Authentication → Settings
3. **Missing Function**: If `expire_old_trip_intents()` exists in your database, add `SET search_path = public` or drop it

## Testing

After running migrations:
1. Check Supabase Dashboard → Database → Linter for any remaining warnings
2. Verify all functions have `SET search_path` set correctly
3. Test key queries (matching, messaging, etc.)
4. Monitor query performance using Dashboard → Database → Query Performance
