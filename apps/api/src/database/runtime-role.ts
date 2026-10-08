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
}
export const runtimeRoleIsRestricted = (role: RuntimePrivileges | undefined) =>
  [
    'rolsuper',
    'rolcreatedb',
    'rolcreaterole',
    'rolreplication',
    'rolbypassrls',
    'schema_create',
    'database_create',
    'owns_tables',
    'member_of_role',
  ].every((key) => role?.[key as keyof RuntimePrivileges] === false);

export const RUNTIME_PRIVILEGES_QUERY = `
SELECT r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolreplication,r.rolbypassrls,
has_schema_privilege(current_user,'public','CREATE') AS schema_create,
has_database_privilege(current_user,current_database(),'CREATE') AS database_create,
EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE c.relowner=r.oid AND n.nspname='public') AS owns_tables,
EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=r.oid) AS member_of_role
FROM pg_roles r WHERE r.rolname=current_user`;
