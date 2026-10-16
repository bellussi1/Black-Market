ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_users FORCE ROW LEVEL SECURITY;

CREATE POLICY auth_users_scoped_select
  ON public.auth_users
  FOR SELECT
  TO PUBLIC
  USING (
    firebase_uid = NULLIF(current_setting('app.firebase_uid', true), '')
    OR id = NULLIF(current_setting('app.user_id', true), '')::uuid
  );

CREATE POLICY auth_users_scoped_insert
  ON public.auth_users
  FOR INSERT
  TO PUBLIC
  WITH CHECK (firebase_uid = NULLIF(current_setting('app.firebase_uid', true), ''));

ALTER TABLE public.auth_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_identities FORCE ROW LEVEL SECURITY;

CREATE POLICY auth_identities_scoped_select
  ON public.auth_identities
  FOR SELECT
  TO PUBLIC
  USING (
    user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    OR (
      provider::text = NULLIF(current_setting('app.identity_provider', true), '')
      AND subject = NULLIF(current_setting('app.identity_subject', true), '')
    )
  );

CREATE POLICY auth_identities_scoped_insert
  ON public.auth_identities
  FOR INSERT
  TO PUBLIC
  WITH CHECK (
    user_id = NULLIF(current_setting('app.user_id', true), '')::uuid
    AND provider::text = NULLIF(current_setting('app.identity_provider', true), '')
    AND subject = NULLIF(current_setting('app.identity_subject', true), '')
  );
