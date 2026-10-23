import { signal } from '@angular/core';
import { characterSchema, planProduction, type ProductionPlannerInput } from '@bdo/calculators';
import type {
  CatalogItem,
  CatalogItemDetail,
  CatalogRecipe,
  CatalogRecipesResponse,
  MarketItemQuote,
  NpcPurchasePrice,
  RecipeMarketEquivalent,
} from '@bdo/shared';
import { NEVER, of, Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { IdentityService } from '../../core/identity.service';
import { type CachedQuoteEntry, MarketCacheService } from '../../core/market-cache.service';
import { MarketApi } from '../../features/market/market-api';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { withVerifiedIngredientSubstitutions } from './recipe-equivalents';
import { type ItemSources, RecipeKnowledge } from './recipe-knowledge';
import type { RecipeProductionGraph } from './recipe-production-graph';
import { RecipeTree } from './recipe-tree';
beforeEach(() => {
  vi.stubGlobal(
    'Worker',
    class {
      onmessage?: (event: { data: { result: ReturnType<typeof planProduction> } }) => void;
      terminate() {}
      postMessage(input: ProductionPlannerInput) {
        this.onmessage?.({ data: { result: planProduction(input) } });
      }
    },
  );
});
afterEach(() => vi.unstubAllGlobals());
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
    getItems: vi.fn((params: { ids?: readonly number[] }) =>
      of({
        items: (params.ids ?? []).map((id) => ({
          id,
          name: `Catálogo ${id}`,
          description: null,
          grade: null,
          weight: null,
          category: null,
          icon: null,
          iconUrl: null,
          categories: [],
        })),
        total: params.ids?.length ?? 0,
        page: 1,
        pageSize: 100,
        dataset: null,
      }),
    ),
    getItemsByIds: vi.fn((itemIds: readonly number[]) =>
      of({
        items: new Map(
          itemIds.map((id) => [
            id,
            {
              id,
              name: `Catálogo ${id}`,
              description: null,
              grade: null,
              weight: null,
              category: null,
              icon: null,
              iconUrl: null,
              categories: [],
            } as CatalogItem,
          ]),
        ),
        dataset: null,
      }),
    ),
    getNpcPurchasePrices: vi.fn((_itemIds: number[], _datasetVersion: string) =>
      of(new Map<number, NpcPurchasePrice>()),
    ),
    getRecipeMarketEquivalents: vi.fn((_itemIds: number[], _datasetVersion: string) =>
      of<RecipeMarketEquivalent[]>([]),
    ),
    getItemRecipes: vi.fn((_itemId: number, _direction: 'produces' | 'uses') =>
      of({ recipes: [], total: 0, direction: 'produces', dataset: null } as CatalogRecipesResponse),
    ),
    getByproductRecipes: vi.fn((_itemIds: readonly number[], _datasetVersion: string) =>
      of({
        recipes: [],
        total: 0,
        direction: 'byproducts',
        dataset: _datasetVersion
          ? {
              version: _datasetVersion,
              region: 'sa',
              locale: 'pt',
              checksum: null,
              itemCount: 0,
              recipeCount: 0,
              importedAt: new Date().toISOString(),
            }
          : null,
      } as CatalogRecipesResponse),
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
  tree.quoteObservedAt.set(new Map(Object.keys(prices).map((id) => [Number(id), observedAt])));
  tree.livePrices.set(new Map(Object.entries(prices).map(([id, price]) => [Number(id), price])));
  tree.store.update((workspace) => ({ ...workspace, familySilver: '1000000000000' }));
}

describe('Interactive recipe tree', () => {
  it('balances decision panels with matching row heights and stacks them at 900px', () => {
    const styles = (
      RecipeTree as unknown as { ɵcmp: { styles: readonly string[] } }
    ).ɵcmp.styles.join('\n');
    expect(styles).toMatch(/grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(styles).toMatch(/align-items:\s*start/);
    expect(styles).toMatch(/align-self:\s*stretch/);
    expect(styles).toContain('@media (max-width: 900px)');
    expect(styles).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
  });

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
    await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(mocks.catalog.getItemRecipes).toHaveBeenCalledWith(9001, 'produces');
    expect(mocks.catalog.getItemRecipes).toHaveBeenCalledWith(8001, 'produces');
    expect(mocks.marketCache.resolveQuotesBatch).toHaveBeenCalledWith(
      [
        4076, 4481, 4684, 4924, 4998, 5019, 5301, 5302, 5304, 5306, 5964, 6183, 6601, 6602, 6603,
        6604, 6605, 8001, 9001, 16001, 16080, 44195, 44336, 45216, 45248, 45280, 721002, 721003,
        766107, 820910,
      ],
      'sa',
      false,
    );
  });

  it('loads market equivalents and prices a fresh fish using its dried market quote', async () => {
    const mocks = providers();
    const fishRecipe: CatalogRecipe = {
      key: 'fish-cooking',
      type: 'COOK',
      station: null,
      inputs: [{ itemId: 8211, name: 'Lula', quantity: '1' }],
      outputs: [{ itemId: 9601, name: 'Refeição de Balenos', quantity: null }],
    };
    const equivalent: RecipeMarketEquivalent = {
      sourceItemId: 8211,
      itemId: 8511,
      name: 'Calamar Desidratado',
      iconUrl: '/api/v1/items/8511/icon?dataset=checksum',
      quantityRatio: 1,
    };
    const driedQuote: MarketItemQuote = {
      itemId: 8511,
      subId: 0,
      name: equivalent.name,
      price: '16000',
      stock: 0,
      totalTrades: '0',
      minPrice: '12000',
      maxPrice: '24000',
      lastSoldPrice: '16000',
      lastSoldAt: null,
    };
    mocks.catalog.getRecipeMarketEquivalents.mockReturnValue(of([equivalent]));
    mocks.catalog.getItemRecipes.mockReturnValue(
      of({
        recipes: [],
        total: 0,
        direction: 'produces',
        dataset: {
          version: 'dataset-v1',
          region: 'sa',
          locale: 'pt',
          checksum: null,
          itemCount: 0,
          recipeCount: 0,
          importedAt: '2026-10-13T00:00:00.000Z',
        },
      } as CatalogRecipesResponse),
    );
    mocks.marketCache.resolveQuotesBatch.mockImplementation(() => {
      mocks.marketCache.quotesMap.set(
        new Map([
          [
            'sa:8511:0',
            {
              quote: driedQuote,
              region: 'sa',
              fetchedAt: Date.now(),
              expiresAt: Date.now() + 60_000,
            },
          ],
        ]),
      );
      const unavailableFreshQuote: MarketItemQuote = {
        itemId: 8211,
        subId: 0,
        name: 'Lula',
        price: '0',
        stock: 0,
        totalTrades: '0',
        minPrice: '0',
        maxPrice: '0',
        lastSoldPrice: '0',
        lastSoldAt: null,
      };
      return of(
        new Map([
          [8211, unavailableFreshQuote],
          [8511, driedQuote],
        ]),
      );
    });
    const fixture = await renderComponent(
      RecipeTree,
      {
        recipe: fishRecipe,
        selectedItem: { ...item, id: 9601, name: 'Refeição de Balenos' },
        datasetVersion: 'dataset-v1',
      },
      mocks.list,
    );
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(fixture.componentInstance.root()).not.toBeNull();
    fixture.componentInstance.consultAllTreePrices(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    fixture.detectChanges();

    const tree = fixture.componentInstance;
    expect(mocks.catalog.getRecipeMarketEquivalents).toHaveBeenCalledWith(
      expect.arrayContaining([8211]),
      'dataset-v1',
    );
    expect(mocks.marketCache.resolveQuotesBatch).toHaveBeenCalledWith(
      expect.arrayContaining([8511]),
      'sa',
      true,
    );
    expect(tree.materialPrice(8211)).toMatchObject({
      price: '24000',
      source: 'equivalent',
      equivalentPriceSource: 'maximum',
      equivalentItem: { name: 'Calamar Desidratado' },
    });
    expect(tree.productionInput()?.quotes[8211]).toMatchObject({
      unitPrice: '24000',
      source: 'market',
      available: null,
    });
    const material = fixture.nativeElement.querySelector(
      '.sidebar-material-row[data-item-id="8211"]',
    ) as HTMLElement | null;
    expect(material?.textContent).toContain('Equivalente');
    expect(material?.textContent).toContain('Máxima');
    expect(material?.textContent).toContain('Calamar Desidratado');
    expect(material?.textContent).not.toContain('Est: 0');
    fixture.destroy();
  });

  it('shows two returns first and lets the user expand and collapse the editable list', async () => {
    const dependencies = providers();
    const ids = [
      4076, 4481, 4684, 4924, 4998, 5019, 5301, 5302, 5304, 5306, 5964, 6183, 6601, 6602, 6603,
      6604, 6605, 16001, 16080, 44195, 44336, 45216, 45248, 45280, 721002, 721003, 766107, 820910,
    ];
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '100' });
    tree.masteryOverride.set(3000);
    tree.masteryInput.set(3000);
    tree.setCraftCount(100);
    fixture.detectChanges();

    await new Promise((resolve) => setTimeout(resolve, 400));
    fixture.detectChanges();

    expect(dependencies.catalog.getItemsByIds).toHaveBeenCalledWith(
      expect.arrayContaining(ids),
      '',
    );
    expect(tree.returnedProductRows()).toHaveLength(28);
    expect(tree.returnedProductRows().find((row) => row.itemId === 5302)?.name).toBe(
      'Catálogo 5302',
    );
    const materialsPanel = fixture.nativeElement.querySelector('.workspace-materials-sidebar');
    expect(materialsPanel.querySelector('.returned-product-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.economic-dashboard .returned-product-panel')).toBe(
      null,
    );
    expect(fixture.nativeElement.querySelectorAll('.returned-product-list')).toHaveLength(1);
    const list = fixture.nativeElement.querySelector('.returned-product-list') as HTMLElement;
    const toggle = fixture.nativeElement.querySelector(
      '.returned-product-toggle',
    ) as HTMLButtonElement;
    expect(list.querySelectorAll('.returned-product-row')).toHaveLength(2);
    expect(list.querySelectorAll('.returned-product-choice input')).toHaveLength(2);
    expect(toggle.textContent).toContain('Mostrar mais');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    toggle.click();
    fixture.detectChanges();
    expect(list.querySelectorAll('.returned-product-row')).toHaveLength(28);
    expect(list.querySelectorAll('.returned-product-choice input')).toHaveLength(28);
    expect(toggle.textContent).toContain('Mostrar menos');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');

    toggle.click();
    fixture.detectChanges();
    expect(list.querySelectorAll('.returned-product-row')).toHaveLength(2);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.alchemy-bonus-group')).toBeNull();
    fixture.destroy();
  });

  it('loads catalog metadata for byproduct recipe outputs', async () => {
    const dependencies = providers();
    const byproduct: CatalogRecipe = {
      key: 'clear-reagent-byproduct',
      type: 'ALCHEMY',
      station: null,
      byproductOfItemId: 5301,
      inputs: [],
      outputs: [{ itemId: 750, name: 'Elixir secundário', quantity: null }],
    };
    dependencies.catalog.getByproductRecipes.mockReturnValue(
      of({
        recipes: [byproduct],
        total: 1,
        direction: 'byproducts',
        dataset: null,
      } as CatalogRecipesResponse),
    );
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    tree.consultAllTreePrices();

    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(dependencies.catalog.getItemsByIds).toHaveBeenCalledWith(
      expect.arrayContaining([750]),
      '',
    );
    expect(tree.returnedProductRows().find((row) => row.itemId === 750)?.name).toBe('Catálogo 750');
    fixture.destroy();
  });

  it('refreshes the production graph and market quotes after a root ingredient substitution', async () => {
    const organicFeed: CatalogRecipe = {
      key: 'organic-feed',
      type: 'COOK',
      station: null,
      inputs: [
        { itemId: 9261, name: 'Aveia', quantity: '2' },
        { itemId: 7905, name: 'Carne de Porco', quantity: '5' },
        { itemId: 8201, name: 'Gobião', quantity: '1' },
        { itemId: 7921, name: 'Frango', quantity: '4' },
      ],
      outputs: [{ itemId: 54018, name: 'Ração Orgânica', quantity: null }],
    };
    const alternatives = withVerifiedIngredientSubstitutions([organicFeed]);
    const substituted = alternatives.find((candidate) => candidate.key.includes('fish-8501'))!;
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      {
        recipe: organicFeed,
        recipes: alternatives,
        selectedItem: { ...item, id: 54018, name: 'Ração Orgânica' },
      },
      dependencies.list,
    );
    await new Promise((resolve) => setTimeout(resolve, 400));

    fixture.componentInstance.action({ path: 'root', action: 'choose', value: substituted.key });
    await new Promise((resolve) => setTimeout(resolve, 400));

    expect(fixture.componentInstance.root()?.recipe?.inputs[2]?.itemId).toBe(8501);
    expect(dependencies.catalog.getItemRecipes).toHaveBeenCalledWith(8501, 'produces');
    expect(dependencies.marketCache.resolveQuotesBatch).toHaveBeenCalledWith(
      expect.arrayContaining([8501]),
      'sa',
      true,
    );
    fixture.destroy();
  });

  it('loads database NPC prices for every item in the resolved recipe graph', async () => {
    const mocks = providers();
    const saltRecipe: CatalogRecipe = {
      key: 'salt-byproduct',
      type: 'PROCESSING',
      station: null,
      inputs: [],
      outputs: [
        { itemId: 9001, name: 'Sal', quantity: '1' },
        { itemId: 7313, name: 'Maçã', quantity: '1' },
      ],
    };
    const npcPrice: NpcPurchasePrice = {
      itemId: 7313,
      unitPrice: '1000',
      vendor: 'Vendedor NPC listado no catálogo',
      verifiedAt: '2026-10-10T12:22:17.854Z',
    };
    mocks.catalog.getNpcPurchasePrices.mockReturnValue(of(new Map([[7313, npcPrice]])));
    mocks.catalog.getItemRecipes.mockReturnValue(
      of({
        recipes: [saltRecipe],
        total: 1,
        direction: 'produces',
        dataset: {
          version: 'dataset-v1',
          region: 'sa',
          locale: 'pt',
          checksum: null,
          itemCount: 2,
          recipeCount: 1,
          importedAt: '2026-10-10T12:00:00Z',
        },
      } as CatalogRecipesResponse),
    );
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item, datasetVersion: 'dataset-v1' },
      mocks.list,
    );
    const tree = fixture.componentInstance;

    tree.consultAllTreePrices();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(mocks.catalog.getNpcPurchasePrices).toHaveBeenCalledWith(
      [5301, 7313, 9001],
      'dataset-v1',
    );
    expect(tree.productionInput()?.quotes[7313]).toMatchObject({
      unitPrice: '1000',
      source: 'npc',
      observedAt: npcPrice.verifiedAt,
    });
    fixture.destroy();
  });

  it('shows NPC purchase prices in material costs when the market has no quote', async () => {
    const sugarRecipe: CatalogRecipe = {
      ...recipe,
      inputs: [{ itemId: 9002, name: 'Açúcar', quantity: '2' }],
    };
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: sugarRecipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    tree.recipeGraph.set({
      rootRecipe: sugarRecipe,
      producerRecipes: [],
      itemIds: [5301, 9002],
      issues: [],
      datasetVersion: 'dataset-v1',
    });
    tree.marketQuotes.set(
      new Map([
        [
          5301,
          {
            itemId: 5301,
            subId: 0,
            name: item.name,
            price: '100',
            stock: 10,
            totalTrades: '1',
            minPrice: '100',
            maxPrice: '100',
            lastSoldPrice: '100',
            lastSoldAt: new Date().toISOString(),
          },
        ],
      ]),
    );
    tree.quoteObservedAt.set(new Map([[5301, new Date().toISOString()]]));
    tree.npcPurchasePrices.set(
      new Map([
        [
          9002,
          {
            itemId: 9002,
            unitPrice: '20',
            vendor: 'Vendedor NPC listado no catálogo',
            verifiedAt: '2026-10-10T12:22:17.854Z',
          },
        ],
      ]),
    );
    fixture.detectChanges();

    expect(tree.materialPurchaseValue(9002, 2)).toBe('40');
    expect(tree.materialDecisions().find((row) => row.itemId === 9002)?.unitPrice).toBe('20');
    const row = fixture.nativeElement.querySelector(
      '.sidebar-material-row[data-item-id="9002"]',
    ) as HTMLElement | null;
    expect(row?.textContent).toContain('NPC');
    expect(row?.textContent).toContain('20');
    expect(row?.textContent).not.toContain('Sem cotação');
    fixture.destroy();
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

  it('explains when an unsupported recipe type has no mastery proc model', async () => {
    const catalogYield: CatalogRecipe = {
      ...recipe,
      type: 'OTHER',
      outputs: [{ itemId: 5301, name: item.name, quantity: '1' }],
    };
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: catalogYield, selectedItem: item },
      providers().list,
    );
    expect(fixture.componentInstance.yieldDescription()).toContain('proc adicional não modelado');
    expect(fixture.componentInstance.masteryApplies()).toBe(false);
    expect(
      (
        fixture.nativeElement.querySelector(
          'input[aria-label="Maestria da profissão"]',
        ) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    fixture.destroy();
  });

  it('shows materials whose required quantity is missing instead of displaying zero', async () => {
    const incompleteRecipe: CatalogRecipe = {
      ...recipe,
      inputs: [{ itemId: 9001, name: 'Sal', quantity: null }],
    };
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: incompleteRecipe, selectedItem: item },
      providers().list,
    );
    configureProduction(fixture.componentInstance, { 5301: '1000', 9001: '5' });
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector(
      '.sidebar-material-row[data-item-id="9001"]',
    ) as HTMLElement | null;
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('Quantidade pendente');
    expect(row?.textContent).not.toContain('0 un');
    fixture.destroy();
  });

  it('returns focus to the graph trigger after closing root details', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const trigger = document.createElement('button');
    fixture.nativeElement.appendChild(trigger);
    trigger.focus();
    fixture.componentInstance.action({ path: 'root', action: 'source' });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect(document.activeElement?.classList.contains('context-close')).toBe(true);
    fixture.componentInstance.closeDetails();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.activeElement).toBe(trigger);
    fixture.destroy();
  });

  it('does not offer a mastery override for simple alchemy with fixed output', async () => {
    const simpleRecipe: CatalogRecipe = {
      ...recipe,
      type: 'SIMPLE_ALCHEMY',
      outputs: [{ itemId: 5301, name: item.name, quantity: '1' }],
    };
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: simpleRecipe, selectedItem: item },
      providers().list,
    );
    const masteryInput = fixture.nativeElement.querySelector(
      'input[aria-label="Maestria da profissão"]',
    ) as HTMLInputElement;
    expect(masteryInput.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Maestria sem efeito nesta fórmula');
    fixture.destroy();
  });

  it('keeps mastery available for production alternatives when all intermediates are bought', async () => {
    const harmonyItem = {
      ...item,
      id: 1399,
      name: 'Fármaco da Harmonia',
    } as CatalogItemDetail;
    const simpleRoot: CatalogRecipe = {
      ...recipe,
      key: 'harmony',
      type: 'SIMPLE_ALCHEMY',
      inputs: [1389, 1391, 1393, 1395, 1397].map((itemId) => ({
        itemId,
        name: `Elixir ${itemId}`,
        quantity: '10',
      })),
      outputs: [{ itemId: 1399, name: harmonyItem.name, quantity: null }],
    };
    const intermediate: CatalogRecipe = {
      ...recipe,
      key: 'make-harmony-component',
      inputs: [{ itemId: 9002, name: 'Açúcar', quantity: '1' }],
      outputs: [{ itemId: 1389, name: 'Elixir 1389', quantity: null }],
    };
    const mocks = providers();
    mocks.catalog.getItemRecipes.mockImplementation((itemId) => {
      const recipes = itemId === 1399 ? [simpleRoot] : itemId === 1389 ? [intermediate] : [];
      return of({
        recipes,
        total: recipes.length,
        direction: 'produces',
        dataset: {
          version: 'dataset-v1',
          region: 'sa',
          locale: 'pt',
          checksum: null,
          itemCount: 0,
          recipeCount: 0,
          importedAt: '2026-10-16T00:00:00Z',
        },
      } as CatalogRecipesResponse);
    });
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: simpleRoot, selectedItem: harmonyItem, datasetVersion: 'dataset-v1' },
      mocks.list,
    );
    fixture.componentInstance.consultAllTreePrices(true);
    fixture.detectChanges();

    expect(
      fixture.componentInstance.currentProductionPlan()?.steps.map((step) => step.recipeId),
    ).not.toContain('make-harmony-component');
    expect(fixture.componentInstance.effectiveYield()).toBe(10);
    expect(fixture.componentInstance.masteryApplies()).toBe(true);
    const masteryInput = fixture.nativeElement.querySelector(
      'input[aria-label="Maestria de Alquimia"]',
    ) as HTMLInputElement | null;
    expect(masteryInput).not.toBeNull();
    expect(masteryInput?.disabled).toBe(false);

    fixture.componentInstance.setMasteryForSkill('alchemy', 3000);
    fixture.detectChanges();
    expect(
      fixture.componentInstance.productionInput()?.estimates['make-harmony-component']
        ?.expectedYield,
    ).toBe(3.438);
    fixture.destroy();
  });

  it('offers a processing mastery override for a recipe with known materials', async () => {
    const processingRecipe: CatalogRecipe = { ...recipe, type: 'PROCESSING' };
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: processingRecipe, selectedItem: item },
      providers().list,
    );
    expect(fixture.componentInstance.masteryApplies()).toBe(true);
    expect(fixture.componentInstance.effectiveYield()).toBe(212.5);
    expect(
      (
        fixture.nativeElement.querySelector(
          'input[aria-label="Maestria de Processamento"]',
        ) as HTMLInputElement
      ).disabled,
    ).toBe(false);
    fixture.destroy();
  });

  it('renders separate simulation mastery inputs for every active profession', async () => {
    const simpleRoot: CatalogRecipe = {
      ...recipe,
      key: 'simple-mixed-root',
      type: 'SIMPLE_ALCHEMY',
      inputs: [1389, 1388].map((itemId) => ({
        itemId,
        name: `Material ${itemId}`,
        quantity: '1',
      })),
      outputs: [{ itemId: 1399, name: 'Produto simples', quantity: '10' }],
    };
    const alchemy: CatalogRecipe = {
      ...recipe,
      key: 'alchemy-intermediate',
      inputs: [{ itemId: 9001, name: 'Reagente', quantity: '1' }],
      outputs: [{ itemId: 1389, name: 'Elixir', quantity: null }],
    };
    const processing: CatalogRecipe = {
      ...recipe,
      key: 'processing-intermediate',
      type: 'PROCESSING',
      inputs: [{ itemId: 9002, name: 'Minério', quantity: '1' }],
      outputs: [{ itemId: 1388, name: 'Lingote', quantity: null }],
    };
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: simpleRoot, selectedItem: item },
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
            cooking: 700,
            alchemy: 800,
            processing: 500,
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
    tree.recipeGraph.set({
      rootRecipe: simpleRoot,
      producerRecipes: [alchemy, processing],
      itemIds: [1399, 1389, 1388, 9001, 9002],
      issues: [],
      datasetVersion: 'dataset-v1',
    });
    tree.customMaterialSource.set(
      new Map([
        [1389, 'produce'],
        [1388, 'produce'],
      ]),
    );
    tree.acquisitionStrategy.set('custom');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('input[aria-label="Maestria de Alquimia"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('input[aria-label="Maestria de Processamento"]'),
    ).not.toBeNull();
    for (const control of fixture.nativeElement.querySelectorAll(
      '.recipe-mastery-settings input',
    )) {
      expect(
        control.closest('details'),
        'mastery must be editable without opening advanced settings',
      ).toBeNull();
    }

    vi.useFakeTimers();
    tree.setMasteryForSkill('alchemy', 3000);
    tree.setMasteryForSkill('processing', 0);
    await vi.advanceTimersByTimeAsync(250);
    fixture.detectChanges();

    expect(tree.masteryOverrides()).toEqual({ alchemy: 3000, processing: 0 });
    expect(tree.productionInput()?.estimates['simple-mixed-root']?.expectedYield).toBe(10);
    expect(tree.productionInput()?.estimates['alchemy-intermediate']?.expectedYield).toBe(3.438);
    expect(tree.productionInput()?.estimates['processing-intermediate']?.expectedYield).toBe(2.5);
    expect(tree.store.activeCharacter()?.mastery).toMatchObject({
      alchemy: 800,
      processing: 500,
      cooking: 700,
    });
    fixture.destroy();
    vi.useRealTimers();
  });

  it('keeps mastery available when an active intermediate recipe has variable yield', async () => {
    const rootRecipe: CatalogRecipe = {
      ...recipe,
      outputs: [{ itemId: 5301, name: item.name, quantity: '1' }],
    };
    const producer: CatalogRecipe = {
      ...recipe,
      key: 'make-salt',
      inputs: [],
      outputs: [{ itemId: 9001, name: 'Sal', quantity: null }],
    };
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: rootRecipe, selectedItem: item },
      providers().list,
    );
    fixture.componentInstance.recipeGraph.set({
      rootRecipe,
      producerRecipes: [producer],
      itemIds: [5301, 9001],
      issues: [],
      datasetVersion: 'dataset-v1',
    });
    fixture.componentInstance.customMaterialSource.set(new Map([[9001, 'produce']]));
    fixture.componentInstance.acquisitionStrategy.set('custom');
    fixture.detectChanges();

    expect(
      fixture.componentInstance.currentProductionPlan()?.steps.map((step) => step.recipeId),
    ).toContain('make-salt');
    expect(fixture.componentInstance.masteryApplies()).toBe(true);
    fixture.destroy();
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

    expect(tree.productionResult()?.ranked.some((plan) => plan.scenario === 'optimized')).toBe(
      false,
    );
    expect(tree.productionResult()?.incomplete.some((plan) => plan.scenario === 'optimized')).toBe(
      false,
    );
    tree.optimizeAcquisition();

    expect(tree.currentProductionPlan()?.scenario).not.toBe('optimized');
    expect(tree.previewPlan()?.sourceChoices).toEqual({ 8001: 'buy', 9001: 'produce' });
    fixture.detectChanges();
    const previewDialog = fixture.nativeElement.querySelector('dialog.optimization-dialog');
    expect(previewDialog).not.toBeNull();
    expect(previewDialog.querySelector('.optimization-preview')).not.toBeNull();
    const previewMaterials = Array.from(
      previewDialog.querySelectorAll('.preview-material-row'),
    ) as HTMLElement[];
    expect(previewMaterials.length).toBeGreaterThan(0);
    const rawMaterialRow = previewMaterials.find((row) =>
      row.textContent?.includes('Matéria-prima'),
    );
    expect(rawMaterialRow?.querySelector('app-item-icon')?.getAttribute('title')).toContain(
      'Matéria-prima',
    );
    const previewSteps = previewDialog.querySelectorAll(
      '.preview-step-row',
    ) as NodeListOf<HTMLElement>;
    expect(previewSteps.length).toBeGreaterThan(0);
    expect(previewSteps[0].querySelector('app-item-icon')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.optimization-status')).not.toBeNull();
    tree.applyOptimizationPreview();
    expect(tree.currentProductionPlan()?.scenario).toBe('optimized');
    expect(tree.currentProductionPlan()?.sourceChoices).toEqual({ 8001: 'buy', 9001: 'produce' });
    expect(tree.materialSource(9001)).toBe('produce');
    tree.toggleMaterialSource(9001);
    expect(tree.materialSource(9001)).toBe('buy');
    expect(tree.acquisitionStrategy()).toBe('custom');
    fixture.destroy();
  });

  it('sends a confirmed gathering option even when the item also has a producer recipe', async () => {
    const posted: ProductionPlannerInput[] = [];
    vi.stubGlobal(
      'Worker',
      class {
        onmessage?: (event: { data: { result: ReturnType<typeof planProduction> } }) => void;
        terminate() {}
        postMessage(input: ProductionPlannerInput) {
          posted.push(input);
        }
      },
    );
    const rootRecipe: CatalogRecipe = { ...recipe, key: 'gather-or-produce-root' };
    const producer: CatalogRecipe = {
      ...recipe,
      key: 'make-salt',
      type: 'PROCESSING',
      inputs: [{ itemId: 8001, name: 'Matéria-prima', quantity: '1' }],
      outputs: [{ itemId: 9001, name: 'Sal', quantity: '1' }],
    };
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: rootRecipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    tree.recipeGraph.set({
      rootRecipe,
      producerRecipes: [producer],
      itemIds: [5301, 9001, 8001],
      issues: [],
      datasetVersion: 'dataset-v1',
    });
    tree.setGatherEstimate(9001, 4, 30);

    tree.optimizeAcquisition();
    fixture.detectChanges();

    expect(posted).toHaveLength(1);
    expect(
      fixture.nativeElement.querySelector('.optimization-status')?.getAttribute('aria-busy'),
    ).toBe('true');
    expect(
      fixture.nativeElement
        .querySelector('.optimization-status')
        ?.classList.contains('loading-state'),
    ).toBe(true);
    expect(posted[0]?.gatheringEstimates).toMatchObject({
      9001: {
        expectedYield: 4,
        craftSeconds: 30,
        origin: 'user-confirmed',
      },
    });
    fixture.destroy();
  });

  it('shows an item icon beside each material in gathering calibration', async () => {
    const mocks = providers();
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    tree.recipeGraph.set({
      rootRecipe: recipe,
      producerRecipes: [],
      itemIds: [5301, 9001],
      issues: [],
      datasetVersion: 'dataset-v1',
    } satisfies RecipeProductionGraph);
    fixture.detectChanges();

    const calibration = fixture.nativeElement.querySelector('.gather-calibration-row');
    expect(calibration.textContent).toContain('Sal');
    expect(calibration.querySelector('app-item-icon')?.getAttribute('title')).toContain('Sal');
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
        [
          9001,
          {
            itemId: 9001,
            subId: 0,
            name: 'Sal',
            price: '50',
            stock: 0,
            totalTrades: '0',
            minPrice: '40',
            maxPrice: '60',
            lastSoldPrice: '50',
            lastSoldAt: null,
          },
        ],
      ]),
    );
    tree.quoteObservedAt.set(
      new Map([
        [5301, observedAt],
        [9001, observedAt],
      ]),
    );
    fixture.detectChanges();

    const buttons = [...fixture.nativeElement.querySelectorAll('button')]
      .map((button: HTMLButtonElement) => button.textContent ?? '')
      .join(' ');
    const text = fixture.nativeElement.textContent ?? '';

    expect(buttons).not.toContain('Personalizado');
    expect(text).not.toContain('ESTOQUE ZERADO NO MERCADO');
    expect(text).not.toContain('única forma de obtenção');
    expect(fixture.nativeElement.querySelector('.production-policy')).toBeNull();
    expect(text).not.toContain('Pré-ordens');
    expect(tree.materialPrice(5301)).toEqual({ price: '1100', source: 'maximum' });
    expect(tree.materialPrice(9001)).toEqual({ price: '60', source: 'maximum' });
    expect(tree.productionInput()?.enforcePurchaseLimits).toBe(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.sidebar-price')?.textContent).toContain('Máxima');
    const sourceCheckbox = fixture.nativeElement.querySelector(
      '.material-source-checkbox input[type="checkbox"]',
    ) as HTMLInputElement;
    expect(sourceCheckbox).not.toBeNull();
    expect(sourceCheckbox.checked).toBe(false);
    sourceCheckbox.click();
    fixture.detectChanges();
    expect(tree.materialSource(9001)).toBe('buy');
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
  it('multiplies each ingredient by the requested recipe count without yield rounding extra operations', async () => {
    const multiInputRecipe: CatalogRecipe = {
      ...recipe,
      inputs: [
        { itemId: 9001, name: 'X', quantity: '1' },
        { itemId: 9002, name: 'Y', quantity: '2' },
        { itemId: 9003, name: 'Z', quantity: '1' },
      ],
    };
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: multiInputRecipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    tree.setRootYield(1.55);
    tree.setCraftCount(10);
    configureProduction(tree, { 5301: '1000', 9001: '10', 9002: '20', 9003: '30' });
    fixture.detectChanges();

    expect(tree.ingredientPreview()).toMatchObject({ operations: 10, produced: 15.5 });
    expect(tree.ingredientPreview()?.ingredients.map((ingredient) => ingredient.total)).toEqual([
      10, 20, 10,
    ]);
    expect(tree.plan()?.value?.tasks.find((task) => task.id === 'root')?.crafts).toBe(10);
    expect(
      tree
        .plannerMaterials()
        .sort((left, right) => left.itemId - right.itemId)
        .map(({ itemId, required }) => [itemId, required]),
    ).toEqual([
      [9001, 10],
      [9002, 20],
      [9003, 10],
    ]);
    const rows = [...fixture.nativeElement.querySelectorAll('.sidebar-material-row')];
    expect(rows).toHaveLength(3);
    expect(rows.map((row: Element) => row.textContent)).toEqual([
      expect.stringContaining('X'),
      expect.stringContaining('Y'),
      expect.stringContaining('Z'),
    ]);
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
      fixture.nativeElement.querySelector('.economic-metrics-grid .cost-value')?.textContent,
    ).toContain('Pendente');
    configureProduction(tree, { 5301: '1000', 9001: '5' });
    tree.setMethodTime('ALCHEMY', 1);
    fixture.detectChanges();
    expect(tree.advanced()).toBe(false);
    expect(
      fixture.nativeElement.querySelector('.economic-metrics-grid .cost-value')?.textContent,
    ).toContain('100');
    expect(
      fixture.nativeElement.querySelector('.economic-dashboard').closest('details'),
    ).toBeNull();
  });
  it('keeps contextual settings accessible without a global mode and preserves the graph', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.context-panel')).toBeNull();
    expect(element.querySelector('.stock-settings')).not.toBeNull();
    expect(element.querySelector('.root-yield input')).not.toBeNull();
    expect(element.querySelector('.mode-toggle')).toBeNull();
    const settings = element.querySelector('.stock-settings') as HTMLDetailsElement;
    tree.setRootYield(2);
    tree.setCraftCount(5);
    tree.excludedLocations.set(['storage:test']);
    tree.selectedPath.set('root/0');
    const root = tree.root();
    const graph = tree.graph()!;
    graph.pan.set({ x: -120, y: 35 });
    graph.zoom.set(0.7);
    graph.focus.set('root/0');
    settings.open = !settings.open;
    fixture.detectChanges();
    expect(element.querySelector('.stock-settings')).not.toBeNull();
    settings.open = !settings.open;
    fixture.detectChanges();
    expect(element.querySelector('.stock-settings')).not.toBeNull();
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
  it('opens a compact item card from the visual tree without opening the source workspace', async () => {
    const mocks = providers();
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const infoButton = fixture.nativeElement.querySelector('.node-details') as HTMLButtonElement;
    infoButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.quick-item-info')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.bottom-details-tray')).toBeNull();
    expect(fixture.componentInstance.detailsOpen()).toBe(false);
    expect(mocks.knowledge.item).toHaveBeenCalledWith(5301);
    expect(mocks.knowledge.sources).not.toHaveBeenCalled();
    expect(mocks.knowledge.produces).not.toHaveBeenCalled();
  });
  it('shows an accessible loading state while fetching only the item description', async () => {
    const mocks = providers();
    mocks.knowledge.item.mockReturnValue(NEVER);
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    (fixture.nativeElement.querySelector('.node-details') as HTMLButtonElement).click();
    fixture.detectChanges();

    const quickInfo = fixture.nativeElement.querySelector('.quick-item-info') as HTMLElement;
    expect(quickInfo.getAttribute('aria-busy')).toBe('true');
    expect(quickInfo.querySelector('[role="status"]')?.textContent).toContain('Consultando');
    expect(fixture.nativeElement.querySelector('.bottom-details-tray')).toBeNull();
    expect(mocks.knowledge.sources).not.toHaveBeenCalled();
  });
  it('closes the compact card and restores focus to its information trigger', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const trigger = fixture.nativeElement.querySelector('.node-details') as HTMLButtonElement;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.quick-info-close') as HTMLButtonElement).click();
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 1));

    expect(fixture.nativeElement.querySelector('.quick-item-info')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
  it('reserves an accessible skeleton while item details are loading', async () => {
    const mocks = providers();
    mocks.knowledge.item.mockReturnValue(NEVER);
    mocks.knowledge.sources.mockReturnValue(NEVER);
    mocks.knowledge.produces.mockReturnValue(NEVER);
    mocks.knowledge.uses.mockReturnValue(NEVER);
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    fixture.componentInstance.showContext(fixture.componentInstance.root()!);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.context-panel')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(
      fixture.nativeElement
        .querySelector('.recipe-item-details-loading')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(fixture.nativeElement.querySelector('.context-panel [role="status"]')).not.toBeNull();
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
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, [
      ...dependencies.list,
      { provide: IdentityService, useValue: { authenticated: signal(true) } },
    ]);
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
  it('saves gross external demand after optimization, including fully owned materials', async () => {
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, [
      ...providers().list,
      { provide: IdentityService, useValue: { authenticated: signal(true) } },
    ]);
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '5' });
    tree.setMethodTime('ALCHEMY', 1);
    tree.setCraftCount(100);
    tree.store.update((state) => ({
      ...state,
      familySilver: '1000000000',
      inventory: [
        {
          id: 'salt',
          region: 'sa',
          itemId: 9001,
          name: 'Sal',
          quantity: 60,
          target: 0,
          price: '0',
          location: 'Velia',
          kind: 'storage',
        },
      ],
    }));
    tree.optimizeAcquisition();
    tree.applyOptimizationPreview();
    expect(
      tree.currentProductionPlan()?.materials.find((row) => row.itemId === 9001),
    ).toMatchObject({ required: 200, bought: 140, owned: 60 });
    tree.saveShoppingList();
    expect(tree.store.data().personalPlans[0].materials).toEqual([
      { itemId: 9001, name: 'Sal', quantity: 200 },
    ]);
    tree.setCraftCount(10);
    tree.optimizeAcquisition();
    tree.applyOptimizationPreview();
    tree.saveShoppingList();
    expect(tree.store.data().personalPlans[0].materials).toEqual([
      { itemId: 9001, name: 'Sal', quantity: 20 },
    ]);
  });

  it('calculates profit margin against net revenue and leaves zero revenue undefined', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '5' });
    tree.setMethodTime('ALCHEMY', 1);
    tree.setCraftCount(100);
    const profit = Number(tree.profit());
    const revenue = Number(tree.netRevenue());
    expect(revenue).toBeGreaterThan(0);
    expect(tree.profitMargin()).toBeCloseTo((100 * profit) / revenue);
    vi.spyOn(tree, 'netRevenue').mockReturnValue('0');
    tree.setCraftCount(101);
    expect(tree.profitMargin()).toBeNull();
  });

  it('hides and blocks shopping-list persistence for signed-out visitors', async () => {
    const dependencies = providers();
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, [
      ...dependencies.list,
      { provide: IdentityService, useValue: { authenticated: signal(false) } },
    ]);
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '5' });
    tree.setMethodTime('ALCHEMY', 1);
    tree.setCraftCount(40);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.btn-save-shopping')).toBeNull();
    expect(fixture.nativeElement.querySelector('.footer-link[href="/shopping"]')).toBeNull();
    tree.saveShoppingList();
    expect(tree.store.data().personalPlans).toHaveLength(0);
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
    tree.view.set('tree');
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
    expect(tree.effectiveYield()).toBeCloseTo(2.829);
    expect(tree.plan()?.value).not.toBeNull();
    tree.recipeGraph.set({
      rootRecipe: recipe,
      producerRecipes: [],
      itemIds: [5301, 9001],
      issues: [],
      datasetVersion: 'dataset-v1',
    });
    tree.setRootYield(2.5);
    tree.setCraftCount(4);
    fixture.detectChanges();
    expect(tree.plan()?.value?.rows.find((r) => r.itemId === 9001)?.required).toBe(8);
    expect(fixture.nativeElement.querySelector('.btn-apply-default-yield')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Confirme o rendimento para calcular');
    expect(
      fixture.nativeElement.querySelector('.workspace-materials-sidebar')?.textContent,
    ).toContain('Sal');
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
    tree.setCraftCount(10);
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
    expect(Number(tree.grossRevenue())).toBeGreaterThan(100_000);
    expect(tree.netRevenue()).not.toBeNull();
    expect(tree.profit()).not.toBeNull();
    expect(tree.profitPerHour()).not.toBeNull();
    expect(tree.isPositiveProfit()).toBe(true);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.economic-dashboard')).toBeTruthy();
    const metricsGrid = el.querySelector('.economic-metrics-grid');
    expect(metricsGrid).toBeTruthy();
    expect(metricsGrid?.querySelectorAll(':scope > .metric-card')).toHaveLength(4);
    expect(el.querySelectorAll('.economic-summary-header button[hlmBtn]')).toHaveLength(3);
    expect(el.textContent).toContain('Resultado da receita');
    expect(el.textContent).toContain(
      'Preço de venda estimado: cotação com estoque; sem estoque, máxima quando informada ou preço-base de referência. A cotação não garante compra nem venda.',
    );
  });

  it.each([
    { skill: 'cooking', type: 'COOK' },
    { skill: 'alchemy', type: 'ALCHEMY' },
    { skill: 'processing', type: 'PROCESSING' },
  ] as const)(
    'recalculates sales and profit when the $skill mastery changes',
    async ({ skill, type }) => {
      const isBalenosMeal = type === 'COOK';
      const outputId = isBalenosMeal ? 9601 : 5301;
      const inputs = isBalenosMeal
        ? [
            { itemId: 9203, name: 'Meat', quantity: '1' },
            { itemId: 9213, name: 'Fish', quantity: '2' },
            { itemId: 9241, name: 'Vegetables', quantity: '2' },
            { itemId: 9404, name: 'Seasoning', quantity: '1' },
            { itemId: 9417, name: 'Cooking Wine', quantity: '1' },
          ]
        : [{ itemId: 9001, name: 'Salt', quantity: '1' }];
      const productionRecipe: CatalogRecipe = {
        key: `${skill}-finance`,
        type,
        station: null,
        inputs,
        outputs: [
          {
            itemId: outputId,
            name: isBalenosMeal ? 'Refeição de Balenos' : item.name,
            quantity: '1',
          },
        ],
      };
      const selectedItem =
        outputId === 9601
          ? ({ ...item, id: outputId, name: 'Refeição de Balenos' } as unknown as CatalogItemDetail)
          : item;
      const fixture = await renderComponent(
        RecipeTree,
        { recipe: productionRecipe, selectedItem },
        providers().list,
      );
      const tree = fixture.componentInstance;
      const prices: Record<number, string> = isBalenosMeal
        ? { 9601: '1000', 9203: '100', 9213: '100', 9241: '100', 9404: '100', 9417: '100' }
        : { 5301: '1000', 9001: '100' };
      configureProduction(tree, prices);
      tree.setCraftCount(isBalenosMeal ? 1000 : 10);
      tree.setMethodTime(type, isBalenosMeal ? 1.2 : 60);
      const masteryInput = fixture.nativeElement.querySelector(
        `input[aria-label="Maestria de ${skill === 'cooking' ? 'Culinária' : skill === 'alchemy' ? 'Alquimia' : 'Processamento'}"]`,
      ) as HTMLInputElement;
      masteryInput.value = '0';
      masteryInput.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(tree.masteryOverrides()[skill]).toBe(0);
      const baseline = {
        grossRevenue: tree.grossRevenue(),
        netRevenue: tree.netRevenue(),
        profit: tree.profit(),
        profitPerHour: tree.profitPerHour(),
      };

      masteryInput.value = '3000';
      masteryInput.dispatchEvent(new Event('input', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();
      const improved = {
        grossRevenue: tree.grossRevenue(),
        netRevenue: tree.netRevenue(),
        profit: tree.profit(),
        profitPerHour: tree.profitPerHour(),
      };

      expect(improved.grossRevenue).not.toBe(baseline.grossRevenue);
      expect(improved.netRevenue).not.toBe(baseline.netRevenue);
      expect(improved.profit).not.toBe(baseline.profit);
      expect(improved.profitPerHour).not.toBe(baseline.profitPerHour);
      fixture.destroy();
    },
  );
  it('keeps secondary production and tax controls in one collapsed recipe disclosure', async () => {
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const el: HTMLElement = fixture.nativeElement;
    const settings = el.querySelector('.production-options') as HTMLDetailsElement | null;

    expect(settings).not.toBeNull();
    expect(settings?.open).toBe(false);
    const masteryInput = el.querySelector('input[aria-label="Maestria de Alquimia"]');
    expect(masteryInput).not.toBeNull();
    expect(masteryInput?.closest('details')).toBeNull();
    expect(settings?.querySelector('.tax-config-panel')).toBeTruthy();
    expect(
      el.querySelector('.craft-count-card input[type="number"]')?.closest('.production-options'),
    ).toBeNull();
    expect(el.querySelector('.economic-dashboard .tax-config-panel')).toBeNull();
  });

  it('preserves production calculations in the compact market summary without rendering the graph', async () => {
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item, summaryOnly: true },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '100' });
    tree.setRootYield(2);
    tree.setCraftCount(50);
    tree.setMethodTime('ALCHEMY', 1.5);
    fixture.detectChanges();
    expect(Number(tree.grossRevenue())).toBeGreaterThan(100_000);
    expect(tree.profitPerHour()).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-recipe-graph')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.metric-card')).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll('.economic-summary-header button')).toHaveLength(
      3,
    );
    expect(
      [
        ...fixture.nativeElement.querySelectorAll('.economic-summary-header [role="group"] button'),
      ].map((button: HTMLButtonElement) => button.getAttribute('aria-pressed')),
    ).toEqual(['true', 'false', 'false']);
  });

  it('shows alchemy returns as sell-or-keep controls and recalculates revenue', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '100' });
    const sideProduct: CatalogRecipe = {
      key: 'special-elixir',
      type: 'ALCHEMY',
      station: null,
      byproductOfItemId: 5301,
      inputs: [],
      outputs: [{ itemId: 750, name: 'Elixir especial', quantity: null }],
    };
    tree.recipeGraph.update((graph) => ({
      ...graph!,
      returnRecipes: [sideProduct],
      itemIds: [...graph!.itemIds, 750],
    }));
    const sideQuote: MarketItemQuote = {
      itemId: 750,
      subId: 0,
      name: 'Elixir especial',
      price: '2000',
      stock: 1000,
      totalTrades: '100',
      minPrice: '2000',
      maxPrice: '2000',
      lastSoldPrice: '2000',
      lastSoldAt: new Date().toISOString(),
    };
    tree.marketQuotes.update((quotes) => new Map(quotes).set(750, sideQuote));
    tree.livePrices.update((prices) => new Map(prices).set(750, '2000'));
    tree.quoteObservedAt.update((observed) => new Map(observed).set(750, new Date().toISOString()));
    tree.masteryOverride.set(3000);
    tree.masteryInput.set(3000);
    tree.setCraftCount(100);
    fixture.detectChanges();

    const row = tree.returnedProductRows().find((product) => product.itemId === 750);
    expect(row).toMatchObject({
      name: 'Elixir especial',
      quantity: 30,
      sell: true,
    });
    expect(fixture.nativeElement.textContent).toContain('Retornos previstos');
    const beforeKeep = Number(tree.netRevenue());
    const checkbox = fixture.nativeElement.querySelector(
      '.returned-product-choice input',
    ) as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(tree.returnedProductRows().find((product) => product.itemId === 750)?.sell).toBe(false);
    expect(Number(tree.netRevenue())).toBeLessThan(beforeKeep);
    expect(fixture.nativeElement.textContent).toContain('guardado');
    fixture.destroy();
  });

  it('does not present partial material prices as definitive profit or an optimal combination', async () => {
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000' });
    tree.setRootYield(1);
    tree.setCraftCount(100);
    tree.setMethodTime('ALCHEMY', 1);
    fixture.detectChanges();

    expect(tree.currentProductionPlan()?.issues.length).toBeGreaterThan(0);
    expect(tree.effectiveMaterialCost()).toBeNull();
    expect(tree.profit()).toBeNull();
    expect(tree.profitPerHour()).toBeNull();
    tree.optimizeAcquisition();
    expect(tree.acquisitionStrategy()).toBe('buy_all');
    expect(tree.optimizationMessage()).toContain('dados');
    fixture.destroy();
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

  it('offers one semantic details action per visible material', async () => {
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '5' });
    fixture.detectChanges();

    const row: Element | null = fixture.nativeElement.querySelector('.sidebar-material-row');
    expect(row).not.toBeNull();
    expect(row!.querySelectorAll('button')).toHaveLength(1);
    expect(row!.querySelector('[role="button"]')).toBeNull();
    fixture.destroy();
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
    expect(tree.effectiveYield()).toBeCloseTo(2.829);
    expect(tree.plan()?.value).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.btn-apply-default-yield')).toBeNull();
  });

  it('recalculates gross revenue and profit when cooking mastery changes from 1000 to 3000', async () => {
    const cookingRecipe: CatalogRecipe = { ...recipe, type: 'COOK' };
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      { recipe: cookingRecipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '100' });
    tree.setCraftCount(100);
    tree.masteryOverride.set(1000);
    fixture.detectChanges();
    const yieldAt1000 = tree.effectiveYield() ?? 0;
    const initialRevenue = BigInt(tree.grossRevenue() ?? '0');
    const initialProfit = BigInt(tree.profit() ?? '0');

    expect(yieldAt1000).toBeCloseTo(2.767, 2);

    tree.masteryOverride.set(3000);
    fixture.detectChanges();

    const yieldAt3000 = tree.effectiveYield() ?? 0;
    expect(yieldAt3000).toBeCloseTo(3.65, 2);
    expect(yieldAt3000).toBeGreaterThan(yieldAt1000);
    expect(BigInt(tree.grossRevenue() ?? '0')).toBeGreaterThan(initialRevenue);
    expect(BigInt(tree.profit() ?? '0')).toBeGreaterThan(initialProfit);
    fixture.destroy();
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

    // Base materials remain purchases until gathering is explicitly calibrated.
    tree.setAcquisitionStrategy('gather_all');
    fixture.detectChanges();
    expect(tree.materialSource(9001)).toBe('buy');
    expect(tree.effectiveMaterialCost()).toBe(baseCost);
    tree.setGatherEstimate(9001, 200, 10);
    tree.setAcquisitionStrategy('gather_all');
    fixture.detectChanges();
    expect(tree.effectiveMaterialCost()).toBe('0');
    expect(tree.profit()).toBe(tree.netRevenue());
    expect(tree.profitMargin()).toBe(100);

    // The per-item checkbox reverses the bulk selection.
    tree.toggleMaterialSource(9001);
    expect(tree.materialSource(9001)).toBe('buy');
    expect(tree.effectiveMaterialCost()).toBe(baseCost);
  });

  it('re-evaluates bulk production choices when the recipe graph finishes loading', async () => {
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;

    // This is what happens when the user clicks "Fazer / coletar tudo" while
    // the page is still loading the reachable recipes.
    tree.recipeGraph.set(null);
    tree.setAcquisitionStrategy('gather_all');
    expect(tree.materialSource(9001)).toBe('buy');

    const producer: CatalogRecipe = {
      key: 'salt-producer',
      type: 'COOK',
      station: null,
      inputs: [{ itemId: 9002, name: 'Sal bruto', quantity: '1' }],
      outputs: [{ itemId: 9001, name: 'Sal', quantity: '1' }],
    };
    tree.recipeGraph.set({
      rootRecipe: recipe,
      producerRecipes: [producer],
      itemIds: [5301, 9001, 9002],
      issues: [],
      datasetVersion: 'dataset-v1',
    });
    fixture.detectChanges();

    expect(tree.materialSource(9001)).toBe('produce');
    expect(tree.materialSource(9002)).toBe('buy');
    fixture.destroy();
  });

  it('keeps sale profitability independent from final product market stock', async () => {
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

    const initialProfit = tree.profit();
    expect(initialProfit).not.toBeNull();

    // When material price is very high: Sal = 800 -> craft cost 1600 > market price 1000
    tree.livePrices.update((p) => new Map(p).set(9001, '800'));
    tree.marketQuotes.update((q) => new Map(q).set(9001, { ...q.get(9001)!, price: '800' }));
    fixture.detectChanges();
    const higherCostProfit = tree.profit();
    expect(higherCostProfit).not.toBeNull();
    expect(BigInt(higherCostProfit!)).toBeLessThan(BigInt(initialProfit!));

    // Zero stock does not turn a sale analysis into a recommendation about obtaining the item.
    tree.marketQuotes.update((q) => new Map(q).set(5301, { ...q.get(5301)!, stock: 0 }));
    fixture.detectChanges();
    expect(tree.netRevenue()).not.toBeNull();
    expect(tree.profit()).toBe(higherCostProfit);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.economic-dashboard')).toBeTruthy();
    expect(el.textContent).not.toContain('ESTOQUE ZERADO NO MERCADO');
    expect(el.textContent).not.toContain('Produzir é a única forma de obtenção imediata');
  });
});

it('recursive optimizer previews and applies root and intermediate formulas together', async () => {
  const fixture = await renderComponent(
    RecipeTree,
    { recipe, selectedItem: item },
    providers().list,
  );
  const tree = fixture.componentInstance;
  configureProduction(tree, { 5301: '1000', 9001: '400', 8001: '1' });
  const alternate: CatalogRecipe = {
    ...recipe,
    key: 'alternate-root',
    outputs: [{ ...recipe.outputs[0], quantity: '10' }],
  };
  const nested: CatalogRecipe = {
    key: 'alternate-salt',
    type: 'HEAT',
    station: null,
    inputs: [{ itemId: 8001, name: 'Pedra', quantity: '1' }],
    outputs: [{ itemId: 9001, name: 'Sal', quantity: '100' }],
  };
  tree.recipeGraph.update((graph) => ({
    ...graph!,
    rootAlternatives: [recipe, alternate],
    producerRecipes: [nested],
    producerAlternativesByItemId: new Map([[9001, [nested]]]),
    itemIds: [5301, 9001, 8001],
  }));
  tree.setMethodTime('ALCHEMY', 10);
  tree.setMethodTime('HEAT', 0.01);
  fixture.detectChanges();
  tree.optimizeAcquisition();
  fixture.detectChanges();
  expect(tree.root()?.recipe?.key).toBe(recipe.key);
  expect(tree.previewPlan()?.recipeChoices).toEqual({
    5301: 'alternate-root',
    9001: 'alternate-salt',
  });
  expect(fixture.nativeElement.textContent).toContain('Ótimo certificado');
  expect(fixture.nativeElement.querySelector('.preview-recipe-choice')?.textContent).toContain(
    item.name,
  );
  tree.applyOptimizationPreview();
  fixture.detectChanges();
  expect(tree.root()?.recipe?.key).toBe('alternate-root');
  expect(tree.root()?.children[0]?.recipe?.key).toBe('alternate-salt');
  expect(tree.currentProductionPlan()?.recipeChoices?.[5301]).toBe('alternate-root');
  expect(tree.materialSource(9001)).toBe('produce');
  fixture.destroy();
});

it('recursive optimizer keeps a missing-data best found visibly uncertified and discard leaves formulas unchanged', async () => {
  const fixture = await renderComponent(
    RecipeTree,
    { recipe, selectedItem: item },
    providers().list,
  );
  const tree = fixture.componentInstance;
  configureProduction(tree, { 5301: '1000', 9001: '10' });
  tree.recipeGraph.update((graph) => ({
    ...graph!,
    rootAlternatives: [recipe],
    producerAlternativesByItemId: new Map(),
    issues: [{ itemId: 9001, code: 'incomplete-recipes' }],
  }));
  tree.optimizeAcquisition();
  fixture.detectChanges();
  expect(tree.previewPlan()).not.toBeNull();
  expect(fixture.nativeElement.textContent).toContain('ótimo não certificado');
  expect(fixture.nativeElement.textContent).toContain('Dados necessários ainda não confirmados');
  tree.discardOptimizationPreview();
  expect(tree.root()?.recipe?.key).toBe(recipe.key);
  expect(tree.acquisitionStrategy()).toBe('buy_all');
  fixture.destroy();
});

it('keeps fractional expected production, a single quantity name, and default time provenance', async () => {
  const balenos = {
    ...recipe,
    type: 'COOK',
    outputs: [{ itemId: 9601, name: 'Refeição de Balenos', quantity: '1' }],
  };
  const fixture = await renderComponent(
    RecipeTree,
    { recipe: balenos, primaryHeading: true },
    providers().list,
  );
  const tree = fixture.componentInstance;
  tree.setCraftCount(100);
  tree.recipeGraph.set({
    rootRecipe: balenos,
    producerRecipes: [],
    itemIds: [9601, 9001],
    issues: [],
    datasetVersion: 'v1',
  });
  fixture.detectChanges();
  expect(tree.formattedProducedQuantity()).toBe('276,7');
  expect(tree.productionInput()?.estimates[balenos.key].source).toBe('default');
  expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Balenos');
  const input = fixture.nativeElement.querySelector('.craft-count-input');
  expect(input.getAttribute('aria-label')).toBe('Quantia de receitas');
  fixture.destroy();
});

it.each(['quotes', 'mastery', 'tax', 'operations', 'returns'] as const)(
  'ignores late recursive worker results after %s changes',
  async (changed) => {
    const workers: {
      onmessage?: (event: { data: { result: ReturnType<typeof planProduction> } }) => void;
      terminate: ReturnType<typeof vi.fn>;
    }[] = [];
    let posted: ProductionPlannerInput | undefined;
    vi.stubGlobal(
      'Worker',
      class {
        onmessage?: (event: { data: { result: ReturnType<typeof planProduction> } }) => void;
        terminate = vi.fn();
        constructor() {
          workers.push(this);
        }
        postMessage(input: ProductionPlannerInput) {
          posted = input;
        }
      },
    );
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    configureProduction(tree, { 5301: '1000', 9001: '10' });
    tree.recipeGraph.update((graph) => ({
      ...graph!,
      rootAlternatives: [recipe],
      producerAlternativesByItemId: new Map(),
    }));
    tree.optimizeAcquisition();
    expect(posted).toBeDefined();
    if (changed === 'quotes')
      tree.marketQuotes.update(
        (quotes) =>
          new Map(
            [...quotes].map(([id, quote]) => [id, { ...quote, price: '999', maxPrice: '999' }]),
          ),
      );
    if (changed === 'mastery') tree.setMasteryForSkill('alchemy', 2000);
    if (changed === 'tax')
      tree.store.update((workspace) => ({
        ...workspace,
        taxOptions: { ...workspace.taxOptions, valuePack: !workspace.taxOptions.valuePack },
      }));
    if (changed === 'operations') tree.setCraftCount(42);
    if (changed === 'returns') tree.setReturnProductSale(5301, false);
    workers[0].onmessage!({ data: { result: planProduction(posted!) } });
    expect(tree.optimizationPreview()).toBeNull();
    expect(workers[0].terminate).toHaveBeenCalled();
    fixture.destroy();
  },
);

it('explains limited optimization with recipe names and unique item-specific issues', async () => {
  const fixture = await renderComponent(
    RecipeTree,
    { recipe, selectedItem: item },
    providers().list,
  );
  const tree = fixture.componentInstance;
  configureProduction(tree, { 5301: '1000', 9001: '10' });
  const formulaHash = 'a'.repeat(64);
  const catalogHash = 'b'.repeat(64);
  const namedRecipe = { ...recipe, key: formulaHash };
  tree.recipeGraph.update((graph) => ({
    ...graph!,
    rootRecipe: namedRecipe,
    rootAlternatives: [namedRecipe],
    producerAlternativesByItemId: new Map(),
  }));
  const base = planProduction(tree.productionInput()!);
  const bestFound = {
    ...base.ranked[0],
    recipeId: formulaHash,
    scenario: 'optimized' as const,
    recipeChoices: { 5301: formulaHash },
    sourceChoices: { 9001: 'buy' as const },
  };
  tree.optimizationPreview.set({
    ...base,
    optimization: {
      best: null,
      bestFound,
      complete: false,
      reason: 'state-limit',
      rootRecipesTotal: 2,
      rootRecipesEvaluated: 1,
      recursiveRecipesEvaluated: 3,
      statesVisited: 10000,
      statesPruned: 0,
      catalogVersion: catalogHash,
      incompleteAlternatives: Array.from({ length: 13 }, () => ({
        itemId: 5301,
        recipeId: formulaHash,
        issues: [
          { itemId: 9001, code: 'missing-quote' as const, message: 'Informe o preço unitário.' },
        ],
      })),
    },
  });
  fixture.detectChanges();
  const preview = fixture.nativeElement.querySelector('.optimization-preview') as HTMLElement;
  expect(preview.textContent).toContain('Limite de busca atingido');
  expect(preview.textContent).toContain(item.name);
  expect(preview.textContent).not.toContain(formulaHash);
  expect(preview.textContent).not.toContain(catalogHash);
  expect(preview.textContent).not.toContain('state-limit');
  const issues = preview.querySelectorAll('.preview-data-issue');
  expect(issues).toHaveLength(1);
  expect(issues[0].textContent).toContain('Sal');
  expect(issues[0].textContent).toContain('Informe o preço unitário.');
  expect(preview.querySelector('.preview-coverage')?.textContent).toContain('10000');
  fixture.destroy();
});

it('displays step action badge, required quantity, stock used, and missing status in expandable steps', async () => {
  const fixture = await renderComponent(
    RecipeTree,
    { recipe, selectedItem: item },
    providers().list,
  );
  const tree = fixture.componentInstance;
  configureProduction(tree, { 5301: '1000', 9001: '100' });
  tree.store.update((workspace) => ({
    ...workspace,
    inventory: [
      {
        id: 'stock-9001',
        itemId: 9001,
        name: 'Sal',
        quantity: 6,
        target: 0,
        price: '0',
        location: 'Velia',
        kind: 'storage',
        region: 'sa',
        updatedAt: new Date().toISOString(),
      },
    ],
  }));
  tree.setCraftCount(10);
  tree.view.set('tree');
  fixture.detectChanges();

  const branches = [
    ...fixture.nativeElement.querySelectorAll('app-recipe-branch'),
  ] as HTMLElement[];
  expect(branches.length).toBeGreaterThanOrEqual(2);

  const rootBadge = branches[0]?.querySelector('.step-action-badge');
  expect(rootBadge?.textContent?.trim()).toBe('Alquimia');
  expect(rootBadge?.getAttribute('data-kind')).toBe('produce');

  const childBranch = branches[1]!;
  const childBadge = childBranch.querySelector('.step-action-badge');
  expect(childBadge?.textContent?.trim()).toBe('Obter pronto');
  expect(childBadge?.getAttribute('data-kind')).toBe('acquire');
  expect(childBranch.querySelector('.step-quantity strong')?.textContent?.trim()).toBe('20');
  expect(childBranch.querySelector('.step-stock-used')?.textContent?.trim()).toBe('Estoque: 6');
  expect(childBranch.querySelector('.step-stock')?.textContent?.trim()).toBe('Faltam 14');
  fixture.destroy();
});
