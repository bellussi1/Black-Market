import type {
  CatalogItemDetail,
  CatalogRecipe,
  CatalogRecipesResponse,
  MarketItemQuote,
} from '@bdo/shared';
import { signal } from '@angular/core';
import { characterSchema } from '@bdo/calculators';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MarketApi } from '../../features/market/market-api';
import { CatalogApiService } from '../../core/catalog-api.service';
import { MarketCacheService, type CachedQuoteEntry } from '../../core/market-cache.service';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { type ItemSources, RecipeKnowledge } from './recipe-knowledge';
import type { RecipeProductionGraph } from './recipe-production-graph';
import { RecipeTree } from './recipe-tree';
const item = {
  id: 5301,
  name: 'Reagente Líquido Limpo',
  description: 'Produzido por Alquimia.',
  iconUrl: null,
  categories: [],
  sourceData: {},
} as unknown as CatalogItemDetail;
const recipe: CatalogRecipe = {
  key: 'clear-reagent',
  type: 'ALCHEMY',
  station: null,
  inputs: [{ itemId: 9001, name: 'Sal', quantity: '2' }],
  outputs: [{ itemId: 5301, name: item.name, quantity: null }],
};
function providers() {
  const knowledge = {
    useVersion: vi.fn(),
    item: vi.fn(() => of({ item })),
    produces: vi.fn(() => of({ recipes: [recipe] })),
    uses: vi.fn(() => of({ recipes: [] })),
    sources: vi.fn(() => of<ItemSources>({ nodes: [], updatedAt: null })),
  };
  const market = {
    getItem: vi.fn((_itemId?: string, _region?: string) =>
      of({
        source: 'arsha',
        region: 'sa',
        fetchedAt: '2026-10-09T12:00:00Z',
        cacheStatus: 'cached',
        items: [{ itemId: 5301, subId: 0, price: '100', stock: 1 }],
      }),
    ),
    history: vi.fn(() => of({ points: [] })),
  };
  const catalog = {
    resolveIconUrl: vi.fn(() => null),
    getItemRecipes: vi.fn((_itemId: number, _direction: 'produces' | 'uses') =>
      of({ recipes: [], total: 0, direction: 'produces', dataset: null } as CatalogRecipesResponse),
    ),
  };
  const quotesMap = signal(new Map<string, CachedQuoteEntry>());
  const marketCache = {
    quotesMap,
    resolveQuotesBatch: vi.fn((_itemIds: (number | string)[], _region?: string) =>
      of(new Map<number, MarketItemQuote>()),
    ),
    getCachedQuoteEntry: vi.fn(
      (itemId: number, region = 'sa'): CachedQuoteEntry | null =>
        quotesMap().get(`${region}:${itemId}:0`) ?? null,
    ),
  };
  return {
    knowledge,
    market,
    catalog,
    marketCache,
    list: [
      { provide: RecipeKnowledge, useValue: knowledge },
      { provide: MarketApi, useValue: market },
      { provide: CatalogApiService, useValue: catalog },
      { provide: MarketCacheService, useValue: marketCache },
    ],
  };
}

function configureProduction(tree: RecipeTree, prices: Record<number, string>) {
  const rootRecipe = tree.root()!.recipe!;
  const itemIds = [
    ...new Set([
      ...rootRecipe.outputs.map((part) => part.itemId),
      ...rootRecipe.inputs.map((part) => part.itemId),
    ]),
  ].sort((left, right) => left - right);
  const observedAt = new Date().toISOString();
  tree.recipeGraph.set({
    rootRecipe,
    producerRecipes: [],
    itemIds,
    issues: [],
    datasetVersion: 'dataset-v1',
  });
  const quotes = new Map<number, MarketItemQuote>();
  for (const [id, price] of Object.entries(prices))
    quotes.set(Number(id), {
      itemId: Number(id),
      subId: 0,
      name: Number(id) === 5301 ? item.name : 'Sal',
      price,
      stock: 1_000_000,
      totalTrades: '10000',
      minPrice: price,
      maxPrice: price,
      lastSoldPrice: price,
      lastSoldAt: observedAt,
    });
  tree.marketQuotes.set(quotes);
  tree.quoteObservedAt.set(new Map(itemIds.map((id) => [id, observedAt])));
  tree.livePrices.set(new Map(Object.entries(prices).map(([id, price]) => [Number(id), price])));
  tree.store.update((workspace) => ({ ...workspace, familySilver: '1000000000000' }));
}

describe('Interactive recipe tree', () => {
  useMemoryStorage();
  it('loads quotes for every item reachable from the active recipe', async () => {
    const mocks = providers();
    const salt: CatalogRecipe = {
      key: 'salt',
      type: 'PROCESSING',
      station: null,
      inputs: [{ itemId: 8001, name: 'Pedra', quantity: '2' }],
      outputs: [{ itemId: 9001, name: 'Sal', quantity: '1' }],
    };
    mocks.catalog.getItemRecipes.mockImplementation((itemId) =>
      of({
        recipes: itemId === 9001 ? [salt] : [],
        total: itemId === 9001 ? 1 : 0,
        direction: 'produces',
        dataset: null,
      } as CatalogRecipesResponse),
    );
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(mocks.catalog.getItemRecipes).toHaveBeenCalledWith(9001, 'produces');
    expect(mocks.catalog.getItemRecipes).toHaveBeenCalledWith(8001, 'produces');
    expect(mocks.marketCache.resolveQuotesBatch).toHaveBeenCalledWith([5301, 8001, 9001], 'sa');
  });

  it('refreshes the active recipe quotes after five minutes and stops after destroy', async () => {
    const mocks = providers();
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    vi.useFakeTimers();

    tree.consultAllTreePrices();
    expect(mocks.marketCache.resolveQuotesBatch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(mocks.marketCache.resolveQuotesBatch).toHaveBeenCalledTimes(2);

    fixture.destroy();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(mocks.marketCache.resolveQuotesBatch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('ignores a quote response from a recipe that is no longer selected', async () => {
    const mocks = providers();
    const oldResponse = new Subject<Map<number, MarketItemQuote>>();
    const newQuote: MarketItemQuote = {
      itemId: 6001,
      subId: 0,
      name: 'Produto novo',
      price: '200',
      stock: 5,
      totalTrades: '10',
      minPrice: '190',
      maxPrice: '210',
      lastSoldPrice: '200',
      lastSoldAt: null,
    };
    mocks.marketCache.resolveQuotesBatch
      .mockReturnValueOnce(oldResponse)
      .mockReturnValueOnce(of(new Map([[6001, newQuote]])));
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;

    tree.consultAllTreePrices();
    fixture.componentRef.setInput('recipe', {
      ...recipe,
      key: 'new-recipe',
      outputs: [{ itemId: 6001, name: 'Produto novo', quantity: '1' }],
      inputs: [{ itemId: 8002, name: 'Ingrediente novo', quantity: '1' }],
    });
    fixture.componentRef.setInput('selectedItem', { ...item, id: 6001, name: 'Produto novo' });
    fixture.detectChanges();
    await fixture.whenStable();
    tree.consultAllTreePrices();

    oldResponse.next(
      new Map([
        [
          5301,
          {
            itemId: 5301,
            subId: 0,
            name: 'Reagente',
            price: '999',
            stock: 1,
            totalTrades: '1',
            minPrice: '900',
            maxPrice: '1000',
            lastSoldPrice: '999',
            lastSoldAt: null,
          },
        ],
      ]),
    );

    expect(tree.livePrices().has(5301)).toBe(false);
    expect(tree.livePrices().get(6001)).toBe('200');
    fixture.destroy();
  });
  it('shows fresh, stale and missing quote states without manual market buttons', async () => {
    const mocks = providers();
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    const itemId = tree.root()!.part.itemId;
    const now = Date.now();

    expect(tree.quoteFreshness(itemId)).toEqual({ label: 'Cotação pendente', stale: false });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.quote-freshness')?.textContent).toContain(
      'Cotação pendente',
    );

    const staleEntry: CachedQuoteEntry = {
      quote: {
        itemId,
        subId: 0,
        name: 'Sal',
        price: '100',
        stock: 10,
        totalTrades: '20',
        minPrice: '90',
        maxPrice: '110',
        lastSoldPrice: '100',
        lastSoldAt: null,
      },
      region: 'sa',
      fetchedAt: now - 6 * 60 * 1000,
      expiresAt: now - 60 * 1000,
    };
    mocks.marketCache.quotesMap.set(new Map([[`sa:${itemId}:0`, staleEntry]]));
    expect(tree.quoteFreshness(itemId)).toEqual({
      label: 'Cotação antiga · há 6 min',
      stale: true,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.quote-freshness')?.textContent).toContain(
      'Cotação antiga · há 6 min',
    );

    const freshEntry: CachedQuoteEntry = {
      quote: {
        itemId,
        subId: 0,
        name: 'Sal',
        price: '100',
        stock: 10,
        totalTrades: '20',
        minPrice: '90',
        maxPrice: '110',
        lastSoldPrice: '100',
        lastSoldAt: null,
      },
      region: 'sa',
      fetchedAt: Date.now() - 30 * 1000,
      expiresAt: Date.now() + 4 * 60 * 1000,
    };
    mocks.marketCache.quotesMap.set(new Map([[`sa:${itemId}:0`, freshEntry]]));
    expect(tree.quoteFreshness(itemId)).toEqual({
      label: 'Atualizada há menos de 1 min',
      stale: false,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.quote-freshness')?.textContent).toContain(
      'Atualizada há menos de 1 min',
    );

    tree.showContext(tree.root()!);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.market-subtle-refresh-btn')).toBeNull();
    const buttons = [...fixture.nativeElement.querySelectorAll('button')]
      .map((button: HTMLButtonElement) => button.textContent ?? '')
      .join(' ');
    expect(buttons).not.toContain('Consultar cotação atual');
    fixture.destroy();
  });
  it('debounces a local mastery override by exactly 250 milliseconds', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    vi.useFakeTimers();

    tree.setMasteryOverride(1234);
    expect(tree.masteryOverride()).toBeNull();
    await vi.advanceTimersByTimeAsync(249);
    expect(tree.masteryOverride()).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(tree.masteryOverride()).toBe(1234);

    fixture.destroy();
    vi.useRealTimers();
  });

  it('does not mutate the active character mastery when a local override changes', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    tree.store.update((workspace) => ({
      ...workspace,
      activeCharacterId: 'one',
      characters: [
        characterSchema.parse({
          id: 'one',
          name: 'Aventureiro',
          region: 'sa',
          mastery: {
            gathering: 0,
            cooking: 0,
            alchemy: 800,
            processing: 0,
            fishing: 0,
            hunting: 0,
            training: 0,
            trading: 0,
            farming: 0,
            sailing: 0,
            barter: 0,
          },
        }),
      ],
    }));
    vi.useFakeTimers();

    tree.setMasteryOverride(1500);
    await vi.advanceTimersByTimeAsync(250);

    expect(tree.userMasteryForCurrentRecipe()).toBe(800);
    expect(tree.store.data().characters[0].mastery.alchemy).toBe(800);
    expect(tree.masteryOverride()).toBe(1500);
    fixture.destroy();
    vi.useRealTimers();
  });

  it('applies a complete optimized source map and keeps later checkbox edits', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    const observedAt = new Date().toISOString();
    tree.store.update((workspace) => ({ ...workspace, familySilver: '1000000000' }));
    const saltRecipe: CatalogRecipe = {
      key: 'salt-production',
      type: 'PROCESSING',
      station: null,
      inputs: [{ itemId: 8001, name: 'Matéria-prima', quantity: '1' }],
      outputs: [{ itemId: 9001, name: 'Sal', quantity: '1' }],
    };
    tree.recipeGraph.set({
      rootRecipe: recipe,
      producerRecipes: [saltRecipe],
      itemIds: [5301, 8001, 9001],
      issues: [],
      datasetVersion: 'dataset-v1',
    } satisfies RecipeProductionGraph);
    tree.marketQuotes.set(
      new Map([
        [
          5301,
          {
            itemId: 5301,
            subId: 0,
            name: item.name,
            price: '1000',
            stock: 1000,
            totalTrades: '1',
            minPrice: '900',
            maxPrice: '1100',
            lastSoldPrice: '1000',
            lastSoldAt: observedAt,
          },
        ],
        [
          9001,
          {
            itemId: 9001,
            subId: 0,
            name: 'Sal',
            price: '500',
            stock: 1000,
            totalTrades: '1',
            minPrice: '490',
            maxPrice: '510',
            lastSoldPrice: '500',
            lastSoldAt: observedAt,
          },
        ],
        [
          8001,
          {
            itemId: 8001,
            subId: 0,
            name: 'Matéria-prima',
            price: '10',
            stock: 1000,
            totalTrades: '1',
            minPrice: '9',
            maxPrice: '11',
            lastSoldPrice: '10',
            lastSoldAt: observedAt,
          },
        ],
      ]),
    );
    tree.quoteObservedAt.set(
      new Map([
        [5301, observedAt],
        [9001, observedAt],
        [8001, observedAt],
      ]),
    );
    tree.setMethodTime('ALCHEMY', 10);
    tree.setMethodTime('PROCESSING', 0.5);

    tree.optimizeAcquisition();

    expect(tree.currentProductionPlan()?.scenario).toBe('optimized');
    expect(tree.currentProductionPlan()?.sourceChoices).toEqual({ 8001: 'buy', 9001: 'produce' });
    expect(tree.materialSource(9001)).toBe('produce');
    tree.toggleMaterialSource(9001);
    expect(tree.materialSource(9001)).toBe('buy');
    expect(tree.acquisitionStrategy()).toBe('custom');
    fixture.destroy();
  });

  it('removes the global Personalizado button and zero-stock production message', async () => {
    const mocks = providers();
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    const observedAt = new Date().toISOString();
    configureProduction(tree, { 5301: '1000', 9001: '50' });
    tree.setRootYield(1);
    tree.setCraftCount(1);
    tree.setMethodTime('ALCHEMY', 1);
    tree.marketQuotes.set(
      new Map([
        [
          5301,
          {
            itemId: 5301,
            subId: 0,
            name: item.name,
            price: '1000',
            stock: 0,
            totalTrades: '0',
            minPrice: '900',
            maxPrice: '1100',
            lastSoldPrice: '1000',
            lastSoldAt: null,
          },
        ],
      ]),
    );
    tree.quoteObservedAt.set(new Map([[5301, observedAt]]));
    fixture.detectChanges();

    const buttons = [...fixture.nativeElement.querySelectorAll('button')]
      .map((button: HTMLButtonElement) => button.textContent ?? '')
      .join(' ');
    const text = fixture.nativeElement.textContent ?? '';

    expect(buttons).not.toContain('Personalizado');
    expect(text).not.toContain('ESTOQUE ZERADO NO MERCADO');
    expect(tree.rootInsight()?.advice).not.toContain('única forma de obtenção');
    tree.view.set('list');
    fixture.detectChanges();
    const sourceCheckbox = fixture.nativeElement.querySelector(
      '.material-source-checkbox input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(sourceCheckbox).not.toBeNull();
    expect(sourceCheckbox.checked).toBe(false);
    sourceCheckbox.click();
    fixture.detectChanges();
    expect(tree.materialSource(9001)).toBe('gather');
    fixture.destroy();
  });

  it('does not show a complete hourly profit without required time or quote data', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    expect(tree.totalCraftTimeSeconds()).toBeNull();
    expect(tree.profitPerHour()).toBeNull();
    fixture.destroy();
  });

  it('opens known production ingredients inline in steps without opening the details panel', async () => {
    const mocks = providers();
    mocks.knowledge.produces.mockReturnValue(
      of({
        recipes: [
          {
            ...recipe,
            key: 'salt',
            outputs: [{ itemId: 9001, name: 'Sal', quantity: '1' }],
            inputs: [{ itemId: 4, name: 'Material', quantity: '2' }],
          },
        ],
      }),
    );
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    tree.view.set('tree');
    tree.action({ path: 'root/0', action: 'expand' });
    fixture.detectChanges();
    expect(tree.find('root/0')?.expanded).toBe(true);
    expect(tree.detailsOpen()).toBe(false);
  });
  it('updates total ingredients as the desired quantity changes, including batch rounding', async () => {
    const harmony = {
      ...recipe,
      type: 'SIMPLE_ALCHEMY',
      inputs: [1389, 1391, 1393, 1395, 1397].map((itemId) => ({
        itemId,
        name: 'Material ' + itemId,
        quantity: '10',
      })),
      outputs: [{ itemId: 1399, name: 'Fármaco da Harmonia', quantity: null }],
    };
    const fixture = await renderComponent(RecipeTree, { recipe: harmony }, providers().list);
    const tree = fixture.componentInstance;
    expect(tree.ingredientPreview()?.ingredients[0].total).toBe(100);
    tree.target.set(25);
    fixture.detectChanges();
    expect(tree.ingredientPreview()).toMatchObject({ operations: 3, produced: 30 });
    expect(tree.ingredientPreview()?.ingredients[0].total).toBe(30);
    expect(fixture.nativeElement.querySelector('.material-totals').textContent).toContain(
      'Sobra de 5',
    );
  });
  it('expands nested unique recipes and stops cycles without losing recipes on collapse', async () => {
    const mocks = providers();
    mocks.knowledge.produces.mockImplementation((...args: unknown[]) => {
      const id = args[0];
      return of({
        recipes:
          id === 9001
            ? [{ ...recipe, key: 'salt', outputs: [{ itemId: 9001, name: 'Sal', quantity: '1' }] }]
            : [],
      });
    });
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    await tree.expandAll();
    expect(tree.find('root/0')?.expanded).toBe(true);
    expect(tree.find('root/0/0')?.recipe).toBeNull();
    expect(tree.bulkRunning()).toBe(false);
    expect(mocks.knowledge.produces).toHaveBeenCalledTimes(1);
    tree.collapseAll();
    expect(tree.root()?.expanded).toBe(false);
    expect(tree.find('root/0')?.recipe?.key).toBe('salt');
  });
  it('keeps ambiguous recipes available without selecting a variant or changing the viewport', async () => {
    const mocks = providers();
    const salt = {
      ...recipe,
      key: 'salt',
      outputs: [{ itemId: 9001, name: 'Sal', quantity: '1' }],
    };
    mocks.knowledge.produces.mockReturnValue(
      of({ recipes: [salt, { ...salt, key: 'salt-other', type: 'CRAFT' }] }),
    );
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    tree.graph()!.pan.set({ x: -100, y: 10 });
    tree.graph()!.zoom.set(0.8);
    await tree.expandAll();
    expect(tree.find('root/0')?.recipe).toBeNull();
    expect(tree.find('root/0')?.options).toHaveLength(2);
    expect(tree.bulkMessage()).toContain('1 item aguarda escolha');
    expect(tree.graph()!.pan()).toEqual({ x: -100, y: 10 });
    expect(tree.graph()!.zoom()).toBe(0.8);
  });
  it('cancels pending bulk requests and ignores late results', async () => {
    const mocks = providers();
    const pending = new Subject<{ recipes: CatalogRecipe[] }>();
    mocks.knowledge.produces.mockReturnValue(pending);
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    const expansion = tree.expandAll();
    expect(tree.find('root/0')?.loading).toBe(true);
    tree.stopExpansion();
    await expansion;
    pending.next({ recipes: [recipe] });
    expect(tree.find('root/0')?.recipe).toBeNull();
    expect(tree.find('root/0')?.loading).toBe(false);
    expect(tree.bulkRunning()).toBe(false);
    expect(tree.bulkMessage()).toContain('interrompida');
  });
  it('includes combat origins when expanding a noncraftable leaf', async () => {
    const mocks = providers();
    mocks.knowledge.produces.mockReturnValue(of({ recipes: [] }));
    mocks.knowledge.sources.mockReturnValue(
      of({
        nodes: [],
        spots: [
          {
            id: 'spot',
            name: 'Caça',
            territory: null,
            managerNode: null,
            contribution: null,
            position: null,
            activity: 'grinding',
          },
        ],
        updatedAt: null,
      }),
    );
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    await fixture.componentInstance.expandAll();
    expect(fixture.componentInstance.origins().get(9001)?.[0].activity).toBe('grinding');
    expect(fixture.componentInstance.find('root/0')?.message).toBe('');
  });
  it('keeps all branches collapsed when an individual expansion finishes late', async () => {
    const mocks = providers();
    const pending = new Subject<{ recipes: CatalogRecipe[] }>();
    mocks.knowledge.produces.mockReturnValue(pending);
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    tree.action({ path: 'root/0', action: 'expand' });
    tree.collapseAll();
    pending.next({
      recipes: [{ ...recipe, outputs: [{ itemId: 9001, name: 'Sal', quantity: '1' }] }],
    });
    expect(tree.root()?.expanded).toBe(false);
    expect(tree.find('root/0')?.expanded).toBe(false);
    expect(tree.find('root/0')?.loading).toBe(false);
  });
  it('shows known material cost directly in simple mode and marks absent quotations', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    tree.setRootYield(1);
    tree.setCraftCount(10);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.production-overview .cost-value')?.textContent,
    ).toContain('Sem dados completos');
    configureProduction(tree, { 5301: '1000', 9001: '5' });
    tree.setMethodTime('ALCHEMY', 1);
    fixture.detectChanges();
    expect(tree.advanced()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.production-overview .cost-value')?.textContent,
    ).toContain('100');
    expect(
      fixture.nativeElement.querySelector('.production-overview').closest('details'),
    ).toBeNull();
  });
  it('keeps required yield accessible and preserves the graph and planning choices across modes', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.context-panel')).toBeNull();
    expect(element.querySelector('.stock-settings')).toBeNull();
    expect(element.querySelector('.root-yield input')).not.toBeNull();
    const toggle = element.querySelector('.mode-toggle') as HTMLButtonElement;
    expect(toggle).not.toBeNull();
    tree.setRootYield(2);
    tree.target.set(10);
    tree.excludedLocations.set(['storage:test']);
    tree.selectedPath.set('root/0');
    const root = tree.root();
    const graph = tree.graph()!;
    graph.pan.set({ x: -120, y: 35 });
    graph.zoom.set(0.7);
    graph.focus.set('root/0');
    toggle.click();
    fixture.detectChanges();
    expect(element.querySelector('.stock-settings')).not.toBeNull();
    toggle.click();
    fixture.detectChanges();
    expect(element.querySelector('.stock-settings')).toBeNull();
    expect(tree.graph()).toBe(graph);
    expect(graph.pan()).toEqual({ x: -120, y: 35 });
    expect(graph.zoom()).toBe(0.7);
    expect(graph.focus()).toBe('root/0');
    expect(tree.root()).toBe(root);
    expect(tree.selectedPath()).toBe('root/0');
    expect(tree.excludedLocations()).toEqual(['storage:test']);
    expect(tree.plan()?.value?.rows.find((row) => row.itemId === 9001)?.required).toBe(10);
  });
  it('closes requested item details without clearing selection or discarding cached context', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    tree.showContext(tree.root()!.children[0]);
    fixture.detectChanges();
    const context = tree.context();
    const close = fixture.nativeElement.querySelector('.context-close') as HTMLButtonElement;
    expect(close).not.toBeNull();
    close.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.context-panel')).toBeNull();
    expect(tree.selectedPath()).toBe('root/0');
    expect(tree.context()).toBe(context);
    tree.showContext(tree.root()!.children[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.context-panel')).not.toBeNull();
  });
  it('dismisses invalidated descendant details when its parent changes to external acquisition', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    tree.showContext(tree.root()!.children[0]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.context-panel')).not.toBeNull();
    tree.action({ path: 'root', action: 'buy' });
    fixture.detectChanges();
    expect(tree.selectedPath()).toBe('root');
    expect(tree.context()).toBeNull();
    expect(fixture.nativeElement.querySelector('.context-panel')).toBeNull();
  });
  it('saves external material requirements with the estimated yield and updates the same draft', async () => {
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '5' });
    tree.setMethodTime('ALCHEMY', 1);
    tree.setCraftCount(40);
    tree.saveShoppingList();
    expect(tree.store.data().personalPlans[0]?.materials[0]?.quantity).toBe(80);
    tree.setRootYield(1);
    tree.setCraftCount(500);
    tree.saveShoppingList();
    expect(tree.store.data().personalPlans[0]).toMatchObject({
      sourceItemId: 5301,
      status: 'draft',
      materials: [{ itemId: 9001, quantity: 1000 }],
    });
    tree.setCraftCount(100);
    tree.saveShoppingList();
    expect(tree.store.data().personalPlans).toHaveLength(1);
    expect(tree.store.data().personalPlans[0].materials[0].quantity).toBe(200);
  });
  it('preserves pan, zoom and focused branch when switching to the consolidated list', async () => {
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    tree.setRootYield(1);
    const graph = tree.graph()!;
    graph.pan.set({ x: -200, y: -80 });
    graph.zoom.set(0.65);
    graph.focus.set('root/0');
    tree.view.set('list');
    fixture.detectChanges();
    tree.view.set('graph');
    fixture.detectChanges();
    expect(tree.graph()).toBe(graph);
    expect(graph.pan()).toEqual({ x: -200, y: -80 });
    expect(graph.zoom()).toBe(0.65);
    expect(graph.focus()).toBe('root/0');
  });
  it('rejects sub-recipes from a newer dataset before adding their ingredients', async () => {
    const dependencies = providers();
    dependencies.knowledge.produces.mockReturnValueOnce(
      of({ recipes: [recipe], dataset: { version: 'new' } }) as unknown as ReturnType<
        typeof dependencies.knowledge.produces
      >,
    );
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item, datasetVersion: 'old' },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    tree.action({ path: 'root/0', action: 'expand' });
    expect(tree.root()?.children[0].recipe).toBeNull();
    expect(tree.root()?.children[0].loading).toBe(false);
    expect(tree.root()?.children[0].message).toContain('catálogo mudou');
  });
  it('discards an expansion response after the user chooses external acquisition', async () => {
    const dependencies = providers();
    const pending = new Subject<CatalogRecipesResponse>();
    dependencies.knowledge.produces.mockReturnValueOnce(
      pending as unknown as ReturnType<typeof dependencies.knowledge.produces>,
    );
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    tree.action({ path: 'root/0', action: 'expand' });
    tree.action({ path: 'root/0', action: 'buy' });
    pending.next({
      recipes: [{ ...recipe, outputs: [recipe.inputs[0]] }],
      total: 1,
      direction: 'produces',
      dataset: null,
    });
    pending.complete();
    expect(tree.root()?.children[0].recipe).toBeNull();
    expect(tree.root()?.children[0].loading).toBe(false);
  });
  it('reveals grind spots and retains a selected combat origin without manufacturing it', async () => {
    const dependencies = providers();
    const spot = {
      id: 'spot:3',
      name: 'Floresta Mansha',
      activity: 'grinding',
      territory: null,
      managerNode: null,
      contribution: null,
      position: null,
    };
    dependencies.knowledge.sources.mockReturnValue(
      of({ nodes: [], spots: [spot], updatedAt: null }) as unknown as ReturnType<
        typeof dependencies.knowledge.sources
      >,
    );
    const fixture = await renderComponent(RecipeTree, { selectedItem: item }, dependencies.list);
    const tree = fixture.componentInstance;
    tree.action({ path: 'root', action: 'source' });
    fixture.detectChanges();
    expect(tree.graph()?.layout().sources).toHaveLength(2);
    tree.openLocation({ path: 'root', source: tree.contextSources()[0] });
    tree.chooseSource(tree.selectedLocation()!);
    fixture.detectChanges();
    expect(tree.root()?.acquisition?.kind).toBe('grinding');
    tree.action({ path: 'root', action: 'collapse' });
    tree.action({ path: 'root', action: 'expand' });
    expect(tree.root()?.acquisition?.kind).toBe('grinding');
    expect(tree.plan()?.value?.tasks).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Não é Hunting');
  });
  it('automatically uses an estimated yield for a recipe without yield metadata', async () => {
    const dependencies = providers(),
      fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;
    expect(tree.root()?.yield).toBeNull();
    expect(tree.effectiveYield()).toBe(2.5);
    expect(tree.plan()?.value).not.toBeNull();
    tree.recipeGraph.set({
      rootRecipe: recipe,
      producerRecipes: [],
      itemIds: [5301, 9001],
      issues: [],
      datasetVersion: 'dataset-v1',
    });
    tree.setRootYield(2.5);
    tree.target.set(10);
    fixture.detectChanges();
    expect(tree.plan()?.value?.rows.find((r) => r.itemId === 9001)?.required).toBe(8);
    expect(fixture.nativeElement.querySelector('.btn-apply-default-yield')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Confirme o rendimento para calcular');
    tree.view.set('list');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table').textContent).toContain('Sal');
    expect(fixture.nativeElement.querySelectorAll('img').length).toBe(0);
  });
  it('uses a partial context response and does not let an older selection replace a newer one', async () => {
    const dependencies = providers(),
      pending = new Subject<{ item: CatalogItemDetail }>();
    dependencies.knowledge.item.mockReturnValueOnce(
      pending as unknown as ReturnType<typeof dependencies.knowledge.item>,
    );
    const fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;
    tree.showContext(tree.root()!);
    tree.showContext(tree.root()!.children[0]);
    expect(tree.context()?.node.part.itemId).toBe(9001);
    pending.next({ item });
    pending.complete();
    expect(tree.context()?.node.part.itemId).toBe(9001);
  });
  it('consults market quotes for all currently visible items and updates live prices', async () => {
    const dependencies = providers(),
      fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;
    tree.setRootYield(1);
    tree.target.set(10);
    fixture.detectChanges();

    dependencies.marketCache.resolveQuotesBatch.mockReturnValue(
      of(
        new Map([
          [5301, { itemId: 5301, subId: 0, name: 'Reagente', price: '500', stock: 10 }],
          [9001, { itemId: 9001, subId: 0, name: 'Sal', price: '50', stock: 10 }],
        ]) as Map<number, MarketItemQuote>,
      ),
    );

    tree.consultAllTreePrices();
    fixture.detectChanges();

    expect(tree.livePrices().get(5301)).toBe('500');
    expect(tree.livePrices().get(9001)).toBe('50');
    expect(tree.treeMarketMessage()).toContain('cotações disponíveis');
  });
  it('calculates gross revenue, net revenue, profit, profitPerHour and formattedCraftTime', async () => {
    const dependencies = providers(),
      fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '100' });
    tree.setRootYield(2);
    tree.setCraftCount(50);
    tree.setMethodTime('ALCHEMY', 1.5);
    fixture.detectChanges();

    expect(tree.operationsCount()).toBe(50);
    expect(tree.producedQuantity()).toBe(100);
    expect(tree.totalCraftTimeSeconds()).toBe(75);
    expect(tree.formattedCraftTime()).toBe('1m 15s');

    expect(tree.productPrice()).toBe('1000');
    expect(tree.grossRevenue()).toBe('100000');
    expect(tree.netRevenue()).not.toBeNull();
    expect(tree.profit()).not.toBeNull();
    expect(tree.profitPerHour()).not.toBeNull();
    expect(tree.revenuePerHour()).not.toBeNull();
    expect(tree.isPositiveProfit()).toBe(true);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.economic-dashboard')).toBeTruthy();
    expect(el.querySelector('.economic-metrics-grid')).toBeTruthy();
    expect(el.textContent).toContain('MERCADO CENTRAL & RENTABILIDADE');
  });

  it('supports single craft count field and updates operations, produced quantity and target', async () => {
    const dependencies = providers(),
      fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;
    tree.setRootYield(2.5);
    tree.setCraftCount(100);
    fixture.detectChanges();

    expect(tree.craftCount()).toBe(100);
    expect(tree.operationsCount()).toBe(100);
    expect(tree.producedQuantity()).toBe(250);
    expect(tree.formattedProducedQuantity()).toBe('250');
    expect(tree.target()).toBe(250);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.craft-count-card')).toBeTruthy();
    expect(el.querySelector('.craft-count-input')).toBeTruthy();
    expect(el.textContent).toContain('Quantia de receitas');
  });

  it('automatically estimates yield from life skill and character mastery', async () => {
    const dependencies = providers(),
      fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;

    expect(tree.root()?.yield).toBeNull();
    expect(tree.effectiveYield()).toBe(2.5);
    expect(tree.plan()?.value).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-apply-default-yield')).toBeNull();
  });

  it('supports bulk material sources and per-item checkbox edits without free gathering assumptions', async () => {
    const dependencies = providers(),
      fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '500', 9001: '100' });
    tree.setRootYield(1);
    tree.setCraftCount(100);
    tree.setMethodTime('ALCHEMY', 1);
    fixture.detectChanges();

    // Default: buy_all
    expect(tree.acquisitionStrategy()).toBe('buy_all');
    const baseCost = tree.effectiveMaterialCost();
    expect(baseCost).not.toBeNull();
    expect(BigInt(baseCost ?? '0')).toBeGreaterThan(0n);
    const buyProfit = tree.profit();
    expect(buyProfit).not.toBeNull();

    // A gather choice needs an explicit yield and time before it can be ranked.
    tree.setAcquisitionStrategy('gather_all');
    fixture.detectChanges();
    expect(tree.materialSource(9001)).toBe('gather');
    expect(tree.effectiveMaterialCost()).toBeNull();
    expect(tree.profit()).toBeNull();
    tree.setGatherEstimate(9001, 200, 10);
    fixture.detectChanges();
    expect(tree.effectiveMaterialCost()).toBe('0');
    expect(tree.profit()).toBe(tree.netRevenue());
    expect(tree.profitMargin()).toBeNull();

    // The per-item checkbox reverses the bulk selection.
    tree.toggleMaterialSource(9001);
    expect(tree.materialSource(9001)).toBe('buy');
    expect(tree.effectiveMaterialCost()).toBe(baseCost);
  });

  it('computes Make vs Buy insights for final product and intermediate components', async () => {
    const dependencies = providers(),
      fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '200' });
    tree.setRootYield(1);
    tree.setCraftCount(10);
    tree.setMethodTime('ALCHEMY', 1);
    tree.marketQuotes.update((q) => new Map(q).set(5301, { ...q.get(5301)!, stock: 50 }));
    fixture.detectChanges();

    const craftInsight = tree.rootInsight();
    expect(craftInsight).not.toBeNull();
    expect(craftInsight?.recommendation).toBe('craft');
    expect(craftInsight?.advice).toContain('Margem estimada');
    expect(craftInsight?.marketStock).toBeNull();
    expect(craftInsight?.totalTrades).toBe('10000');

    // When material price is very high: Sal = 800 -> craft cost 1600 > market price 1000
    tree.livePrices.update((p) => new Map(p).set(9001, '800'));
    tree.marketQuotes.update((q) => new Map(q).set(9001, { ...q.get(9001)!, price: '800' }));
    fixture.detectChanges();
    const buyInsight = tree.rootInsight();
    expect(buyInsight?.recommendation).toBe('unprofitable');
    expect(buyInsight?.advice).toContain('preço de venda estimado');

    // Zero stock does not turn a sale analysis into a recommendation about obtaining the item.
    tree.marketQuotes.update((q) => new Map(q).set(5301, { ...q.get(5301)!, stock: 0 }));
    fixture.detectChanges();
    const unavailableInsight = tree.rootInsight();
    expect(unavailableInsight?.recommendation).not.toBe('scarce');
    expect(unavailableInsight?.advice).not.toContain('Estoque zerado');
    expect(tree.netRevenue()).not.toBeNull();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.insight-decision-card')).toBeTruthy();
    expect(el.textContent).not.toContain('ESTOQUE ZERADO NO MERCADO');
    expect(el.textContent).not.toContain('Produzir é a única forma de obtenção imediata');
  });
});
