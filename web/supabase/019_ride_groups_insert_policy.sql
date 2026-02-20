-- Allow the ride owner to create a ride_group for their own ride.
-- The trigger maybe_create_ride_group() runs as the user who accepted the request (the host);
-- that user must be able to INSERT into ride_groups for their ride_id.
CREATE POLICY "ride_groups_insert" ON ride_groups
    FOR INSERT
    WITH CHECK (
        ride_id IN (
            SELECT id FROM rides
            WHERE user_id = (SELECT id FROM profiles WHERE user_id = auth.uid())
        )
    );
