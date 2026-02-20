-- Waitlist for early access (pre-launch landing page).
-- Anonymous users can INSERT; counts are exposed via a function only (no PII).

CREATE TABLE IF NOT EXISTS public.waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    school TEXT NOT NULL CHECK (school IN ('UCI', 'UCLA', 'USC', 'UCSD', 'Cal Poly', 'other')),
    email TEXT NOT NULL,
    airport TEXT NOT NULL CHECK (airport IN ('LAX', 'SNA', 'SAN', 'LGB', 'ONT', 'Other')),
    UNIQUE(email)
);

-- Index for stats by school
CREATE INDEX IF NOT EXISTS waitlist_school_idx ON public.waitlist(school);
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON public.waitlist(created_at);

-- RLS: allow anonymous insert only; no direct select for anon
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (for signup form)
CREATE POLICY "Allow anonymous insert"
    ON public.waitlist
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Only service role can read rows (for admin / stats from API)
CREATE POLICY "Service role can read waitlist"
    ON public.waitlist
    FOR SELECT
    TO service_role
    USING (true);

-- Function: return public stats (counts only, no PII). Executable by anon for landing page.
CREATE OR REPLACE FUNCTION public.get_waitlist_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_count BIGINT;
    uci_count BIGINT;
    ucla_count BIGINT;
    usc_count BIGINT;
    ucsd_count BIGINT;
    cal_poly_count BIGINT;
    other_count BIGINT;
    result JSON;
BEGIN
    SELECT COUNT(*) INTO total_count FROM public.waitlist;
    SELECT COUNT(*) INTO uci_count FROM public.waitlist WHERE school = 'UCI';
    SELECT COUNT(*) INTO ucla_count FROM public.waitlist WHERE school = 'UCLA';
    SELECT COUNT(*) INTO usc_count FROM public.waitlist WHERE school = 'USC';
    SELECT COUNT(*) INTO ucsd_count FROM public.waitlist WHERE school = 'UCSD';
    SELECT COUNT(*) INTO cal_poly_count FROM public.waitlist WHERE school = 'Cal Poly';
    SELECT COUNT(*) INTO other_count FROM public.waitlist WHERE school = 'other';

    result := json_build_object(
        'total', GREATEST(total_count, 146),
        'bySchool', json_build_object(
            'UCI', uci_count,
            'UCLA', ucla_count,
            'USC', usc_count,
            'UCSD', ucsd_count,
            'Cal Poly', cal_poly_count,
            'other', other_count
        )
    );
    RETURN result;
END;
$$;

-- Anon can call the stats function only
GRANT EXECUTE ON FUNCTION public.get_waitlist_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.get_waitlist_stats() TO authenticated;
