import { tutorialGuides, tutorialGuideSteps } from '@bdo/database/schema';
import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import { createTutorialSeeder, type TutorialSeedEntry } from './tutorial-seed';

const entries: TutorialSeedEntry[] = [
  {
    screenKey: 'market',
    locale: 'pt-BR',
    enabled: true,
    steps: [
      { sortOrder: 0, anchorKey: 'market.search', title: 'Busca', body: 'Localize um item.' },
      {
        sortOrder: 1,
        anchorKey: 'market.results',
        title: 'Resultados',
        body: 'Compare preço e estoque.',
      },
    ],
  },
];

function createDatabase() {
  const guides: Record<string, unknown>[] = [];
  const steps: Record<string, unknown>[] = [];
  const lockKeys: string[] = [];
  const actions: string[] = [];
  const dialect = new PgDialect();
  const execute = vi.fn((statement: SQL) => {
    const key = String(dialect.sqlToQuery(statement).params[0]);
    lockKeys.push(key);
    actions.push(`lock:${key}`);
    return Promise.resolve(undefined);
  });
  const transaction = vi.fn(async (callback: (tx: never) => Promise<unknown>) =>
    callback(tx as never),
  );

  const tx = {
    execute,
    insert: vi.fn((table: unknown) => {
      let values: Record<string, unknown>[] = [];
      return {
        values(value: Record<string, unknown> | Record<string, unknown>[]) {
          values = Array.isArray(value) ? value : [value];
          actions.push(table === tutorialGuides ? 'insert:guide' : 'insert:steps');
          return this;
        },
        onConflictDoNothing() {
          return this;
        },
        returning() {
          const inserted =
            table === tutorialGuides &&
            !guides.some(
              (existing) =>
                existing.screenKey === values[0]?.screenKey &&
                existing.locale === values[0]?.locale,
            );
          if (!inserted) return Promise.resolve([]);
          const guide = { ...values[0], id: '00000000-0000-4000-8000-000000000010' };
          guides.push(guide);
          return Promise.resolve([{ id: guide.id }]);
        },
        then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
          if (table === tutorialGuideSteps) steps.push(...values);
          return Promise.resolve(undefined).then(resolve, reject);
        },
      };
    }),
  };

  return {
    db: { transaction },
    execute,
    lockKeys,
    actions,
    transaction,
    guides,
    steps,
  };
}

describe('tutorial seed', () => {
  it('takes the same per-guide advisory lock as replace before inserting the guide', async () => {
    const database = createDatabase();
    const seedTutorialGuides = createTutorialSeeder(database as never);

    await seedTutorialGuides(1, entries);

    expect(database.lockKeys).toEqual(['tutorial:seed', 'tutorial:guide:market:pt-BR']);
    expect(database.actions.slice(0, 4)).toEqual([
      'lock:tutorial:seed',
      'lock:tutorial:guide:market:pt-BR',
      'insert:guide',
      'insert:steps',
    ]);
  });

  it('inserts missing guides once and preserves later administrative edits when rerun', async () => {
    const database = createDatabase();
    const seedTutorialGuides = createTutorialSeeder(database as never);

    await seedTutorialGuides(1, entries);
    expect(database.guides).toHaveLength(1);
    expect(database.steps).toHaveLength(2);

    database.guides[0].enabled = false;
    database.steps[0].title = 'Título editado por administração';
    await seedTutorialGuides(1, entries);

    expect(database.transaction).toHaveBeenCalledTimes(2);
    expect(database.execute).toHaveBeenCalledTimes(4);
    expect(database.lockKeys).toEqual([
      'tutorial:seed',
      'tutorial:guide:market:pt-BR',
      'tutorial:seed',
      'tutorial:guide:market:pt-BR',
    ]);
    expect(database.guides).toHaveLength(1);
    expect(database.guides[0]).toMatchObject({ enabled: false });
    expect(database.steps).toHaveLength(2);
    expect(database.steps[0]).toMatchObject({ title: 'Título editado por administração' });
  });
});
