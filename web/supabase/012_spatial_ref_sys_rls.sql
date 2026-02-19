-- =============================================
-- 012_spatial_ref_sys_rls.sql
-- Enable RLS on PostGIS spatial_ref_sys table
-- Fixes Supabase lint 0013: rls_disabled_in_public
-- =============================================
-- spatial_ref_sys is owned by PostGIS/supabase_admin.
-- We need to change ownership first, then enable RLS.
-- If ownership change fails (permissions), we skip gracefully.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'spatial_ref_sys'
  ) THEN
    BEGIN
      ALTER TABLE public.spatial_ref_sys OWNER TO postgres;
      ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Allow read access to spatial reference systems" ON public.spatial_ref_sys;
      CREATE POLICY "Allow read access to spatial reference systems"
        ON public.spatial_ref_sys
        FOR SELECT
        USING (true);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping spatial_ref_sys RLS: insufficient privileges. This can be ignored safely.';
    END;
  END IF;
END $$;
