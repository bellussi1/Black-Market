import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../database/database.service';
import { CatalogService } from './catalog.service';
import type { CatalogAssetsService } from './catalog-assets.service';

function query(rows: unknown[]) {
  const chain = {
    from: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    innerJoin: vi.fn(),
    limit: vi.fn(),
    offset: vi.fn(),
    then: (resolve: (value: unknown[]) => unknown, reject: (error: unknown) => unknown) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  for (const method of [
    chain.from,
    chain.where,
    chain.orderBy,
    chain.innerJoin,
    chain.limit,
    chain.offset,
  ])
    method.mockReturnValue(chain);
  return chain;
}
function service(keys: string[]) {
  const related = query(keys.map((key) => ({ key })));
  const db = {
    select: vi
      .fn()
      .mockReturnValueOnce(query([{ itemId: 5301 }]))
      .mockReturnValueOnce(query([{ total: 205 }]))
      .mockReturnValueOnce(
        query(
          keys.map((key) => ({ key, type: 'ALCHEMY', station: null, byproductOfItemId: null })),
        ),
      )
      .mockReturnValueOnce(query([]))
      .mockReturnValueOnce(query([])),
    selectDistinct: vi.fn(() => related),
  };
  const instance = new CatalogService(
    { db } as unknown as DatabaseService,
    {} as CatalogAssetsService,
  );
  vi.spyOn(instance, 'getActiveDataset').mockResolvedValue({
    id: 'dataset',
    version: 'same',
    region: 'sa',
    locale: 'pt',
    checksum: null,
    recipeCount: 205,
    itemCount: 1,
    finishedAt: new Date(),
  } as never);
  return { instance, db, related };
}
describe('Paginated item recipes', () => {
  it('serves the requested page of distinct relationships beyond the former 50-recipe cap', async () => {
    const keys = Array.from({ length: 100 }, (_, i) => String(100 + i));
    const { instance, related } = service(keys);
    const result = await instance.getItemRecipes(5301, { page: 2, pageSize: 100 }, 'uses');
    expect(result.recipes.map((r) => r.key)).toEqual(keys);
    expect(result).toMatchObject({ page: 2, pageSize: 100, total: 205 });
    expect(related.limit).toHaveBeenCalledWith(100);
    expect(related.offset).toHaveBeenCalledWith(100);
  });
  it('retains total counts on empty pages and validates pagination before accessing the database', async () => {
    const { instance, db } = service([]);
    expect(await instance.getItemRecipes(5301, { page: 4, pageSize: 100 }, 'uses')).toMatchObject({
      recipes: [],
      total: 205,
      page: 4,
    });
    db.select.mockClear();
    await expect(instance.getItemRecipes(5301, { pageSize: 101 }, 'uses')).rejects.toThrow();
    expect(db.select).not.toHaveBeenCalled();
  });
});
