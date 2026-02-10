-- Knot Web Migration: Update handle_new_user for Google OAuth
-- Run this in Supabase SQL Editor
--
-- Google OAuth provides user metadata differently than phone/email signup:
-- - full_name (instead of first_name / last_name)
-- - avatar_url (profile picture)
-- - email (verified by Google)
--
-- This updated trigger handles both cases.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_first_name TEXT;
    v_last_name TEXT;
    v_full_name TEXT;
    v_photo_url TEXT;
    v_email TEXT;
BEGIN
    -- Extract name from metadata
    v_first_name := COALESCE(NEW.raw_user_meta_data->>'first_name', '');
    v_last_name := COALESCE(NEW.raw_user_meta_data->>'last_name', '');
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', '');
    v_photo_url := COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL);
    v_email := COALESCE(NEW.email, NEW.raw_user_meta_data->>'email', NULL);

    -- If first_name is empty but full_name exists (Google OAuth), split it
    IF v_first_name = '' AND v_full_name != '' THEN
        v_first_name := SPLIT_PART(v_full_name, ' ', 1);
        v_last_name := TRIM(SUBSTRING(v_full_name FROM LENGTH(v_first_name) + 1));
    END IF;

    -- Fallback: use email prefix as first name
    IF v_first_name = '' AND v_email IS NOT NULL THEN
        v_first_name := SPLIT_PART(v_email, '@', 1);
    END IF;

    INSERT INTO public.profiles (user_id, email, phone, first_name, last_name, photo_url)
    VALUES (
        NEW.id,
        v_email,
        NEW.phone,
        v_first_name,
        v_last_name,
        v_photo_url
    );
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Re-create the trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();
