import { tutorialGuides } from '@bdo/database/schema';
import { TUTORIAL_SCREEN_REGISTRY } from '@bdo/shared';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TutorialsService } from './tutorials.service';

interface GuideRow {
  id: string;
  screenKey: string;
  locale: string;
  enabled: boolean;
  updatedAt: Date;
}

interface StepRow {
  id: string;
  guideId: string;
  sortOrder: number;
  anchorKey: string | null;
  title: string;
  body: string;
}

describe('TutorialsService', () => {
  let guides: GuideRow[];
  let steps: StepRow[];
  let service: TutorialsService;

  beforeEach(() => {
    guides = [];
    steps = [];

    const createSelect = () => ({
      from: (table: unknown) => {
        const rows = table === tutorialGuides ? [...guides] : [...steps];
        const promise = Promise.resolve(rows);
        return Object.assign(promise, {
          where: () => Promise.resolve(rows),
        });
      },
    });

    const tx = {
      execute: vi.fn(() => Promise.resolve(undefined)),
      select: vi.fn(createSelect),
      update: vi.fn(() => ({
        set: vi.fn((patch: Partial<GuideRow>) => ({
          where: vi.fn(() => {
            if (guides[0]) {
              guides[0] = { ...guides[0], ...patch };
            }
            return Promise.resolve();
          }),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => {
          steps = [];
          return Promise.resolve();
        }),
      })),
      insert: vi.fn((table: unknown) => ({
        values: vi.fn((values: unknown) => {
          if (table === tutorialGuides) {
            guides.push(values as GuideRow);
          } else {
            steps.push(...(values as StepRow[]));
          }
          return Promise.resolve();
        }),
      })),
    };

    const database = {
      db: {
        select: vi.fn(createSelect),
        transaction: vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx)),
      },
    };

    service = new TutorialsService(database as never);
  });

  it('advances the revision even when two edits share a clock millisecond', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-15T12:00:00.000Z'));
    try {
      const payload = {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [{ sortOrder: 0, anchorKey: null, title: 'Título', body: 'Texto' }],
      };
      const first = await service.replace('market', 'pt-BR', payload);
      const second = await service.replace('market', 'pt-BR', {
        ...payload,
        expectedUpdatedAt: first.updatedAt,
      });
      expect(second.updatedAt).not.toBe(first.updatedAt);
      await expect(
        service.replace('market', 'pt-BR', { ...payload, expectedUpdatedAt: first.updatedAt }),
      ).rejects.toBeInstanceOf(ConflictException);
    } finally {
      vi.useRealTimers();
    }
  });
  it('serves the versioned workshop guide when there is no database entry', async () => {
    const result = await service.getPublished('recipe-workshop', 'pt-BR');

    expect(result.guide).toMatchObject({
      screenKey: 'recipe-workshop',
      locale: 'pt-BR',
      updatedAt: '2026-10-16T00:00:00.000Z',
      steps: [
        {
          sortOrder: 0,
          anchorKey: 'recipe-workshop.batch-mastery',
          title: 'Definir lote e maestria',
        },
        {
          sortOrder: 1,
          anchorKey: 'recipe-workshop.financial',
          title: 'Ler o resultado financeiro',
        },
        {
          sortOrder: 2,
          anchorKey: 'recipe-workshop.strategy',
          title: 'Comparar estratégias',
        },
        {
          sortOrder: 3,
          anchorKey: 'recipe-workshop.materials-returns',
          title: 'Revisar materiais e retornos',
        },
      ],
    });
    expect(guides).toHaveLength(0);
  });

  it('uses an enabled database guide instead of the versioned fallback', async () => {
    guides = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        screenKey: 'recipe-workshop',
        locale: 'pt-BR',
        enabled: true,
        updatedAt: new Date('2026-10-17T12:00:00.000Z'),
      },
    ];
    steps = [
      {
        id: '00000000-0000-4000-8000-000000000011',
        guideId: '00000000-0000-4000-8000-000000000001',
        sortOrder: 0,
        anchorKey: 'recipe-workshop.batch-mastery',
        title: 'Edição administrativa',
        body: 'Conteúdo salvo no banco.',
      },
    ];

    await expect(service.getPublished('recipe-workshop', 'pt-BR')).resolves.toMatchObject({
      guide: { updatedAt: '2026-10-17T12:00:00.000Z', steps: [{ title: 'Edição administrativa' }] },
    });
  });

  it('keeps an explicitly disabled database guide disabled', async () => {
    await expect(service.getPublished('recipe-workshop', 'en-US')).resolves.toEqual({
      guide: null,
    });

    guides = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        screenKey: 'recipe-workshop',
        locale: 'pt-BR',
        enabled: false,
        updatedAt: new Date('2026-10-15T12:00:00.000Z'),
      },
    ];
    steps = [
      {
        id: '00000000-0000-4000-8000-000000000011',
        guideId: '00000000-0000-4000-8000-000000000001',
        sortOrder: 0,
        anchorKey: 'recipe-workshop.batch-mastery',
        title: 'Buscar',
        body: 'Pesquise um item.',
      },
    ];

    await expect(service.getPublished('recipe-workshop', 'pt-BR')).resolves.toEqual({
      guide: null,
    });
    await expect(service.getPublished('unknown', 'pt-BR')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('lists registered screens and locales including disabled guides', async () => {
    guides = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        screenKey: 'market',
        locale: 'pt-BR',
        enabled: false,
        updatedAt: new Date('2026-10-15T12:00:00.000Z'),
      },
    ];
    steps = [
      {
        id: '00000000-0000-4000-8000-000000000012',
        guideId: '00000000-0000-4000-8000-000000000001',
        sortOrder: 1,
        anchorKey: 'market.results',
        title: 'Resultados',
        body: 'Confira a tabela.',
      },
      {
        id: '00000000-0000-4000-8000-000000000011',
        guideId: '00000000-0000-4000-8000-000000000001',
        sortOrder: 0,
        anchorKey: 'market.search',
        title: 'Buscar',
        body: 'Pesquise um item.',
      },
    ];

    const management = await service.getManagement();
    expect(management.locales).toEqual(['pt-BR']);
    expect(management.screens).toEqual(TUTORIAL_SCREEN_REGISTRY);
    expect(management.guides).toHaveLength(1);
    expect(management.guides[0]?.enabled).toBe(false);
    expect(management.guides[0]?.steps.map((step) => step.title)).toEqual(['Buscar', 'Resultados']);
  });

  it('replaces metadata and ordered steps atomically on matching version', async () => {
    const initialDate = new Date('2026-10-15T12:00:00.000Z');
    guides = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        screenKey: 'market',
        locale: 'pt-BR',
        enabled: false,
        updatedAt: initialDate,
      },
    ];
    steps = [
      {
        id: '00000000-0000-4000-8000-000000000011',
        guideId: '00000000-0000-4000-8000-000000000001',
        sortOrder: 0,
        anchorKey: 'market.search',
        title: 'Antigo',
        body: 'Texto antigo.',
      },
    ];

    const updated = await service.replace('market', 'pt-BR', {
      expectedUpdatedAt: initialDate.toISOString(),
      enabled: true,
      steps: [
        {
          sortOrder: 9,
          anchorKey: 'market.results',
          title: 'Segundo passo',
          body: 'Veja os resultados.',
        },
        {
          sortOrder: 2,
          anchorKey: 'market.search',
          title: 'Primeiro passo',
          body: 'Busque o item.',
        },
      ],
    });

    expect(updated.enabled).toBe(true);
    expect(updated.updatedAt).not.toBe(initialDate.toISOString());
    expect(updated.steps.map((step) => ({ sortOrder: step.sortOrder, title: step.title }))).toEqual(
      [
        { sortOrder: 0, title: 'Primeiro passo' },
        { sortOrder: 1, title: 'Segundo passo' },
      ],
    );
  });

  it('creates only with a null expectedUpdatedAt', async () => {
    await expect(
      service.replace('market', 'pt-BR', {
        expectedUpdatedAt: '2026-10-15T12:00:00.000Z',
        enabled: true,
        steps: [
          {
            sortOrder: 0,
            anchorKey: 'market.search',
            title: 'Buscar',
            body: 'Pesquise um item.',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    const created = await service.replace('market', 'pt-BR', {
      expectedUpdatedAt: null,
      enabled: true,
      steps: [
        {
          sortOrder: 0,
          anchorKey: 'market.search',
          title: 'Buscar',
          body: 'Pesquise um item.',
        },
      ],
    });

    expect(created.screenKey).toBe('market');
    expect(created.steps).toHaveLength(1);
    expect(guides).toHaveLength(1);
  });

  it('rejects stale versions without deleting the current guide', async () => {
    const initialDate = new Date('2026-10-15T12:00:00.000Z');
    guides = [
      {
        id: '00000000-0000-4000-8000-000000000001',
        screenKey: 'market',
        locale: 'pt-BR',
        enabled: true,
        updatedAt: initialDate,
      },
    ];
    steps = [
      {
        id: '00000000-0000-4000-8000-000000000011',
        guideId: '00000000-0000-4000-8000-000000000001',
        sortOrder: 0,
        anchorKey: 'market.search',
        title: 'Original',
        body: 'Permanece salvo.',
      },
    ];

    await expect(
      service.replace('market', 'pt-BR', {
        expectedUpdatedAt: '2026-10-14T12:00:00.000Z',
        enabled: false,
        steps: [
          {
            sortOrder: 0,
            anchorKey: null,
            title: 'Conflito',
            body: 'Não deve sobrescrever.',
          },
        ],
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(guides[0]?.enabled).toBe(true);
    expect(steps[0]?.title).toBe('Original');
  });
});
