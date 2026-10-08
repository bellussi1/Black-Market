import { describe, expect, it } from 'vitest';

import { type RuntimePrivileges, runtimeRoleIsRestricted } from './runtime-role';

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
};
describe('Runtime database privileges', () => {
  it('accepts a restricted role', () => expect(runtimeRoleIsRestricted(restricted)).toBe(true));
  it('rejects each administrative capability and inherited membership', () => {
    for (const key of Object.keys(restricted))
      expect(runtimeRoleIsRestricted({ ...restricted, [key]: true })).toBe(false);
  });
  it('fails closed for missing privilege results', () => {
    expect(runtimeRoleIsRestricted(undefined)).toBe(false);
    expect(runtimeRoleIsRestricted({} as RuntimePrivileges)).toBe(false);
  });
});
