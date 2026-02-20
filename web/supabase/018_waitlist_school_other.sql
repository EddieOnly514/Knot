-- Allow "other" school signups to store custom school name.

ALTER TABLE public.waitlist
ADD COLUMN IF NOT EXISTS school_other TEXT;

COMMENT ON COLUMN public.waitlist.school_other IS 'Custom school name when school = other';
