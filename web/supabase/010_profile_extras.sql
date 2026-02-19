-- 010_profile_extras.sql
-- Safe migration to add extra profile fields needed by the app.
-- Run this if running 005_schema_v3.sql fails due to existing objects.

-- All statements use IF NOT EXISTS so this file can be run multiple times safely.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS id_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completed_rides INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gender_preference TEXT DEFAULT 'any',
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS school TEXT,
  ADD COLUMN IF NOT EXISTS conversation_pref TEXT DEFAULT 'chill',
  ADD COLUMN IF NOT EXISTS music_pref TEXT DEFAULT 'no_preference',
  ADD COLUMN IF NOT EXISTS smoking_pref TEXT DEFAULT 'no';

