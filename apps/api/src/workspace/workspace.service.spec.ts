import { emptyWorkspace } from '@bdo/calculators/workspace';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../database/database.service';
import { WorkspaceService } from './workspace.service';
const owner = '00000000-0000-4000-8000-000000000001';
function fixture() {
  let row: { version: number; data: Record<string, unknown> | null } = {
    version: 3,
    data: { private: 'personal' },
  };
  const predicates: SQL[] = [];
  const set = vi.fn((value: typeof row) => {
    row = value;
    return {
      where: (predicate: SQL) => {
        predicates.push(predicate);
        return Promise.resolve();
      },
    };
  });
  const execute = vi.fn((_query: SQL) => Promise.resolve(undefined));
  const tx = {
    execute,
    select: () => ({
      from: () => ({
        where: (predicate: SQL) => {
          predicates.push(predicate);
          return { limit: () => Promise.resolve([row]) };
        },
      }),
    }),
    update: () => ({ set }),
  };
  const db = {
    transaction: (callback: (transaction: typeof tx) => Promise<unknown>) => callback(tx),
  };
  return {
    service: new WorkspaceService({ db } as unknown as DatabaseService),
    set,
    execute,
    predicates,
    row: () => row,
  };
}
describe('workspace deletion and stale-device protection', () => {
  it('removes contents while preserving a newer revision under the same owner lock', async () => {
    const value = fixture();
    expect(await value.service.remove(owner)).toEqual({ deleted: true, version: 4 });
    expect(value.row().data).toBeNull();
    expect(value.execute).toHaveBeenCalledTimes(2);
    expect(value.set).toHaveBeenCalledWith(expect.objectContaining({ data: null, version: 4 }));
  });
  it('sets the owner as transaction-local RLS context before reading private rows', async () => {
    const value = fixture();

    await value.service.get(owner);
    expect(value.execute).toHaveBeenCalledOnce();

    const dialect = new PgDialect();
    const [query] = value.execute.mock.calls[0];
    const compiled = dialect.sqlToQuery(query);
    expect(compiled.params).toEqual([owner]);
    expect(compiled.sql).toContain('set_config');
  });
  it('rejects the pre-deletion revision instead of recreating outdated contents', async () => {
    const value = fixture();
    await value.service.remove(owner);
    await expect(
      value.service.save(owner, { expectedVersion: 3, data: emptyWorkspace() }),
    ).rejects.toThrow('outro dispositivo');
    expect(value.row().data).toBeNull();
  });
  it('binds the owner as a SQL parameter on every lookup and update', async () => {
    const value = fixture();
    await value.service.remove(owner);
    const dialect = new PgDialect();
    expect(value.predicates.length).toBe(2);
    for (const predicate of value.predicates) {
      const query = dialect.sqlToQuery(predicate);
      expect(query.params).toEqual([owner]);
      expect(query.sql).not.toContain(owner);
    }
  });
});
