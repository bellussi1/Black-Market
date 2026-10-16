import { tutorialGuides } from '@bdo/database/schema';
import { describe, expect, it, vi } from 'vitest';

import { seedTutorialGuides } from './tutorial-seed';
import type { TutorialSeedEntry } from './tutorial-seed-content';

describe('seedTutorialGuides', () => {
  it('inserts missing guides once and preserves later administrative edits when rerun', async () => {
    const guides = new Map<
      string,
      { id: string; screenKey: string; locale: string; enabled: boolean; updatedAt: Date }
    >();
    const steps = new Map<
      string,
      Array<{
        id: string;
        guideId: string;
        sortOrder: number;
        anchorKey: string | null;
        title: string;
        body: string;
      }>
    >();

    let activeScreenKey = 'market';

    const tx = {
      execute: vi.fn(() => Promise.resolve(undefined)),
      select: vi.fn(() => ({
        from: () => ({
          where: () => {
            const existing = guides.get(`${activeScreenKey}:pt-BR`);
            return Promise.resolve(existing ? [existing] : []);
          },
        }),
      })),
      insert: vi.fn((table: unknown) => ({
        values: (payload: unknown) => {
          if (table === tutorialGuides) {
            const row = payload as {
              id: string;
              screenKey: string;
              locale: string;
              enabled: boolean;
              updatedAt: Date;
            };
            const key = `${row.screenKey}:${row.locale}`;
            return {
              onConflictDoNothing: () => ({
                returning: () => {
                  if (guides.has(key)) {
                    return Promise.resolve([]);
                  }
                  guides.set(key, row);
                  return Promise.resolve([{ id: row.id }]);
                },
              }),
            };
          }
          const stepRows = payload as Array<{
            id: string;
            guideId: string;
            sortOrder: number;
            anchorKey: string | null;
            title: string;
            body: string;
          }>;
          const guideId = stepRows[0]?.guideId;
          if (guideId) {
            steps.set(guideId, stepRows);
          }
          return Promise.resolve();
        },
      })),
    };

    const database = {
      db: {
        transaction: vi.fn(async (callback: (value: typeof tx) => Promise<unknown>) =>
          callback(tx),
        ),
      },
    };

    const syntheticEntries: readonly TutorialSeedEntry[] = [
      {
        screenKey: 'market',
        locale: 'pt-BR',
        enabled: true,
        steps: [
          {
            sortOrder: 0,
            anchorKey: 'market.search',
            title: 'Título sintético inicial',
            body: 'Corpo sintético inicial apenas para o teste.',
          },
        ],
      },
    ];

    activeScreenKey = 'market';
    const firstRun = await seedTutorialGuides(database as never, 'test-rev-1', syntheticEntries);
    expect(firstRun).toEqual({
      revision: 'test-rev-1',
      insertedScreens: ['market:pt-BR'],
      skippedScreens: [],
    });

    const savedGuide = guides.get('market:pt-BR');
    expect(savedGuide).toBeDefined();
    savedGuide!.enabled = false;
    steps.set(savedGuide!.id, [
      {
        id: 'edited-step-id',
        guideId: savedGuide!.id,
        sortOrder: 0,
        anchorKey: null,
        title: 'Editado pelo administrador',
        body: 'Texto alterado no painel administrativo.',
      },
    ]);

    const secondRun = await seedTutorialGuides(database as never, 'test-rev-2', syntheticEntries);
    expect(secondRun).toEqual({
      revision: 'test-rev-2',
      insertedScreens: [],
      skippedScreens: ['market:pt-BR'],
    });
    expect(guides.get('market:pt-BR')?.enabled).toBe(false);
    expect(steps.get(savedGuide!.id)?.[0]?.title).toBe('Editado pelo administrador');
  });
});
