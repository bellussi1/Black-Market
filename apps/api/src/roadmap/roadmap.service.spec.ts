import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { RoadmapService } from './roadmap.service';

const updatedAt = new Date('2026-10-13T12:00:00.000Z');
const row = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: 'market',
  kind: 'pillar' as const,
  sortOrder: 0,
  title: 'Mercado',
  summary: 'Cotações do mercado.',
  description: 'Use as cotações na simulação.',
  statusLabel: 'Disponível',
  icon: 'lucideStore',
  featured: false,
  links: [{ label: 'Abrir mercado', path: '/market' }],
  updatedAt,
};
type RoadmapTestRow = Omit<typeof row, 'kind'> & { kind: 'flow' | 'pillar' };

describe('RoadmapService', () => {
  let rows: RoadmapTestRow[];
  let transaction: Mock;
  let deleteRows: Mock<() => Promise<void>>;
  let insertRows: Mock<(values: RoadmapTestRow[]) => Promise<void>>;
  let service: RoadmapService;

  beforeEach(() => {
    rows = [];
    deleteRows = vi.fn(() => {
      rows = [];
      return Promise.resolve();
    });
    insertRows = vi.fn((values: RoadmapTestRow[]) => {
      rows = values;
      return Promise.resolve();
    });
    const tx = {
      execute: vi.fn(() => Promise.resolve(undefined)),
      select: vi.fn(() => ({ from: vi.fn(() => Promise.resolve([...rows])) })),
      delete: vi.fn(() => deleteRows()),
      insert: vi.fn(() => ({ values: insertRows })),
    };
    transaction = vi.fn((callback: (value: typeof tx) => Promise<unknown>) => callback(tx));
    const database = {
      db: {
        select: vi.fn(() => ({ from: vi.fn(() => Promise.resolve([...rows])) })),
        transaction,
      },
    };
    service = new RoadmapService(database as never);
  });

  it('returnsPersistedEntriesInGlobalSortOrderRegardlessOfKind', async () => {
    rows = [
      { ...row, slug: 'third-flow', kind: 'flow' as const, sortOrder: 2 },
      { ...row, slug: 'first-pillar', kind: 'pillar' as const, sortOrder: 0 },
      { ...row, slug: 'second-flow', kind: 'flow' as const, sortOrder: 1 },
      { ...row, slug: 'fourth-pillar', kind: 'pillar' as const, sortOrder: 3 },
    ];
    const response = await service.list();
    expect(response.entries.map((entry) => entry.slug)).toEqual([
      'first-pillar',
      'second-flow',
      'third-flow',
      'fourth-pillar',
    ]);
    expect(response.updatedAt).toBe(updatedAt.toISOString());
  });

  it('returns an empty response instead of substituting embedded roadmap content', async () => {
    await expect(service.list()).resolves.toEqual({ entries: [], updatedAt: null });
  });

  it('replaces all entries in a transaction and returns the persisted version', async () => {
    rows = [row];
    const result = await service.replace({
      expectedUpdatedAt: updatedAt.toISOString(),
      entries: [{ ...row, summary: 'Atualizado.' }],
    });
    expect(transaction).toHaveBeenCalledOnce();
    expect(deleteRows).toHaveBeenCalledOnce();
    const inserted = insertRows.mock.calls[0]?.[0];
    expect(inserted).toHaveLength(1);
    expect(inserted?.[0]).toMatchObject({
      id: row.id,
      slug: row.slug,
      summary: 'Atualizado.',
    });
    expect(inserted?.[0]?.updatedAt).toBeInstanceOf(Date);
    expect(result.entries[0]?.summary).toBe('Atualizado.');
  });

  it('rejects a stale editor version without deleting persisted content', async () => {
    rows = [row];
    await expect(
      service.replace({ expectedUpdatedAt: '2026-10-12T12:00:00.000Z', entries: [] }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(deleteRows).not.toHaveBeenCalled();
    expect(rows).toEqual([row]);
  });
});
