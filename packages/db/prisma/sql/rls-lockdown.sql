-- RLS lockdown za Members Supabase projekt (ref hztbmxxhugpchmbkljgl)
--
-- Zašto: Supabase auto-izlaže `public` shemu preko PostgREST (/rest/v1/) i daje
-- anon/authenticated rolama pune grantove (SELECT/INSERT/UPDATE/DELETE/TRUNCATE)
-- na sve tablice. Bez RLS-a to znači da bilo tko s javnim anon ključem može
-- čitati/mijenjati/brisati podatke (uklj. RefreshToken.token → otmica sesije).
--
-- Ova aplikacija NE koristi PostgREST ni Supabase client — sav pristup ide kroz
-- Express API + Prisma, koja se spaja kao rola `postgres` (rolbypassrls = true),
-- pa uključivanje RLS-a (bez ijedne policy) potpuno zaključa anon/authenticated,
-- a app nastavlja raditi nepromijenjeno.
--
-- prisma db push NE dira RLS ni grantove, pa ovaj skriptu treba pokrenuti zasebno
-- (i ponovno, ako se doda nova tablica). Idempotentno je.

-- 1) Uključi RLS na svim base tablicama u public (bez policy = deny-all za ne-bypass role)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.relname);
  END LOOP;
END $$;

-- 2) Defense-in-depth: povuci sve grantove anon/authenticade (RLS ne zaustavlja TRUNCATE)
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3) Buduće tablice (kreirane kroz prisma db push kao rola postgres) ne smiju
--    automatski dobiti grantove za anon/authenticated
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;

-- Provjera:
--   SELECT count(*) FILTER (WHERE relrowsecurity) AS rls_on, count(*) AS total
--   FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
--   WHERE n.nspname='public' AND c.relkind='r';
