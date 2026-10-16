\set ON_ERROR_STOP on
\set QUIET on
\getenv app_password POSTGRES_APP_PASSWORD
BEGIN;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='black_market_app') THEN
    CREATE ROLE black_market_app LOGIN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname='black_market_app')) THEN
    RAISE EXCEPTION 'Runtime role must not have memberships';
  END IF;
END $$;
ALTER ROLE black_market_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT;
SELECT format('ALTER ROLE black_market_app PASSWORD %L', :'app_password') \gexec
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM black_market_app;
GRANT USAGE ON SCHEMA public TO black_market_app;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM black_market_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO black_market_app;
GRANT INSERT,UPDATE ON public.user_workspaces TO black_market_app;
REVOKE ALL ON public.auth_users, public.auth_identities FROM black_market_app;
GRANT SELECT,INSERT ON public.auth_users, public.auth_identities TO black_market_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.steam_auth_attempts TO black_market_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.steam_auth_exchanges TO black_market_app;
GRANT INSERT,DELETE ON public.market_snapshots TO black_market_app;
GRANT INSERT,DELETE ON public.roadmap_entries TO black_market_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tutorial_guides TO black_market_app;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.tutorial_guide_steps TO black_market_app;
SELECT format('REVOKE ALL ON DATABASE %I FROM black_market_app', current_database()) \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO black_market_app', current_database()) \gexec
COMMIT;
