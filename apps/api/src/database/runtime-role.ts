export interface RuntimePrivileges {
  rolsuper: boolean;
  rolcreatedb: boolean;
  rolcreaterole: boolean;
  rolreplication: boolean;
  rolbypassrls: boolean;
  schema_create: boolean;
  database_create: boolean;
  owns_tables: boolean;
  member_of_role: boolean;
  workspace_select: boolean;
  workspace_insert: boolean;
  workspace_update: boolean;
  workspace_delete: boolean;
  auth_users_select: boolean;
  auth_users_insert: boolean;
  auth_users_update: boolean;
  auth_users_delete: boolean;
  auth_identities_select: boolean;
  auth_identities_insert: boolean;
  auth_identities_update: boolean;
  auth_identities_delete: boolean;
  steam_attempts_select: boolean;
  steam_attempts_insert: boolean;
  steam_attempts_update: boolean;
  steam_attempts_delete: boolean;
  steam_exchanges_select: boolean;
  steam_exchanges_insert: boolean;
  steam_exchanges_update: boolean;
  steam_exchanges_delete: boolean;
  tutorial_guides_select: boolean;
  tutorial_guides_insert: boolean;
  tutorial_guides_update: boolean;
  tutorial_guides_delete: boolean;
  tutorial_steps_select: boolean;
  tutorial_steps_insert: boolean;
  tutorial_steps_update: boolean;
  tutorial_steps_delete: boolean;
}
const forbiddenRolePrivileges = [
  'rolsuper',
  'rolcreatedb',
  'rolcreaterole',
  'rolreplication',
  'rolbypassrls',
  'schema_create',
  'database_create',
  'owns_tables',
  'member_of_role',
] as const satisfies readonly (keyof RuntimePrivileges)[];

const expectedTablePrivileges: Omit<RuntimePrivileges, (typeof forbiddenRolePrivileges)[number]> = {
  workspace_select: true,
  workspace_insert: true,
  workspace_update: true,
  workspace_delete: false,
  auth_users_select: true,
  auth_users_insert: true,
  auth_users_update: false,
  auth_users_delete: false,
  auth_identities_select: true,
  auth_identities_insert: true,
  auth_identities_update: false,
  auth_identities_delete: false,
  steam_attempts_select: true,
  steam_attempts_insert: true,
  steam_attempts_update: true,
  steam_attempts_delete: true,
  steam_exchanges_select: true,
  steam_exchanges_insert: true,
  steam_exchanges_update: true,
  steam_exchanges_delete: true,
  tutorial_guides_select: true,
  tutorial_guides_insert: true,
  tutorial_guides_update: true,
  tutorial_guides_delete: true,
  tutorial_steps_select: true,
  tutorial_steps_insert: true,
  tutorial_steps_update: true,
  tutorial_steps_delete: true,
};

export const runtimeRoleIsRestricted = (role: RuntimePrivileges | undefined) =>
  Boolean(
    role &&
    forbiddenRolePrivileges.every((key) => role[key] === false) &&
    Object.entries(expectedTablePrivileges).every(
      ([key, expected]) => role[key as keyof typeof expectedTablePrivileges] === expected,
    ),
  );

export const RUNTIME_PRIVILEGES_QUERY = `
SELECT r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,
has_schema_privilege(current_user,'public','CREATE') AS schema_create,
has_database_privilege(current_user,current_database(),'CREATE') AS database_create,
EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relowner=r.oid AND n.nspname='public') AS owns_tables,
EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS member_of_role,
has_table_privilege(current_user,'public.user_workspaces','SELECT') AS workspace_select,
has_table_privilege(current_user,'public.user_workspaces','INSERT') AS workspace_insert,
has_table_privilege(current_user,'public.user_workspaces','UPDATE') AS workspace_update,
has_table_privilege(current_user,'public.user_workspaces','DELETE') AS workspace_delete,
has_table_privilege(current_user,'public.auth_users','SELECT') AS auth_users_select,
has_table_privilege(current_user,'public.auth_users','INSERT') AS auth_users_insert,
has_table_privilege(current_user,'public.auth_users','UPDATE') AS auth_users_update,
has_table_privilege(current_user,'public.auth_users','DELETE') AS auth_users_delete,
has_table_privilege(current_user,'public.auth_identities','SELECT') AS auth_identities_select,
has_table_privilege(current_user,'public.auth_identities','INSERT') AS auth_identities_insert,
has_table_privilege(current_user,'public.auth_identities','UPDATE') AS auth_identities_update,
has_table_privilege(current_user,'public.auth_identities','DELETE') AS auth_identities_delete,
has_table_privilege(current_user,'public.steam_auth_attempts','SELECT') AS steam_attempts_select,
has_table_privilege(current_user,'public.steam_auth_attempts','INSERT') AS steam_attempts_insert,
has_table_privilege(current_user,'public.steam_auth_attempts','UPDATE') AS steam_attempts_update,
has_table_privilege(current_user,'public.steam_auth_attempts','DELETE') AS steam_attempts_delete,
has_table_privilege(current_user,'public.steam_auth_exchanges','SELECT') AS steam_exchanges_select,
has_table_privilege(current_user,'public.steam_auth_exchanges','INSERT') AS steam_exchanges_insert,
has_table_privilege(current_user,'public.steam_auth_exchanges','UPDATE') AS steam_exchanges_update,
has_table_privilege(current_user,'public.steam_auth_exchanges','DELETE') AS steam_exchanges_delete,
has_table_privilege(current_user,'public.tutorial_guides','SELECT') AS tutorial_guides_select,
has_table_privilege(current_user,'public.tutorial_guides','INSERT') AS tutorial_guides_insert,
has_table_privilege(current_user,'public.tutorial_guides','UPDATE') AS tutorial_guides_update,
has_table_privilege(current_user,'public.tutorial_guides','DELETE') AS tutorial_guides_delete,
has_table_privilege(current_user,'public.tutorial_guide_steps','SELECT') AS tutorial_steps_select,
has_table_privilege(current_user,'public.tutorial_guide_steps','INSERT') AS tutorial_steps_insert,
has_table_privilege(current_user,'public.tutorial_guide_steps','UPDATE') AS tutorial_steps_update,
has_table_privilege(current_user,'public.tutorial_guide_steps','DELETE') AS tutorial_steps_delete
FROM pg_roles r WHERE r.rolname=current_user`;
