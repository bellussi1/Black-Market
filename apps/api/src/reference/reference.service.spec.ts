import { describe, expect, it, vi } from 'vitest';

import type { CatalogService } from '../catalog/catalog.service';
import type { DatabaseService } from '../database/database.service';
import { ReferenceService } from './reference.service';
function service(rows: unknown[]) {
  const select = vi
    .fn()
    .mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
    })
    .mockReturnValueOnce({
      from: () => ({
        where: () =>
          Promise.resolve([
            { id: 'territory', name: 'Balenos' },
            { id: 'manager', name: 'Fazenda Loggia' },
          ]),
      }),
    });
  return {
    select,
    instance: new ReferenceService(
      { db: { select } } as unknown as DatabaseService,
      {
        getActiveDataset: vi.fn().mockResolvedValue({
          id: 'dataset',
          version: 'verified-version',
          region: 'sa',
          locale: 'pt',
          finishedAt: new Date('2026-10-09T12:00:00Z'),
        }),
      } as unknown as CatalogService,
    ),
  };
}
describe('Item acquisition sources', () => {
  it('resolves node and territory names only in the selected dataset and validates coordinates', async () => {
    const { instance } = service([
      {
        id: 'production',
        name: '<tag>Mineração',
        data: {
          territory: 'territory',
          managerNode: 'manager',
          position: [1, 2, 3],
          contribution: 1,
          products: { urns: ['urn::item:4001'] },
          links: { urns: ['manager'] },
        },
      },
    ]);
    const result = await instance.itemSources(4001, { region: 'sa', preferredLocale: 'pt' });
    expect(result.nodes[0]).toMatchObject({
      name: 'Mineração',
      territoryName: 'Balenos',
      managerNodeName: 'Fazenda Loggia',
      position: [1, 2, 3],
      products: ['urn::item:4001'],
      links: ['manager'],
    });
    expect(result.dataset.region).toBe('sa');
  });
  it('limits source lists and refuses malformed geographical coordinates', async () => {
    const { instance } = service(
      Array.from({ length: 51 }, (_, i) => ({
        id: String(i),
        name: 'Node',
        data: { position: [1, 'invalid', 3] },
      })),
    );
    const result = await instance.itemSources(4001, {});
    expect(result.nodes).toHaveLength(50);
    expect(result.truncated).toBe(true);
    expect(result.nodes[0].position).toBeNull();
  });
  it('rejects invalid item IDs before querying', async () => {
    const { instance, select } = service([]);
    await expect(instance.itemSources(-1, {})).rejects.toThrow('inválido');
    expect(select).not.toHaveBeenCalled();
  });
});
