import { describe, expect, it } from 'vitest';

import {
  RUNTIME_PRIVILEGES_QUERY,
  type RuntimePrivileges,
  runtimeRoleIsRestricted,
} from './runtime-role';

const restricted: RuntimePrivileges = {
  rolsuper: false,
  rolcreatedb: false,
  rolcreaterole: false,
  rolreplication: false,
  rolbypassrls: false,
  schema_create: false,
  database_create: false,
  owns_tables: false,
  member_of_role: false,
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
describe('Runtime database privileges', () => {
  it('accepts a restricted role', () => expect(runtimeRoleIsRestricted(restricted)).toBe(true));
  it('rejects each administrative capability and inherited membership', () => {
    for (const key of [
      'rolsuper',
      'rolcreatedb',
      'rolcreaterole',
      'rolreplication',
      'rolbypassrls',
      'schema_create',
      'database_create',
      'owns_tables',
      'member_of_role',
    ])
      expect(runtimeRoleIsRestricted({ ...restricted, [key]: true })).toBe(false);
  });
  it('requires only the table privileges needed by workspace and social auth flows', () => {
    for (const [key, value] of Object.entries(restricted).filter(
      ([key]) =>
        key.startsWith('workspace_') || key.startsWith('auth_') || key.startsWith('steam_'),
    ))
      expect(runtimeRoleIsRestricted({ ...restricted, [key]: !value })).toBe(false);
  });
  it('fails closed for missing privilege results', () => {
    expect(runtimeRoleIsRestricted(undefined)).toBe(false);
    expect(runtimeRoleIsRestricted({} as RuntimePrivileges)).toBe(false);
  });
  it('requires only the four tutorial table privileges used by the API', () => {
    expect(runtimeRoleIsRestricted(restricted)).toBe(true);
    for (const key of [
      'tutorial_guides_select',
      'tutorial_guides_insert',
      'tutorial_guides_update',
      'tutorial_guides_delete',
      'tutorial_steps_select',
      'tutorial_steps_insert',
      'tutorial_steps_update',
      'tutorial_steps_delete',
    ] as const) {
      expect(runtimeRoleIsRestricted({ ...restricted, [key]: false }), key).toBe(false);
      expect(runtimeRoleIsRestricted({ ...restricted, [key]: undefined }), key).toBe(false);
    }
  });
  it('queries each required tutorial privilege against the correct table', () => {
    for (const [table, prefix] of [
      ['tutorial_guides', 'tutorial_guides'],
      ['tutorial_guide_steps', 'tutorial_steps'],
    ]) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
        expect(RUNTIME_PRIVILEGES_QUERY).toContain(
          `has_table_privilege(current_user,'public.${table}','${privilege}') AS ${prefix}_${privilege.toLowerCase()}`,
        );
      }
    }
  });
});
