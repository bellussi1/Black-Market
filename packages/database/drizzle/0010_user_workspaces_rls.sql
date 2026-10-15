ALTER TABLE public.user_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_workspaces FORCE ROW LEVEL SECURITY;

CREATE POLICY user_workspaces_owner_select
  ON public.user_workspaces
  FOR SELECT
  TO PUBLIC
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY user_workspaces_owner_insert
  ON public.user_workspaces
  FOR INSERT
  TO PUBLIC
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);

CREATE POLICY user_workspaces_owner_update
  ON public.user_workspaces
  FOR UPDATE
  TO PUBLIC
  USING (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid)
  WITH CHECK (user_id = NULLIF(current_setting('app.user_id', true), '')::uuid);
