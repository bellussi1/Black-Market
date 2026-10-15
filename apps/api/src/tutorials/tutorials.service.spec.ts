import { tutorialGuides, tutorialGuideSteps } from '@bdo/database/schema';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TutorialsService } from './tutorials.service';

const updatedAt = new Date('2026-10-15T10:00:00.000Z');
const guide = {
  id: '00000000-0000-4000-8000-000000000001',
  screenKey: 'market',
  locale: 'pt-BR',
  enabled: true,
  updatedAt,
};
const guideStep = {
  id: '00000000-0000-4000-8000-000000000002',
  guideId: guide.id,
  sortOrder: 0,
  anchorKey: 'market.search',
  title: 'Buscar no mercado',
  body: 'Digite o nome ou código do item.',
};

function createDatabase() {
  let guides: (typeof guide)[] = [];
  let steps: (typeof guideStep)[] = [];
  let nextId = 3;
  const insertedSteps: (typeof guideStep)[][] = [];
  const deletedSteps = vi.fn(() => {
    steps = [];
    return Promise.resolve();
  });
  const transaction = vi.fn(async (callback: (tx: never) => Promise<unknown>, _config?: unknown) =>
    callback(tx as never),
  );

  const query = () => {
    let table: unknown;
    const builder: Record<string, unknown> = {
      from(value: unknown) {
        table = value;
        return builder;
      },
      where() {
        return builder;
      },
      orderBy() {
        return builder;
      },
      limit() {
        return builder;
      },
      then(resolve: (value: unknown) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve(table === tutorialGuides ? [...guides] : [...steps]).then(
          resolve,
          reject,
        );
      },
    };
    return builder;
  };

  const insert = (table: unknown) => ({
    values(value: unknown) {
      const values = (Array.isArray(value) ? value : [value]) as Record<string, unknown>[];
      if (table === tutorialGuides) {
        const row = {
          ...values[0],
          id: values[0]?.id ?? `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
        } as typeof guide;
        guides = [...guides, row];
        return {
          returning: () => Promise.resolve([row]),
        };
      }
      const inserted = (values as unknown as (typeof guideStep)[]).map((step) => ({
        ...step,
        id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
      }));
      insertedSteps.push(inserted);
      steps = [...steps, ...inserted];
      return { returning: () => Promise.resolve(inserted) };
    },
  });

  const tx = {
    execute: vi.fn(() => Promise.resolve(undefined)),
    select: vi.fn(query),
    insert: vi.fn(insert),
    update: vi.fn((table: unknown) => ({
      set(value: Record<string, unknown>) {
        return {
          where: () => {
            if (table === tutorialGuides && guides[0]) guides = [{ ...guides[0], ...value }];
            return Promise.resolve();
          },
        };
      },
    })),
    delete: vi.fn((table: unknown) => ({
      where: () => (table === tutorialGuideSteps ? deletedSteps() : Promise.resolve()),
    })),
  };

  return {
    db: {
      select: vi.fn(query),
      transaction,
    },
    tx,
    get guides() {
      return guides;
    },
    set guides(value: (typeof guide)[]) {
      guides = value;
    },
    get steps() {
      return steps;
    },
    set steps(value: (typeof guideStep)[]) {
      steps = value;
    },
    insertedSteps,
    deletedSteps,
  };
}

describe('TutorialsService', () => {
  let database: ReturnType<typeof createDatabase>;
  let service: TutorialsService;

  beforeEach(() => {
    database = createDatabase();
    service = new TutorialsService(database as never);
  });

  it('returns null for a missing or disabled registered guide', async () => {
    await expect(service.getPublished('market', 'pt-BR')).resolves.toEqual({ guide: null });

    database.guides = [{ ...guide, enabled: false }];
    await expect(service.getPublished('market', 'pt-BR')).resolves.toEqual({ guide: null });
  });

  it('returns only public fields for an enabled guide and its ordered steps', async () => {
    database.guides = [{ ...guide }];
    database.steps = [{ ...guideStep }];

    await expect(service.getPublished('market', 'pt-BR')).resolves.toEqual({
      guide: {
        screenKey: 'market',
        locale: 'pt-BR',
        updatedAt: updatedAt.toISOString(),
        steps: [
          {
            sortOrder: 0,
            anchorKey: guideStep.anchorKey,
            title: guideStep.title,
            body: guideStep.body,
          },
        ],
      },
    });
  });

  it('reads published guide and steps within a read-only repeatable-read transaction', async () => {
    await service.getPublished('market', 'pt-BR');

    expect(database.db.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    });
    expect(database.db.select).not.toHaveBeenCalled();
  });

  it('reads management guides and steps within a read-only repeatable-read transaction', async () => {
    await service.getManagement();

    expect(database.db.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: 'repeatable read',
      accessMode: 'read only',
    });
    expect(database.db.select).not.toHaveBeenCalled();
  });

  it('lists registered screens and locales with disabled guides included', async () => {
    database.guides = [{ ...guide, enabled: false }];
    database.steps = [guideStep];

    const response = await service.getManagement();

    expect(response.screens.map(({ screenKey }) => screenKey)).toEqual([
      'market',
      'recipes',
      'scans',
      'storage',
      'recommendations',
    ]);
    expect(response.locales).toEqual(['pt-BR']);
    expect(response.guides).toEqual([
      {
        id: guide.id,
        screenKey: 'market',
        locale: 'pt-BR',
        enabled: false,
        updatedAt: updatedAt.toISOString(),
        steps: [
          {
            id: guideStep.id,
            sortOrder: 0,
            anchorKey: guideStep.anchorKey,
            title: guideStep.title,
            body: guideStep.body,
          },
        ],
      },
    ]);
  });

  it('replaces guide metadata and ordered steps in one transaction on a matching version', async () => {
    database.guides = [{ ...guide }];
    database.steps = [{ ...guideStep }];

    const result = await service.replace('market', 'pt-BR', {
      expectedUpdatedAt: updatedAt.toISOString(),
      enabled: false,
      steps: [
        {
          sortOrder: 1,
          anchorKey: 'market.filters',
          title: 'Filtros',
          body: 'Refine os resultados.',
        },
        {
          sortOrder: 0,
          anchorKey: 'market.search',
          title: 'Busca',
          body: 'Localize um item.',
        },
      ],
    });

    expect(database.db.transaction).toHaveBeenCalledOnce();
    expect(database.deletedSteps).toHaveBeenCalledOnce();
    expect(database.insertedSteps[0]?.map(({ sortOrder }) => sortOrder)).toEqual([0, 1]);
    expect(result).toMatchObject({
      id: guide.id,
      enabled: false,
      steps: [
        { sortOrder: 0, title: 'Busca' },
        { sortOrder: 1, title: 'Filtros' },
      ],
    });
  });

  it('creates a guide only when expectedUpdatedAt is null', async () => {
    const created = await service.replace('market', 'pt-BR', {
      expectedUpdatedAt: null,
      enabled: true,
      steps: [{ sortOrder: 0, anchorKey: null, title: 'Mercado', body: 'Consulte os itens.' }],
    });

    expect(database.db.transaction).toHaveBeenCalledOnce();
    expect(created.id).toBeDefined();
    expect(created.updatedAt).toBeDefined();
    expect(database.guides).toHaveLength(1);
    expect(database.steps[0]).toMatchObject({ guideId: created.id, sortOrder: 0 });
  });

  it('rejects stale versions without deleting the current guide or steps', async () => {
    database.guides = [{ ...guide }];
    database.steps = [{ ...guideStep }];

    await expect(
      service.replace('market', 'pt-BR', {
        expectedUpdatedAt: '2026-10-14T10:00:00.000Z',
        enabled: false,
        steps: [{ sortOrder: 0, anchorKey: null, title: 'Novo', body: 'Novo conteúdo.' }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(database.deletedSteps).not.toHaveBeenCalled();
    expect(database.guides).toEqual([{ ...guide }]);
    expect(database.steps).toEqual([{ ...guideStep }]);
  });

  it('returns not found for a screen outside the compiled registry', async () => {
    await expect(service.getPublished('unknown', 'pt-BR')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
