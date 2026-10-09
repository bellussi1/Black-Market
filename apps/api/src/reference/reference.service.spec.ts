import { describe, expect, it, vi } from 'vitest';

import type { CatalogService } from '../catalog/catalog.service';
import type { DatabaseService } from '../database/database.service';
import { ReferenceService } from './reference.service';
function service(rows: unknown[], spots: unknown[] = []) {
  const select = vi
    .fn()
    .mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(rows) }) }),
    })
    .mockReturnValueOnce({
      from: () => ({ where: () => ({ limit: () => Promise.resolve(spots) }) }),
    })
    .mockReturnValueOnce({
      from: () => ({
        where: () =>
          Promise.resolve([
            { id: 'territory', name: 'Balenos' },
            { id: 'manager', name: 'Fazenda Loggia', data: { territory: 'territory' } },
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
  it('does not turn a UI category into a region when the linked world node is unknown', async () => {
    const { instance } = service(
      [],
      [
        {
          id: 'spot',
          name: 'Spot',
          data: {
            mainCategory: { name: 'Categoria do menu' },
            sheetAP: -1,
            sheetDP: '100',
          },
        },
      ],
    );
    const result = await instance.itemSources(16001, {});
    expect(result.spots?.[0]).toMatchObject({
      territoryName: null,
      position: null,
      sheetAP: null,
      sheetDP: null,
    });
  });
  it('returns explicitly linked grind loot without assuming hunting, monster-specific drops or probabilities', async () => {
    const { instance } = service(
      [],
      [
        {
          id: 'urn::grindspot:3',
          name: 'Floresta Mansha',
          data: {
            mainCategory: { name: 'República de Calpheon' },
            node: { urn: 'manager', name: 'Floresta Mansha' },
            loot: { urns: ['urn::item:16001'] },
            ecology: [{ name: 'Guerreiro Mansha' }, { name: 'Guerreiro Mansha' }, { name: 'Ogro' }],
            sheetAP: 50,
            sheetDP: 100,
          },
        },
      ],
    );
    const result = await instance.itemSources(16001, { region: 'sa' });
    expect(result.nodes).toEqual([]);
    expect(result.spots?.[0]).toMatchObject({
      activity: 'grinding',
      name: 'Floresta Mansha',
      territoryName: 'Balenos',
      products: ['urn::item:16001'],
      monsters: ['Guerreiro Mansha', 'Ogro'],
      sheetAP: 50,
      sheetDP: 100,
      position: null,
    });
    expect(result.spots?.[0]).not.toHaveProperty('dropRate');
  });
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
    expect(result.dataset?.region).toBe('sa');
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
