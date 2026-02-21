-- Migration: Remove auto-profile-creation trigger
-- Run this in Supabase SQL Editor if you applied 001_initial_schema.sql previously.
-- Profiles are now created by the app through ProfileSetupScreen.

-- Drop the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function
DROP FUNCTION IF EXISTS handle_new_user();
