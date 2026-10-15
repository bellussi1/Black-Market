\set ON_ERROR_STOP on
BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_workspaces'
      AND c.relrowsecurity
      AND c.relforcerowsecurity
  ) THEN
    RAISE EXCEPTION 'RLS is not enabled and forced on user_workspaces';
  END IF;
  IF NOT has_table_privilege('black_market_app', 'public.user_workspaces', 'SELECT,INSERT,UPDATE')
     OR has_table_privilege('black_market_app', 'public.user_workspaces', 'DELETE') THEN
    RAISE EXCEPTION 'Runtime role grants do not match the workspace access contract';
  END IF;
  IF (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'black_market_app') THEN
    RAISE EXCEPTION 'Runtime role bypasses row-level security';
  END IF;
END
$$;

SET LOCAL ROLE black_market_app;
SELECT set_config('app.user_id', '@TEST_USER_A@', true);
INSERT INTO public.user_workspaces (user_id, version, data, updated_at)
VALUES ('@TEST_USER_A@', 1, '{"rls_probe":"owner-a"}', now());

SELECT set_config('app.user_id', '@TEST_USER_B@', true);
INSERT INTO public.user_workspaces (user_id, version, data, updated_at)
VALUES ('@TEST_USER_B@', 1, '{"rls_probe":"owner-b"}', now());

SELECT set_config('app.user_id', '', true);
DO $$
DECLARE visible_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.user_workspaces;
  IF visible_rows <> 0 THEN
    RAISE EXCEPTION 'Workspace rows were visible without a user context';
  END IF;
END
$$;

SELECT set_config('app.user_id', '@TEST_USER_A@', true);
DO $$
DECLARE visible_rows integer;
DECLARE affected_rows integer;
BEGIN
  SELECT count(*) INTO visible_rows FROM public.user_workspaces;
  IF visible_rows <> 1 OR NOT EXISTS (
    SELECT 1 FROM public.user_workspaces
    WHERE user_id = '@TEST_USER_A@'::uuid AND data->>'rls_probe' = 'owner-a'
  ) THEN
    RAISE EXCEPTION 'Owner A cannot read exactly its own workspace';
  END IF;

  UPDATE public.user_workspaces
  SET data = '{"rls_probe":"cross-user-write"}'
  WHERE user_id = '@TEST_USER_B@'::uuid;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'Owner A changed owner B workspace';
  END IF;

  BEGIN
    INSERT INTO public.user_workspaces (user_id, version, data, updated_at)
    VALUES ('@TEST_USER_B@', 2, '{"rls_probe":"cross-user-insert"}', now());
    RAISE EXCEPTION 'Owner A inserted a workspace for owner B';
  EXCEPTION WHEN insufficient_privilege THEN
    NULL;
  END;
END
$$;

SELECT set_config('app.user_id', '@TEST_USER_B@', true);
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_workspaces
    WHERE user_id = '@TEST_USER_B@'::uuid AND data->>'rls_probe' = 'owner-b'
  ) THEN
    RAISE EXCEPTION 'Owner B workspace changed during owner A requests';
  END IF;
END
$$;

SELECT set_config('app.user_id', '@TEST_USER_A@', true);
UPDATE public.user_workspaces
SET version = 2, data = '{"rls_probe":"owner-a-updated"}'
WHERE user_id = '@TEST_USER_A@';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_workspaces
    WHERE user_id = '@TEST_USER_A@'::uuid
      AND version = 2
      AND data->>'rls_probe' = 'owner-a-updated'
  ) THEN
    RAISE EXCEPTION 'Owner A cannot update its own workspace';
  END IF;
END
$$;

ROLLBACK;
