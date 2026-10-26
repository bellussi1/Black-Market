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
  it('does not present random byproducts as directly crafted item recipes', async () => {
    const itemVersion = query([
      {
        itemId: 9711,
        description: 'Um subproduto da culinária. Recebido aleatoriamente após Cozinhar.',
      },
    ]);
    const db = { select: vi.fn(() => itemVersion) };
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
      finishedAt: new Date(),
    } as never);

    const result = await instance.getItemRecipes(9711, { region: 'sa', locale: 'pt' }, 'produces');

    expect(result).toMatchObject({ recipes: [], total: 0, direction: 'produces' });
    expect(db.select).toHaveBeenCalledOnce();
  });

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

describe('Batched production producer lookup', () => {
  it('returns all life-skill producers of up to 100 primary product IDs in one dataset', async () => {
    const recipeRows = query([
      { key: 'producer-a', type: 'ALCHEMY', station: null, byproductOfItemId: null },
    ]);
    const inputRows = query([
      { recipeKey: 'producer-a', itemId: 10, name: 'Material', quantity: '2.0000' },
    ]);
    const outputRows = query([
      { recipeKey: 'producer-a', itemId: 1, name: 'Produto', quantity: '1.0000' },
    ]);
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(recipeRows)
        .mockReturnValueOnce(inputRows)
        .mockReturnValueOnce(outputRows),
    };
    const instance = new CatalogService(
      { db } as unknown as DatabaseService,
      { getIconUrl: vi.fn(() => null) } as unknown as CatalogAssetsService,
    );
    vi.spyOn(instance, 'getActiveDataset').mockResolvedValue({
      id: 'dataset',
      version: 'same',
      region: 'sa',
      locale: 'pt',
      checksum: null,
      finishedAt: new Date('2026-10-24T00:00:00Z'),
    } as never);

    const result = await instance.productionProducers({ ids: '1,2', region: 'sa' });

    expect(result).toMatchObject({
      direction: 'produces',
      total: 1,
      dataset: { version: 'same' },
      recipes: [
        {
          key: 'producer-a',
          inputs: [{ itemId: 10, quantity: '2.0000' }],
          outputs: [{ itemId: 1, quantity: '1.0000' }],
        },
      ],
    });
    const compiled = new PgDialect().sqlToQuery(recipeRows.where.mock.calls[0][0] as SQL);
    expect(compiled.params).toContain('dataset');
    expect(compiled.params).toContain(1);
    expect(compiled.params).toContain(2);
  });

  it('requires a bounded list of product IDs before querying the database', async () => {
    const db = { select: vi.fn() };
    const instance = new CatalogService(
      { db } as unknown as DatabaseService,
      {} as CatalogAssetsService,
    );

    await expect(instance.productionProducers({ region: 'sa' })).rejects.toThrow();
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe('Alchemy byproduct recipe lookup', () => {
  it('returns recipes attached to base outputs in one dataset-bound query', async () => {
    const recipeRows = query([
      { key: 'special-elixir', type: 'ALCHEMY', station: null, byproductOfItemId: 749 },
    ]);
    const inputRows = query([
      { recipeKey: 'special-elixir', itemId: 6355, name: 'Sangue', quantity: '1.0000' },
    ]);
    const outputRows = query([
      { recipeKey: 'special-elixir', itemId: 750, name: 'Elixir especial', quantity: null },
    ]);
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(recipeRows)
        .mockReturnValueOnce(inputRows)
        .mockReturnValueOnce(outputRows),
    };
    const assets = { getIconUrl: vi.fn(() => null) };
    const instance = new CatalogService(
      { db } as unknown as DatabaseService,
      assets as unknown as CatalogAssetsService,
    );
    vi.spyOn(instance, 'getActiveDataset').mockResolvedValue({
      id: 'dataset',
      version: 'same',
      region: 'sa',
      locale: 'pt',
      checksum: null,
      finishedAt: new Date(),
    } as never);

    const result = await instance.getByproductRecipes({
      ids: '749,690',
      region: 'sa',
      preferredLocale: 'pt',
    });

    expect(recipeRows.where).toHaveBeenCalledOnce();
    const compiled = new PgDialect().sqlToQuery(recipeRows.where.mock.calls[0][0] as SQL);
    expect(compiled.params).toContain('dataset');
    expect(compiled.params).toContain(749);
    expect(compiled.params).toContain(690);
    expect(result).toMatchObject({
      direction: 'byproducts',
      total: 1,
      recipes: [
        {
          key: 'special-elixir',
          byproductOfItemId: 749,
          inputs: [{ itemId: 6355, name: 'Sangue', quantity: '1.0000' }],
          outputs: [{ itemId: 750, name: 'Elixir especial', quantity: null }],
        },
      ],
    });
  });

  it('requires a bounded list of base item IDs', async () => {
    const db = { select: vi.fn() };
    const instance = new CatalogService(
      { db } as unknown as DatabaseService,
      {} as CatalogAssetsService,
    );
    await expect(instance.getByproductRecipes({ region: 'sa' })).rejects.toThrow();
    expect(db.select).not.toHaveBeenCalled();
  });
});

describe('NPC purchase price lookup', () => {
  it('returns only catalog entries with both a positive buy price and listed vendors', async () => {
    const rowsQuery = query([
      { itemId: 4986, sourceData: { buyPrice: 10000, vendors: { urns: ['urn::npc:43513'] } } },
      { itemId: 7313, sourceData: { buyPrice: 1000, vendors: { urns: ['urn::npc:47045'] } } },
      { itemId: 8211, sourceData: { buyPrice: 0, vendors: { urns: ['urn::npc:1'] } } },
      { itemId: 9403, sourceData: { buyPrice: 1000 } },
    ]);
    const instance = new CatalogService(
      { db: { select: vi.fn(() => rowsQuery) } } as unknown as DatabaseService,
      {} as CatalogAssetsService,
    );
    vi.spyOn(instance, 'getActiveDataset').mockResolvedValue({
      id: 'dataset',
      version: 'same',
      region: 'sa',
      locale: 'pt',
      checksum: null,
      recipeCount: 1,
      itemCount: 4,
      finishedAt: new Date('2026-10-10T12:22:17.854Z'),
    } as never);

    const result = await instance.npcPurchasePrices({
      ids: '4986,7313,8211,9403',
      region: 'sa',
      preferredLocale: 'pt',
    });

    expect(result.prices.map(({ itemId, unitPrice }) => [itemId, unitPrice])).toEqual([
      [4986, '10000'],
      [7313, '1000'],
    ]);
    expect(result.dataset?.version).toBe('same');
  });
});

describe('recipe market equivalents', () => {
  it('returns only marketable dried fish linked by the active dataset DRY recipe', async () => {
    const sourceRows = query([
      { id: 8211, category: 'Fish', sourceData: { forTrade: true } },
      { id: 9001, category: 'Etc', sourceData: { forTrade: true } },
    ]);
    const dryRows = query([
      {
        type: 'DRY',
        recipeKey: 'squid-dry',
        sourceItemId: 8211,
        inputPosition: 0,
        inputQuantity: '1.0000',
        itemId: 8511,
        outputPosition: 0,
        outputQuantity: null,
      },
      {
        type: 'DRY',
        recipeKey: 'not-fish-dry',
        sourceItemId: 9001,
        inputPosition: 0,
        inputQuantity: '1.0000',
        itemId: 9901,
        outputPosition: 0,
        outputQuantity: null,
      },
    ]);
    const outputRows = query([
      {
        id: 8511,
        name: 'Calamar Desidratado',
        category: 'Fish',
        sourceData: { marketable: true },
      },
      {
        id: 9901,
        name: 'Material Desidratado',
        category: 'Fish',
        sourceData: { marketable: true },
      },
    ]);
    const db = {
      select: vi
        .fn()
        .mockReturnValueOnce(sourceRows)
        .mockReturnValueOnce(dryRows)
        .mockReturnValueOnce(outputRows),
    };
    const assets = { getIconUrl: vi.fn((id: number) => Promise.resolve(`/items/${id}.webp`)) };
    const instance = new CatalogService(
      { db } as unknown as DatabaseService,
      assets as unknown as CatalogAssetsService,
    );
    vi.spyOn(instance, 'getActiveDataset').mockResolvedValue({
      id: 'dataset',
      version: 'same',
      region: 'sa',
      locale: 'pt',
      checksum: 'checksum',
      finishedAt: new Date('2026-10-13T12:00:00.000Z'),
    } as never);

    const response = await instance.recipeMarketEquivalents({
      ids: '8211,9001',
      region: 'sa',
      preferredLocale: 'pt',
    });

    expect(response.equivalents).toEqual([
      {
        sourceItemId: 8211,
        itemId: 8511,
        name: 'Calamar Desidratado',
        iconUrl: '/items/8511.webp',
        quantityRatio: 1,
      },
    ]);
    expect(new PgDialect().sqlToQuery(dryRows.where.mock.calls[0][0] as SQL).params).toContain(
      'DRY',
    );
  });

  it('requires item IDs before querying the active dataset', async () => {
    const instance = new CatalogService(
      { db: { select: vi.fn() } } as unknown as DatabaseService,
      {} as CatalogAssetsService,
    );
    const getDataset = vi.spyOn(instance, 'getActiveDataset');

    await expect(instance.recipeMarketEquivalents({ region: 'sa' })).rejects.toThrow();
    expect(getDataset).not.toHaveBeenCalled();
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

  it('omits random byproducts from the recipe index and its page count', async () => {
    const { instance, countQuery, rowsQuery } = discovery();
    await instance.listRecipes({ recipeGroup: 'cooking', page: 4, pageSize: 25 });
    for (const statement of [countQuery, rowsQuery]) {
      const compiled = sqlQuery(statement.where.mock.calls[0][0]);
      expect(compiled.sql).toContain('"recipes"."byproduct_of_item_id" is null');
      expect(compiled.params).toContain('%subproduto%');
      expect(compiled.params).toContain('%byproduct%');
      expect(compiled.params).toContain('%aleatoriamente%');
      expect(compiled.params).toContain('%randomly%');
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

describe('Production catalogue snapshot', () => {
  it('returns all eligible recipes and unique item details bound to the selected version, retaining unknown yields and byproducts', async () => {
    const statements = [
      query([
        { key: 'main', type: 'ALCHEMY', station: null, byproductOfItemId: null },
        { key: 'proc', type: 'ALCHEMY', station: null, byproductOfItemId: 202 },
        { key: 'random-byproduct', type: 'COOK', station: null, byproductOfItemId: null },
      ]),
      query([
        { recipeKey: 'main', itemId: 101, quantity: '3.0000' },
        { recipeKey: 'proc', itemId: 101, quantity: '3.0000' },
      ]),
      query([
        { recipeKey: 'main', itemId: 202, quantity: null },
        { recipeKey: 'proc', itemId: 203, quantity: null },
        { recipeKey: 'random-byproduct', itemId: 204, quantity: null },
      ]),
      query([
        { id: 101, name: 'Ore', weight: '0.1000', sourceData: { vendors: ['Vendor'] } },
        { id: 202, name: 'Ingot', weight: '1.0000', sourceData: {} },
        { id: 203, name: 'Rare ingot', weight: '1.0000', sourceData: {} },
        {
          id: 204,
          name: 'Comida Retirada',
          description: 'Um subproduto da culinária. Recebido aleatoriamente após Cozinhar.',
          weight: '0.0100',
          sourceData: {},
        },
      ]),
      query([{ itemId: 101, id: 'ore', parentId: null, sortOrder: 1, name: 'Ore category' }]),
    ];
    const select = vi.fn();
    for (const statement of statements) select.mockReturnValueOnce(statement);
    const instance = new CatalogService(
      { db: { select } } as unknown as DatabaseService,
      {
        getIconUrl: (id: number) => Promise.resolve(`/icons/${id}`),
      } as unknown as CatalogAssetsService,
    );
    const active = vi.spyOn(instance, 'getActiveDataset').mockResolvedValue({
      id: 'snapshot',
      version: 'reviewed',
      region: 'sa',
      locale: 'pt',
      checksum: 'checksum',
      itemCount: 74287,
      recipeCount: 4420,
      finishedAt: new Date('2026-10-09T00:00:00Z'),
    } as never);
    const result = await instance.productionCatalog({ region: 'sa', locale: 'pt' });
    expect(active).toHaveBeenCalledOnce();
    expect(result.dataset?.version).toBe('reviewed');
    expect(result.recipes).toHaveLength(2);
    expect(result.recipes.map((recipe) => recipe.key)).not.toContain('random-byproduct');
    expect(result.recipes[0]).toMatchObject({
      key: 'main',
      inputs: [{ itemId: 101, name: 'Ore', quantity: '3.0000' }],
      outputs: [{ itemId: 202, name: 'Ingot', quantity: null }],
    });
    expect(result.recipes[1].byproductOfItemId).toBe(202);
    expect(result.items.map((item) => item.id)).toEqual([101, 202, 203, 204]);
    expect(result.items[0]).toMatchObject({
      weight: '0.1000',
      sourceData: { vendors: ['Vendor'] },
      categories: [{ id: 'ore' }],
    });
    const dialect = new PgDialect();
    for (const statement of statements) {
      expect(dialect.sqlToQuery(statement.where.mock.calls[0][0] as SQL).params).toContain(
        'snapshot',
      );
      expect(statement.limit).not.toHaveBeenCalled();
      expect(statement.offset).not.toHaveBeenCalled();
    }
    const recipeFilter = dialect.sqlToQuery(statements[0].where.mock.calls[0][0] as SQL).params;
    expect(recipeFilter).toContain('SIMPLE_ALCHEMY');
    expect(recipeFilter).not.toContain('HOUSE');
    expect(recipeFilter).not.toContain('SKILL');
  });

  it('returns an empty snapshot when the requested region has no active data', async () => {
    const instance = new CatalogService({} as DatabaseService, {} as CatalogAssetsService);
    vi.spyOn(instance, 'getActiveDataset').mockResolvedValue(null);
    expect(await instance.productionCatalog({ region: 'sa' })).toEqual({
      recipes: [],
      items: [],
      dataset: null,
    });
  });
});
