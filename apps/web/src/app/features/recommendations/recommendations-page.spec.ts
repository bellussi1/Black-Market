import { characterSchema } from '@bdo/calculators';
import type { ProductionCatalogResponse } from '@bdo/shared';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { MarketCacheService } from '../../core/market-cache.service';
import { ProductionApi } from '../../core/production-api';
import { productionDemoItemIds } from '../../core/production-demo';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import {
  canRequestProductionQuote,
  hasNpcPurchaseEvidence,
  productionCraftSeconds,
  productionQuantity,
  recommendationMarketQuote,
  RecommendationsPage,
} from './recommendations-page';

const snapshot: ProductionCatalogResponse = {
  dataset: null,
  recipes: [
    {
      key: 'elixir',
      type: 'ALCHEMY',
      station: null,
      inputs: [{ itemId: 1, name: 'Material', quantity: '2' }],
      outputs: [{ itemId: 2, name: 'Elixir de teste', quantity: '1' }],
    },
  ],
  items: [1, 2].map((id) => ({
    id,
    name: id === 1 ? 'Material' : 'Elixir de teste',
    description: null,
    grade: null,
    category: 'Potion',
    icon: null,
    weight: '0.1',
    categories: [],
    sourceData: { marketable: true, maxEnhance: 0 },
  })),
};
const api = () => ({
  catalog: vi.fn(() => of(snapshot)),
  quotes: vi.fn(() => throwError(() => new Error('off'))),
});
describe('production recommendations', () => {
  useMemoryStorage();
  it('does not restore demo measurements if the global exit is clicked while the catalogue loads', async () => {
    const pending = new Subject<ProductionCatalogResponse>();
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: { catalog: () => pending, quotes: vi.fn() } },
      {
        provide: CatalogApiService,
        useValue: {
          getItems: () =>
            of({
              items: productionDemoItemIds.map((id) => ({
                ...snapshot.items[0],
                id,
                name: 'Item ' + id,
              })),
            }),
        },
      },
    ]);
    const page = fixture.componentInstance;
    const loading = page.startDemo();
    await Promise.resolve();
    await Promise.resolve();
    expect(page.store.demoActive()).toBe(true);
    expect(page.busy()).toBe(true);
    page.applyMockPrices();
    expect(page.quotes()).toEqual({});
    page.store.exitDemo();
    pending.next(snapshot);
    pending.complete();
    await loading;
    expect(page.store.demoActive()).toBe(false);
    expect(page.calibration['ALCHEMY']).toEqual({ seconds: null });
    expect(page.quotes()).toEqual({});
  });
  it('runs a complete Edania demo in all three scenarios and restores the original workspace', async () => {
    const items = productionDemoItemIds.map((id) => ({
      ...snapshot.items[0],
      id,
      name: 'Item ' + id,
    }));
    const data: ProductionCatalogResponse = {
      dataset: null,
      items,
      recipes: [
        {
          key: 'edania-elixir',
          type: 'ALCHEMY',
          station: null,
          inputs: [
            { itemId: 6354, name: 'Sangue do Pecador', quantity: '2.0000' },
            { itemId: 5960, name: 'Vestígio da Natureza', quantity: '4.0000' },
            { itemId: 5008, name: 'Casca de Árvore Velha', quantity: '5.0000' },
            { itemId: 5301, name: 'Reagente Líquido Limpo', quantity: '5.0000' },
            { itemId: 5025, name: 'Seiva de Caphras', quantity: '6.0000' },
          ],
          outputs: [{ itemId: 1409, name: 'Elixir de Edania', quantity: null }],
        },
      ],
    };
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: { ...api(), catalog: () => of(data) } },
      {
        provide: CatalogApiService,
        useValue: { getItems: () => of({ items }), resolveIconUrl: () => null },
      },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({ ...state, familySilver: '123456' }));
    const original = localStorage.getItem('black-market.workspace.v1');
    await page.startDemo();
    fixture.detectChanges();
    page.applyMockPrices();
    await page.compare();
    fixture.detectChanges();
    expect(new Set(page.plans()?.ranked.map((row) => row.scenario)).size).toBe(3);
    expect(page.plans()?.ranked.every((row) => BigInt(row.profitPerHour!) > 0n)).toBe(true);
    expect(localStorage.getItem('black-market.workspace.v1')).toBe(original);
    page.store.exitDemo();
    fixture.detectChanges();
    expect(page.store.data().familySilver).toBe('123456');
    expect(page.quotes()).toEqual({});
    expect(page.plans()).toBeNull();
    expect(page.calibration['ALCHEMY']).toEqual({ seconds: null });
  });
  it('keeps uncertain recipe quantities unknown', () => {
    expect(productionQuantity(null)).toBeNull();
    expect(productionQuantity('1-4')).toEqual({ min: 1, max: 4 });
    expect(productionQuantity('3')).toBe(3);
    expect(productionQuantity('0')).toBeNull();
    expect(productionQuantity('unknown')).toBeNull();
  });
  it('adjusts only cooking base time by the selected mastery mass-production rate', () => {
    const mastery = { cooking: 3000, alchemy: 0, processing: 0 };
    expect(productionCraftSeconds('COOK', 30, mastery)).toBe(3);
    expect(productionCraftSeconds('ALCHEMY', 30, mastery)).toBe(30);
    expect(productionCraftSeconds('PROCESSING', 30, mastery)).toBe(30);
  });
  it('uses each selected character mastery for life-skill yields and processing batches', async () => {
    const recipes: ProductionCatalogResponse['recipes'] = [
      ...snapshot.recipes,
      {
        key: 'cooking',
        type: 'COOK',
        station: null,
        inputs: [{ itemId: 1, name: 'Material', quantity: '1' }],
        outputs: [{ itemId: 2, name: 'Prato', quantity: '1' }],
      },
      {
        key: 'processing',
        type: 'PROCESSING',
        station: null,
        inputs: [{ itemId: 1, name: 'Material', quantity: '2' }],
        outputs: [{ itemId: 2, name: 'Material processado', quantity: '1' }],
      },
    ];
    const fixture = await renderComponent(RecommendationsPage, {}, [
      {
        provide: ProductionApi,
        useValue: { ...api(), catalog: () => of({ ...snapshot, recipes }) },
      },
    ]);
    const page = fixture.componentInstance;
    const profile = characterSchema.parse({
      id: 'mastered',
      name: 'Aventureiro',
      region: 'sa',
    });
    page.store.update((state) => ({
      ...state,
      characters: [
        {
          ...profile,
          mastery: { ...profile.mastery, cooking: 3000, alchemy: 3000, processing: 3000 },
        },
      ],
    }));
    page.selected.set(profile.id);
    await page.load();

    expect(page.recipes().find((row) => row.id === 'elixir')?.output.quantity).toBe(3.438);
    expect(page.recipes().find((row) => row.id === 'cooking')?.output.quantity).toBe(3.647);
    expect(page.recipes().find((row) => row.id === 'processing')).toMatchObject({
      output: { quantity: 787.5 },
      ingredients: [{ quantity: 630 }],
    });
  });
  it('does not attach summary prices to gear variants or unknown categories', () => {
    const item = snapshot.items[0];
    expect(canRequestProductionQuote(item)).toBe(true);
    expect(canRequestProductionQuote({ ...item, category: 'Armor' })).toBe(false);
    expect(canRequestProductionQuote({ ...item, sourceData: { maxEnhance: 20 } })).toBe(false);
    expect(canRequestProductionQuote({ ...item, category: null })).toBe(false);
    expect(canRequestProductionQuote({ ...item, sourceData: { marketable: false } })).toBe(false);
  });
  it('uses the market maximum only when the current quote has no stock', () => {
    const observedAt = '2026-10-13T12:00:00.000Z';
    const base = {
      itemId: 1,
      subId: 0,
      name: 'Material',
      price: '50',
      stock: 4,
      totalTrades: '1',
      minPrice: '40',
      maxPrice: '100',
      lastSoldPrice: '50',
      lastSoldAt: observedAt,
    };
    expect(recommendationMarketQuote({ ...base, stock: 0 }, observedAt)).toMatchObject({
      unitPrice: '100',
      available: 0,
      source: 'market',
      basis: 'maximum',
    });
    expect(recommendationMarketQuote(base, observedAt)).toMatchObject({
      unitPrice: '50',
      available: 4,
      basis: 'market',
    });
    expect(recommendationMarketQuote({ ...base, price: null, maxPrice: null }, observedAt)).toBe(
      null,
    );
    expect(recommendationMarketQuote(base, null)).toBe(null);
  });
  it('recognizes NPC prices from catalog vendor metadata without item-specific IDs', () => {
    expect(
      hasNpcPurchaseEvidence({
        sourceData: { buyPrice: 20, vendors: { urns: ['urn::npc:vendor'] } },
      }),
    ).toBe(true);
    expect(hasNpcPurchaseEvidence({ sourceData: { buyPrice: 20 } })).toBe(false);
    expect(
      hasNpcPurchaseEvidence({
        sourceData: { buyPrice: 0, vendors: { urns: ['urn::npc:vendor'] } },
      }),
    ).toBe(false);
  });
  it('loads NPC prices from the active dataset and uses them in production costs', async () => {
    const data: ProductionCatalogResponse = {
      ...snapshot,
      items: snapshot.items.map((item) =>
        item.id === 1
          ? { ...item, sourceData: { buyPrice: 20, vendors: { urns: ['urn::npc:vendor'] } } }
          : item,
      ),
      dataset: {
        version: 'dataset-v1',
        region: 'sa',
        locale: 'pt',
        checksum: null,
        itemCount: 2,
        recipeCount: 1,
        importedAt: '2026-10-13T12:00:00.000Z',
      },
    };
    const npcPrice = {
      itemId: 1,
      unitPrice: '20',
      vendor: 'Vendedor NPC listado no catálogo',
      verifiedAt: '2026-10-13T12:00:00.000Z',
    };
    const catalog = {
      getNpcPurchasePrices: vi.fn(() => of(new Map([[1, npcPrice]]))),
      resolveIconUrl: () => null,
    };
    const fixture = await renderComponent(RecommendationsPage, {}, [
      {
        provide: ProductionApi,
        useValue: { ...api(), catalog: () => of(data) },
      },
      { provide: CatalogApiService, useValue: catalog },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'npc-price',
          name: 'Aventureiro',
          region: 'sa',
          silver: '100000',
          activeMinutes: 60,
          weightLimit: 100,
        }),
      ],
    }));
    await page.load();
    page.manualPrice(2, '100');
    page.calibration['ALCHEMY'].seconds = 2;
    await page.compare();

    expect(catalog.getNpcPurchasePrices).toHaveBeenCalledWith([1], 'dataset-v1', 'sa');
    expect(page.quoteFor(1)).toMatchObject({ source: 'npc', unitPrice: '20' });
    expect(
      page.plans()?.ranked.some((plan) => plan.cashCost !== null && BigInt(plan.cashCost) > 0n),
    ).toBe(true);
  });
  it('reuses market-cache quotes, including a maximum, without blocking purchases on zero stock', async () => {
    const now = Date.now();
    const cachedQuotes = new Map([
      [
        1,
        {
          itemId: 1,
          subId: 0,
          name: 'Material',
          price: null,
          stock: 0,
          totalTrades: '0',
          minPrice: null,
          maxPrice: '90',
          lastSoldPrice: null,
          lastSoldAt: null,
        },
      ],
      [
        2,
        {
          itemId: 2,
          subId: 0,
          name: 'Elixir de teste',
          price: '100',
          stock: 2,
          totalTrades: '1',
          minPrice: '100',
          maxPrice: '100',
          lastSoldPrice: '100',
          lastSoldAt: null,
        },
      ],
    ]);
    const cache = {
      resolveProductionQuotes: vi.fn(() => of(cachedQuotes)),
      getCachedQuoteEntry: vi.fn((id: number) => ({ fetchedAt: now, quote: cachedQuotes.get(id) })),
    };
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
      { provide: MarketCacheService, useValue: cache },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'market-cache',
          name: 'Aventureiro',
          region: 'sa',
          silver: '100000',
          activeMinutes: 60,
          weightLimit: 100,
        }),
      ],
    }));
    await page.load();
    page.calibration['ALCHEMY'].seconds = 2;
    await page.refreshQuotes();
    await page.compare();

    expect(cache.resolveProductionQuotes).toHaveBeenCalledWith([1, 2], 'sa');
    expect(page.quotes()[1]).toMatchObject({
      unitPrice: '90',
      available: 0,
      source: 'market',
      basis: 'maximum',
    });
    expect(
      page
        .plans()
        ?.incomplete.some((plan) => plan.issues.some((issue) => issue.code === 'market-stock')),
    ).toBe(false);
  });
  it('uses mastery-derived alchemy yield without requiring a manual yield calibration', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'person',
          name: 'Aventureiro',
          region: 'sa',
          silver: '100000',
          activeMinutes: 1,
          weightLimit: 100,
        }),
      ],
    }));
    await page.load();
    page.manualPrice(1, '10');
    page.manualPrice(2, '100');
    page.calibration['ALCHEMY'].seconds = 2;
    await page.compare();
    expect(page.recipes()[0].output.quantity).toBe(2.5);
    expect(page.plans()?.ranked).toHaveLength(3);
    expect(
      page
        .plans()
        ?.incomplete.some((plan) => plan.issues.some((issue) => issue.code === 'missing-yield')),
    ).toBe(false);
    expect(page.plans()?.ranked[0].grossRevenue).toBe('7500');
    expect(page.plans()?.ranked[0].cashCost).toBe('600');
    expect(page.plans()?.ranked[0].netRevenue).toBe('4875');
    expect(page.plans()?.ranked[0].profit).toBe('4275');
  });
  it('adds an automatic combination for the selected recipe and requested operation count', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'person',
          name: 'Aventureiro',
          region: 'sa',
          silver: '100000',
          activeMinutes: 60,
          weightLimit: 100,
        }),
      ],
    }));
    await page.load();
    page.manualPrice(1, '10');
    page.manualPrice(2, '100');
    page.calibration['ALCHEMY'] = { seconds: 2 };
    page.focusRecipe('elixir');
    page.optimizationCrafts = 3;

    await page.compare();

    expect(page.plans()?.ranked.find((row) => row.scenario === 'optimized')).toMatchObject({
      recipeId: 'elixir',
      scenario: 'optimized',
      crafts: 3,
    });
    expect(page.scenarioNames.optimized).toBe('Combinação automática');

    page.focusRecipe(null);

    expect(page.plans()).toBeNull();
  });
  it('discards an asynchronous optimized result when the focused recipe changes', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'person',
          name: 'Aventureiro',
          region: 'sa',
          silver: '100000',
          activeMinutes: 60,
          weightLimit: 100,
        }),
      ],
    }));
    await page.load();
    page.manualPrice(1, '10');
    page.manualPrice(2, '100');
    page.calibration['ALCHEMY'] = { seconds: 2 };
    page.focusRecipe('elixir');
    const comparison = page.compare();

    page.focusRecipe(null);
    await comparison;

    expect(page.plans()).toBeNull();
    expect(page.message()).toContain('mudaram durante');
  });
  it('keeps the focused automatic pending result visible after the pending-list limit', async () => {
    const recipes = Array.from({ length: 40 }, (_, index) => ({
      key: `formula-${index}`,
      type: 'ALCHEMY',
      station: null,
      inputs: [{ itemId: 1, name: 'Material', quantity: '1' }],
      outputs: [{ itemId: index + 2, name: `Elixir ${index}`, quantity: '1' }],
    }));
    const data: ProductionCatalogResponse = {
      dataset: null,
      recipes,
      items: [1, ...recipes.map((recipe) => recipe.outputs[0].itemId)].map((id) => ({
        id,
        name: `Item ${id}`,
        description: null,
        grade: null,
        category: 'Potion',
        icon: null,
        weight: '0.1',
        categories: [],
        sourceData: { marketable: true, maxEnhance: 0 },
      })),
    };
    const fixture = await renderComponent(RecommendationsPage, {}, [
      {
        provide: ProductionApi,
        useValue: { ...api(), catalog: () => of(data) },
      },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'person',
          name: 'Aventureiro',
          region: 'sa',
          silver: '100000',
          activeMinutes: 60,
          weightLimit: 100,
        }),
      ],
    }));
    await page.load();
    page.focusRecipe('formula-39');
    await page.compare();
    fixture.detectChanges();

    expect(page.plans()?.incomplete).toHaveLength(121);
    expect(page.visibleIncomplete()).toHaveLength(30);
    expect(page.visibleIncomplete().at(-1)).toMatchObject({
      recipeId: 'formula-39',
      scenario: 'optimized',
    });
  });
  it('uses only stock remaining after reservations and counts its economic cost', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'person',
          name: 'Aventureiro',
          region: 'sa',
          silver: '100000',
          activeMinutes: 1,
          weightLimit: 100,
        }),
      ],
      inventory: [
        {
          id: 'stock',
          name: 'Material',
          region: 'sa',
          itemId: 1,
          quantity: 80,
          location: 'Heidel',
          price: '0',
          target: 0,
        },
      ],
      personalPlans: [
        {
          id: 'reserved',
          name: 'Reserved',
          region: 'sa',
          createdAt: new Date().toISOString(),
          status: 'reserved',
          materials: [{ itemId: 1, name: 'Material', quantity: 30 }],
          minutes: 1,
          estimatedProfit: null,
          tasks: [],
        },
      ],
    }));
    await page.load();
    page.manualPrice(1, '10');
    page.manualPrice(2, '100');
    page.calibration['ALCHEMY'] = { seconds: 2 };
    page.choose(1, 'stock');
    await page.compare();
    const custom = page.plans()?.ranked.find((row) => row.scenario === 'custom');
    // 24 crafts beat 25 after integer silver rounding; the optimizer ranks profit/hour.
    expect(custom?.crafts).toBe(24);
    expect(custom?.cashCost).toBe('0');
    expect(custom?.economicCost).toBe('480');
    expect(custom?.materials[0].owned).toBe(48);
    expect(page.store.data().inventory[0].quantity).toBe(80);
  });
  it('pauses failed market queries and retains clearly manual prices without fabricated freshness', async () => {
    const service = api();
    const cache = { resolveProductionQuotes: () => throwError(() => new Error('off')) };
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: service },
      { provide: MarketCacheService, useValue: cache },
    ]);
    const page = fixture.componentInstance;
    await page.load();
    page.manualPrice(1, '99');
    await page.refreshQuotes();
    expect(page.resumable).toBe(true);
    expect(page.progress()).toEqual({ done: 0, total: 2 });
    expect(page.quotes()[1].source).toBe('manual');
    expect(page.message()).toContain('pausada');
    page.applyMockPrices();
    expect(page.quotes()[1407]).toBeUndefined();
  });
  it('discards an asynchronous comparison when its workspace changes', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'person',
          name: 'Aventureiro',
          region: 'sa',
          silver: '100000',
          activeMinutes: 1,
          weightLimit: 100,
        }),
      ],
    }));
    await page.load();
    page.manualPrice(1, '10');
    page.manualPrice(2, '100');
    page.calibration['ALCHEMY'] = { seconds: 2 };
    const comparison = page.compare();
    expect(page.busy()).toBe(true);
    page.store.update((state) => ({ ...state, characters: [] }));
    await comparison;
    expect(page.plans()).toBeNull();
    expect(page.busy()).toBe(false);
    expect(page.message()).toContain('mudaram durante');
  });
});
