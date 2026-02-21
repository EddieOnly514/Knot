-- Knot Web Migration: Update handle_new_user for Google OAuth
-- Run this in Supabase SQL Editor
--
-- New users must go through onboarding to set their name. We create the profile
-- with empty first_name/last_name so the app redirects them to onboarding.
-- Email and photo_url are set from OAuth for display/prefill on the onboarding page.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_photo_url TEXT;
    v_email TEXT;
BEGIN
    v_photo_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL);
    v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', NULL);

    -- Insert with empty first_name/last_name so user is sent to onboarding to register
    INSERT INTO public.profiles (user_id, email, phone, first_name, last_name, photo_url)
    VALUES (
        NEW.id,
        v_email,
        NEW.phone,
        '',
        '',
        v_photo_url
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER
SET search_path = public;

-- Re-create the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
