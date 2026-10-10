import type { SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

import type { DatabaseService } from '../database/database.service';
import { CatalogService } from './catalog.service';
import type { CatalogAssetsService } from './catalog-assets.service';
import { parseCatalogQuery } from './catalog-query';

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

describe('Life skill discovery', () => {
  function discovery(items = false) {
    const countQuery = query([{ total: 0 }]);
    const rowsQuery = query([]);
    const select = vi.fn();
    if (items) select.mockReturnValueOnce(query([]));
    select.mockReturnValueOnce(countQuery).mockReturnValueOnce(rowsQuery);
    const instance = new CatalogService(
      { db: { select } } as unknown as DatabaseService,
      {} as CatalogAssetsService,
    );
    vi.spyOn(instance, 'getActiveDataset').mockResolvedValue({
      id: 'dataset',
      version: 'same',
      region: 'sa',
      locale: 'pt',
      checksum: null,
      finishedAt: new Date(),
    } as never);
    return { instance, countQuery, rowsQuery };
  }
  const sqlQuery = (value: unknown) => new PgDialect().sqlToQuery(value as SQL);

  it('filters recipe counts and pages to life skill types before applying pagination', async () => {
    const { instance, countQuery, rowsQuery } = discovery();
    await instance.listRecipes({ page: 2, pageSize: 24 });
    for (const statement of [countQuery, rowsQuery]) {
      const compiled = sqlQuery(statement.where.mock.calls[0][0]);
      expect(compiled.sql).toContain('"recipes"."recipe_type" in');
      expect(compiled.params).toContain('COOK');
      expect(compiled.params).toContain('ALCHEMY');
      expect(compiled.params).toContain('HEAT');
      expect(compiled.params).not.toContain('SKILL');
      expect(compiled.params).not.toContain('HOUSE');
    }
    expect(rowsQuery.offset).toHaveBeenCalledWith(24);
    expect(sqlQuery(rowsQuery.orderBy.mock.calls[0][0]).params.slice(0, 2)).toEqual([
      'COOK',
      'SIMPLE_COOK',
    ]);
  });

  it('restricts a method group on both the count and result query', async () => {
    const { instance, countQuery, rowsQuery } = discovery();
    await instance.listRecipes({ recipeGroup: 'cooking', q: 'cerveja' });
    for (const statement of [countQuery, rowsQuery]) {
      const compiled = sqlQuery(statement.where.mock.calls[0][0]);
      expect(compiled.params).toContain('COOK');
      expect(compiled.params).toContain('SIMPLE_COOK');
      expect(compiled.params).not.toContain('ALCHEMY');
      expect(compiled.params).toContain('%cerveja%');
    }
  });

  it('limits only opted-in item discovery to ingredients and products of life skill recipes', async () => {
    const scoped = discovery(true);
    await scoped.instance.listItems({ scope: 'life-skill', q: 'carne' });
    for (const statement of [scoped.countQuery, scoped.rowsQuery]) {
      const compiled = sqlQuery(statement.where.mock.calls[0][0]);
      expect(compiled.sql).toContain('"recipe_ingredients"');
      expect(compiled.sql).toMatch(/"items"\."id" in\s*\(\s*select/);
      expect(compiled.sql).toContain('"recipe_outputs"');
      expect(compiled.params).toContain('COOK');
      expect(compiled.params).not.toContain('SKILL');
    }
    const general = discovery(true);
    await general.instance.listItems({ q: 'carne' });
    expect(sqlQuery(general.rowsQuery.where.mock.calls[0][0]).sql).not.toContain('"recipes"');
  });

  it('rejects unknown discovery scopes and groups before querying', () => {
    expect(() => parseCatalogQuery({ scope: 'skills' })).toThrow();
    expect(() => parseCatalogQuery({ recipeGroup: 'SKILL' })).toThrow();
  });
  it('restricts opted-in categories to the same ingredient and product membership as item discovery', async () => {
    const scoped = discovery();
    await scoped.instance.listCategories({ scope: 'life-skill' });
    const compiled = sqlQuery(scoped.countQuery.where.mock.calls[0][0]);
    expect(compiled.sql).toContain('"item_categories"."category_id"');
    expect(compiled.sql).toContain('"recipe_ingredients"');
    expect(compiled.sql).toContain('"recipe_outputs"');
    expect(compiled.params).toContain('COOK');
    expect(compiled.params).not.toContain('SKILL');
    const general = discovery();
    await general.instance.listCategories({});
    expect(sqlQuery(general.countQuery.where.mock.calls[0][0]).sql).not.toContain('"recipes"');
  });
});
