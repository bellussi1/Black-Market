import { characterSchema } from '@bdo/calculators';
import type { ProductionCatalogResponse } from '@bdo/shared';
import { of, Subject, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { ProductionApi } from '../../core/production-api';
import { productionDemoItemIds } from '../../core/production-demo';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import {
  canRequestProductionQuote,
  productionQuantity,
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
    expect(page.calibration['ALCHEMY']).toEqual({ seconds: null, yield: null });
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
    expect(page.calibration['ALCHEMY'].yield).toBeNull();
  });
  it('keeps uncertain recipe quantities unknown', () => {
    expect(productionQuantity(null)).toBeNull();
    expect(productionQuantity('1-4')).toEqual({ min: 1, max: 4 });
    expect(productionQuantity('3')).toBe(3);
    expect(productionQuantity('0')).toBeNull();
    expect(productionQuantity('unknown')).toBeNull();
  });
  it('does not attach summary prices to gear variants or unknown categories', () => {
    const item = snapshot.items[0];
    expect(canRequestProductionQuote(item)).toBe(true);
    expect(canRequestProductionQuote({ ...item, category: 'Armor' })).toBe(false);
    expect(canRequestProductionQuote({ ...item, sourceData: { maxEnhance: 20 } })).toBe(false);
    expect(canRequestProductionQuote({ ...item, category: null })).toBe(false);
    expect(canRequestProductionQuote({ ...item, sourceData: { marketable: false } })).toBe(false);
  });
  it('requires alchemy calibration instead of assuming the catalog output is guaranteed', async () => {
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
    expect(page.plans()?.ranked).toHaveLength(0);
    expect(page.plans()?.incomplete[0].issues.some((issue) => issue.code === 'missing-yield')).toBe(
      true,
    );
    page.calibration['ALCHEMY'].yield = 2.5;
    await page.compare();
    expect(page.plans()?.ranked).toHaveLength(3);
    expect(page.plans()?.ranked[0].grossRevenue).toBe('7500');
    expect(page.plans()?.ranked[0].cashCost).toBe('600');
    expect(page.plans()?.ranked[0].netRevenue).toBe('4875');
    expect(page.plans()?.ranked[0].profit).toBe('4275');
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
    page.calibration['ALCHEMY'] = { seconds: 2, yield: 2.5 };
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
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: service },
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
    page.calibration['ALCHEMY'] = { seconds: 2, yield: 2.5 };
    const comparison = page.compare();
    expect(page.busy()).toBe(true);
    page.store.update((state) => ({ ...state, characters: [] }));
    await comparison;
    expect(page.plans()).toBeNull();
    expect(page.busy()).toBe(false);
    expect(page.message()).toContain('mudaram durante');
  });
});
