-- Add notes column to rides table
-- Run this in the Supabase SQL Editor
ALTER TABLE rides ADD COLUMN IF NOT EXISTS notes TEXT;
