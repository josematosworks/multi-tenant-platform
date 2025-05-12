```sql
-- Drop all policies from tables
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', rec.policyname, rec.tablename);
  END LOOP;
END $$;

-- Drop all functions
DO $$ 
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN 
    SELECT proname, oidvectortypes(proargtypes) as argtypes
    FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
    AND proname NOT LIKE 'pg_%'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', rec.proname, rec.argtypes);
  END LOOP;
END $$;

-- Drop the custom enum type
DROP TYPE IF EXISTS visibility_enum CASCADE;

-- Disable RLS on all tables first
ALTER TABLE IF EXISTS public.competition_allowed_schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.competitions DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tenants DISABLE ROW LEVEL SECURITY;

-- Drop all tables
DROP TABLE IF EXISTS public.competition_allowed_schools CASCADE;
DROP TABLE IF EXISTS public.competitions CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.tenants CASCADE;
```
