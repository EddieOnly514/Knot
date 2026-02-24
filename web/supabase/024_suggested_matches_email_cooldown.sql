-- Track when we last sent "suggested matches" email to a profile (for 24h cooldown).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suggested_matches_email_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.suggested_matches_email_sent_at IS 'Last time we sent the "you have suggested matches" email; used to avoid sending more than once per 24h.';
