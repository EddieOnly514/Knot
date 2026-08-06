# Knot Supabase Migration Checklist

## Apply Order

Apply every numbered SQL file in ascending order. The current production
sequence ends at `044_remove_retired_matching_helpers.sql`.

For an existing project, verify the following recent migrations are present:

1. `034_consistent_time_matching.sql`
2. `035_matching_safety_and_preferences.sql`
3. `036_secure_profile_rpcs.sql`
4. `037_function_acl_hardening.sql`
5. `038_local_ride_timezone.sql`
6. `039_security_advisor_cleanup.sql`
7. `040_matcher_safety_before_ranking.sql`
8. `041_remove_retired_matching_schema.sql`
9. `042_explicit_rls_and_profile_privacy.sql`
10. `043_group_timezone_and_request_integrity.sql`
11. `044_remove_retired_matching_helpers.sql`

## Current Matching Path

- Next.js calls `find_matches_v4(ride_id, max_results)`.
- `find_matches_v4` verifies the caller owns the selected ride and applies the
  ride's IANA timezone before same-calendar-day checks.
- `find_matches_v3` performs deterministic hard filters and tier sorting. It
  does not use an ML model, weighted score, trust score, or driver/seeker role.
- Everyone is a seeker. The database constraint permits only
  `rides.ride_type = 'seeking'`.
- Origin and destination must each be within 2 miles.
- Both rides must be active, unexpired, unblocked, on the same local date, and
  fit within the six-seat group limit.
- Original window overlap is tiered as Strong, Okay, or Weak. Non-overlapping
  windows remain eligible when extending both parties by two hours produces a
  shared window, which is equivalent to an original gap of at most 240 minutes.
- Last-resort suppression runs only after invalid candidates are removed.
- Distance and preferences only order candidates inside a time tier. Luggage
  and groups over four occupied seats set the Uber XL warning but do not filter.

## Request And Group Integrity

- Request pairs have a seven-day cooldown, enforced by the insert trigger.
- Acceptance rechecks date, expiry, blocking, origin, destination, time, and
  capacity so edits after request creation cannot bypass hard filters.
- Accepted pairs create or join one persistent `ride_group`; messages belong to
  the group and remain when a member leaves.
- Join acceptance locks involved rides before the six-seat count, preventing
  concurrent overfill.
- Group edits and leaves recalculate the main rider, member count, common time
  window, origin centroid, luggage, Uber XL state, and match label.
- Group recalculation uses the main ride's local timezone and stores a valid
  shared extended window when original member windows do not overlap.

## Data API And RLS

- Application tables use explicit `anon` and `authenticated` grants in addition
  to RLS. Anonymous users cannot read rides or profiles.
- Signed-in users cannot directly select another profile's email or phone and
  cannot update trust/verification counters.
- `get_my_profile()` returns private fields only for the current auth user.
- `get_public_profile(profile_id)` returns the safe profile projection.
- Group-member policies use the non-recursive visibility helper from migration
  `029`.
- Internal trigger functions have no `PUBLIC`, `anon`, or `authenticated`
  execute grant unless they are an intentional authenticated RPC.

## Retired Schema

Migrations `041` and `044` remove the old trip-intent, swipe, cached-score,
driver-era helper, unused PostGIS, and retired enum objects. Current matching is
built from `rides`, `ride_requests`, `ride_groups`, `ride_group_members`,
`messages`, `blocked_users`, and `profiles`.

## Verification

After a schema change:

1. Run migrations in a rollback transaction before applying them.
2. Run Supabase security and performance advisors.
3. Run `npm run test:matching`.
4. Run `npm run lint`.
5. Run `npm run build`.

The Auth setting for leaked-password protection must be enabled in the Supabase
Dashboard; it is a project setting rather than a SQL migration.
