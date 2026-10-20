import { characterSchema, type ProductionIssue, type ProductionPlan } from '@bdo/calculators';
import type { ProductionCatalogResponse } from '@bdo/shared';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { CatalogApiService } from '../../core/catalog-api.service';
import { MarketCacheService } from '../../core/market-cache.service';
import { ProductionApi } from '../../core/production-api';
import { defaultRecipeMethodSeconds } from '../../shared/recipe-tree/recipe-production-adapter';
import { renderComponent as renderRawComponent, useMemoryStorage } from '../../testing/test-setup';
import {
  canRequestProductionQuote,
  hasNpcPurchaseEvidence,
  isEligibleLifeSkillRecipe,
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
const completePlan = (recipeId = 'elixir'): ProductionPlan => ({
  recipeId,
  name: 'Elixir de teste',
  scenario: 'buy-all',
  crafts: 1,
  output: 1,
  seconds: 60,
  durationMilliseconds: '60000',
  cashCost: '100',
  economicCost: '100',
  grossRevenue: '200',
  netRevenue: '180',
  profit: '80',
  profitPerHour: '4800',
  peakWeight: 0.1,
  issues: [],
  assumptions: [],
  materials: [],
  returns: [],
  steps: [],
});
const api = () => ({
  catalog: vi.fn(() => of(snapshot)),
  quotes: vi.fn(() => throwError(() => new Error('off'))),
});
async function renderComponent<T>(
  component: Parameters<typeof renderRawComponent<T>>[0],
  inputs: Record<string, unknown> = {},
  providers: Parameters<typeof renderRawComponent<T>>[2] = [],
) {
  return renderRawComponent(component, inputs, [
    {
      provide: MarketCacheService,
      useValue: {
        resolveProductionQuotes: vi.fn(() => of(new Map())),
        getCachedQuoteEntry: vi.fn(() => null),
      },
    },
    ...providers,
  ]);
}
describe('production recommendations', () => {
  useMemoryStorage();
  it('embeds production without another page heading or navigation', async () => {
    const fixture = await renderComponent(RecommendationsPage, { embedded: true }, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('main')).toBeNull();
    expect(element.querySelector('.tool-page')).toBeNull();
    expect(element.querySelector('app-life-skills-hub-nav')).toBeNull();
    expect(element.querySelector('.coach-page')).not.toBeNull();
  });
  it('labels cumulative negotiations without inventing stock or guaranteeing sales', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    vi.spyOn(page, 'producersName').mockReturnValue(2);
    page.quotes.set({
      2: {
        unitPrice: '100',
        available: null,
        observedAt: new Date().toISOString(),
        source: 'market',
        totalTrades: '9007199254740993',
      },
    });
    expect(page.tradeVolumeLabel('elixir')).toContain(
      '9.007.199.254.740.993 negociações acumuladas',
    );
    expect(page.tradeVolumeLabel('elixir')).toContain('Estoque não informado');
    expect(fixture.nativeElement.textContent).not.toContain('Garantir volume de venda');
  });
  it('resolves names and icons in one catalogue pass, preserving first matches and snapshot changes', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
      {
        provide: CatalogApiService,
        useValue: { resolveIconUrl: (item: { icon: string | null }) => item.icon },
      },
    ]);
    const page = fixture.componentInstance;
    let reads = 0;
    const items = Array.from({ length: 100 }, (_, index) => {
      const item = {
        ...snapshot.items[0],
        id: index + 1,
        name: `Name ${index + 1}`,
        icon: `icon-${index + 1}`,
      };
      return {
        ...item,
        get id() {
          reads++;
          return item.id;
        },
      };
    });
    items.push({ ...snapshot.items[0], id: 100, name: 'Duplicate', icon: 'duplicate' });
    page.snapshot.set({ ...snapshot, items });
    for (let repeat = 0; repeat < 10; repeat++) {
      expect(page.name(100)).toBe('Name 100');
      expect(page.icon(100)).toBe('icon-100');
      expect(page.name(999)).toBe('Item 999');
      expect(page.icon(999)).toBeNull();
    }
    expect(reads).toBeLessThanOrEqual(2 * items.length);
    page.snapshot.set({
      ...snapshot,
      items: [{ ...snapshot.items[0], id: 100, name: 'New name', icon: 'new-icon' }],
    });
    expect(page.name(100)).toBe('New name');
    expect(page.icon(100)).toBe('new-icon');
    page.snapshot.set(null);
    expect(page.name(100)).toBe('Item 100');
    expect(page.icon(100)).toBeNull();
  });
  it('loads the catalogue automatically and presents recommendations without manual action buttons', async () => {
    const production = api();
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: production },
    ]);

    expect(production.catalog).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.snapshot()).toEqual(snapshot);
    expect(fixture.nativeElement.textContent).toContain('Faça prata com suas Life Skills');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Carregar catálogo');
    expect(fixture.nativeElement.textContent).not.toContain('Consultar mercado');
    expect(fixture.nativeElement.textContent).not.toContain('Comparar lucro por hora');
  });

  it('links the shared sessions tab to the public Life Skills URL', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const links = Array.from(
      fixture.nativeElement.querySelectorAll(
        'nav[aria-label="Navegação de Life Skills e recomendações"] a',
      ),
    ) as HTMLAnchorElement[];

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/lifeskills?tab=production',
      '/lifeskills?tab=sessions',
    ]);
    expect(links.filter((link) => link.getAttribute('aria-current') === 'page')).toHaveLength(1);
    expect(links[0].getAttribute('aria-current')).toBe('page');
  });

  it('emphasizes the leading complete opportunity but not incomplete scenarios', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    vi.spyOn(page, 'compare').mockResolvedValue();
    const player = characterSchema.parse({ id: 'main', name: 'Main', region: 'sa' });
    page.store.update((state) => ({
      ...state,
      region: 'sa',
      characters: [player],
      activeCharacterId: player.id,
    }));
    fixture.detectChanges();
    page.plans.set({
      ranked: [
        {
          ...completePlan(),
          materials: [{ itemId: 1, required: 2, owned: 0, bought: 2, produced: 0, substituted: 0 }],
        },
      ],
      incomplete: [],
    });
    fixture.detectChanges();

    expect(page.profile()).not.toBeNull();
    expect(page.topPlans()).toHaveLength(1);
    expect(fixture.nativeElement.querySelector('.opportunity-leading')).not.toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('.opportunity-title app-item-icon')
        ?.getAttribute('title'),
    ).toContain('Elixir de teste');
    expect(
      fixture.nativeElement.querySelector('.material-line app-item-icon')?.getAttribute('title'),
    ).toContain('Material');
    expect(
      fixture.nativeElement.querySelector('.opportunity-leading-label')?.textContent,
    ).toContain('Maior lucro líquido por hora');

    page.plans.set({
      ranked: [],
      incomplete: [
        {
          ...completePlan(),
          scenario: 'produce-all',
          output: null,
          seconds: null,
          durationMilliseconds: null,
          cashCost: null,
          economicCost: null,
          grossRevenue: null,
          netRevenue: null,
          profit: null,
          profitPerHour: null,
          issues: [{ code: 'missing-time', message: 'Sem tempo medido.' }],
        },
      ],
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.opportunity-leading')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pending-section')).not.toBeNull();
  });
  it('shows an accessible reserved skeleton while the first catalogue is loading', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    page.snapshot.set(null);
    page.busy.set(true);
    fixture.detectChanges();

    const loading = fixture.nativeElement.querySelector('.coach-loading-skeleton');
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.textContent).toContain('Carregando catálogo');

    page.snapshot.set(snapshot);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.recommendations-section')?.getAttribute('aria-busy'),
    ).toBe('true');
  });
  it('waits for a character before fetching market quotes, then loads them automatically', async () => {
    const resolveProductionQuotes = vi.fn(() => of(new Map()));
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
      {
        provide: MarketCacheService,
        useValue: { resolveProductionQuotes, getCachedQuoteEntry: () => null },
      },
    ]);
    const page = fixture.componentInstance;
    await fixture.whenStable();

    expect(page.snapshot()).toEqual(snapshot);
    expect(resolveProductionQuotes).not.toHaveBeenCalled();

    page.store.update((state) => ({
      ...state,
      characters: [characterSchema.parse({ id: 'main', name: 'Main', region: 'sa' })],
      activeCharacterId: 'main',
    }));
    await page.load();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(resolveProductionQuotes).toHaveBeenCalled();
  });
  it('groups shared pending inputs and paginates unique fixes rather than repeated scenarios', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    const plan = (
      recipeId: string,
      scenario: ProductionPlan['scenario'],
      issues: ProductionIssue[],
    ): ProductionPlan => ({
      recipeId,
      name: recipeId,
      scenario,
      crafts: 1,
      output: null,
      seconds: null,
      durationMilliseconds: null,
      cashCost: null,
      economicCost: null,
      grossRevenue: null,
      netRevenue: null,
      profit: null,
      profitPerHour: null,
      peakWeight: null,
      issues,
      assumptions: [],
      materials: [],
      returns: [],
      steps: [],
    });
    const sharedQuoteIssue: ProductionIssue = {
      code: 'missing-quote',
      message: 'Sem preço',
      itemId: 1,
    };
    const sharedTimeIssue: ProductionIssue = { code: 'missing-time', message: 'Sem tempo' };
    page.plans.set({
      ranked: [],
      incomplete: [
        plan('elixir', 'buy-all', [sharedQuoteIssue, sharedTimeIssue]),
        plan('elixir', 'produce-all', [sharedQuoteIssue, sharedTimeIssue]),
        ...Array.from({ length: 35 }, (_, index) =>
          plan(`recipe-${index}`, 'buy-all', [
            { code: 'missing-quote', message: 'Sem preço', itemId: index + 10 },
          ]),
        ),
      ],
    });

    expect(page.pendingActions().find((row) => row.key === 'item:1')).toMatchObject({
      affectedRecipes: 1,
      affectedScenarios: 2,
    });
    expect(
      page.pendingActions().find((row) => row.key === 'missing-time:method:ALCHEMY'),
    ).toMatchObject({
      affectedRecipes: 1,
      affectedScenarios: 2,
    });
    expect(page.pendingActions()).toHaveLength(37);
    expect(page.visibleIncomplete()).toHaveLength(30);

    page.pendingPage.set(2);
    expect(page.visibleIncomplete()).toHaveLength(7);
  });
  it('persists activity preferences and time calibration by character', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    const player = characterSchema.parse({ id: 'main', name: 'Main', region: 'sa' });
    page.store.update((state) => ({
      ...state,
      characters: [player],
      activeCharacterId: player.id,
    }));
    page.toggleSkill('alchemy', true);
    page.calibration['ALCHEMY'] = { seconds: 4.5 };
    page.saveCalibration('ALCHEMY');

    expect(page.store.data().activityCoach.preferredSkills).toContain('alchemy');
    expect(page.store.data().activityCoach.calibrations).toEqual([
      expect.objectContaining({ characterId: 'main', method: 'ALCHEMY', seconds: 4.5 }),
    ]);
  });
  it('recalculates after workspace context changes without a manual compare action', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    const compare = vi.spyOn(page, 'compare').mockResolvedValue();

    page.store.update((state) => ({
      ...state,
      characters: [characterSchema.parse({ id: 'main', name: 'Main', region: 'sa' })],
      activeCharacterId: 'main',
    }));
    await page.load();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(compare).toHaveBeenCalled();
  });
  it('debounces manual price edits and recalculates the recommendation', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    const compare = vi.spyOn(page, 'compare').mockResolvedValue();
    vi.useFakeTimers();
    try {
      page.manualPrice(1, '50');
      expect(compare).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(500);
      expect(compare).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
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
    page.store.update((state) => ({ ...state, activeCharacterId: profile.id }));
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
    expect(
      recommendationMarketQuote({ ...base, stock: 0, maxPrice: null }, observedAt),
    ).toMatchObject({ unitPrice: '50', available: 0, basis: 'reference' });
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
    expect(
      page.visibleIncomplete().some((row) => row.focusedRecipe && row.name === 'Item 41'),
    ).toBe(true);
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
  it('keeps failed market queries pending and retains manual prices without fabricated freshness', async () => {
    const service = api();
    const cache = { resolveProductionQuotes: () => throwError(() => new Error('off')) };
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: service },
      { provide: MarketCacheService, useValue: cache },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [characterSchema.parse({ id: 'main', name: 'Main', region: 'sa' })],
      activeCharacterId: 'main',
    }));
    await page.load();
    page.manualPrice(1, '99');
    await page.refreshQuotes();
    expect(page.resumable).toBe(true);
    expect(page.progress()).toEqual({ done: 0, total: 2 });
    expect(page.quotes()[1].source).toBe('manual');
    expect(page.message()).toContain('Parte das cotações');
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

  it('filters out costumes, armor, weapons, accessories, and non-life-skill items while keeping cooking and alchemy', () => {
    const baseRecipe = {
      key: 'test',
      type: 'COOKING',
      station: null,
      inputs: [{ itemId: 1, name: 'Material', quantity: '1' }],
      outputs: [{ itemId: 2, name: 'Output', quantity: '1' }],
    };
    const makeItem = (overrides: Partial<ProductionCatalogResponse['items'][number]> = {}) => ({
      id: 2,
      name: 'Refeição de Valência',
      description: null,
      grade: '3',
      category: 'Cook',
      icon: null,
      weight: '0.1',
      categories: [],
      sourceData: { marketable: true, maxEnhance: 0 },
      ...overrides,
    });
    const mapFor = (item: ReturnType<typeof makeItem>) => new Map([[2, item]]);

    expect(isEligibleLifeSkillRecipe(baseRecipe, mapFor(makeItem()))).toBe(true);
    expect(canRequestProductionQuote(makeItem({ category: 'Cook' }))).toBe(true);
    expect(canRequestProductionQuote(makeItem({ category: 'Mine' }))).toBe(true);
    expect(canRequestProductionQuote(makeItem({ category: 'Leather' }))).toBe(true);

    // Exclude costumes, armor, weapons, crystals, and enhanceable gear
    expect(
      isEligibleLifeSkillRecipe(
        { ...baseRecipe, type: 'MANUFACTURE' },
        mapFor(makeItem({ name: '[Traje] Armadura de Karlstein', category: 'Costume' })),
      ),
    ).toBe(false);
    expect(
      isEligibleLifeSkillRecipe(
        { ...baseRecipe, type: 'MANUFACTURE' },
        mapFor(makeItem({ name: 'Armadura do Deus Morto', category: 'Armor' })),
      ),
    ).toBe(false);
    expect(
      isEligibleLifeSkillRecipe(
        { ...baseRecipe, type: 'MANUFACTURE' },
        mapFor(
          makeItem({
            name: 'Espada Longa de Kzarka',
            sourceData: { marketable: true, maxEnhance: 20 },
          }),
        ),
      ),
    ).toBe(false);
  });

  it('keeps secondary professions in the production chain without recommending unrelated activities', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    vi.spyOn(page, 'compare').mockResolvedValue();
    page.snapshot.set({
      ...snapshot,
      recipes: [
        ...snapshot.recipes,
        {
          key: 'dish',
          type: 'COOK',
          station: null,
          inputs: [{ itemId: 2, name: 'Elixir de teste', quantity: '1' }],
          outputs: [{ itemId: 3, name: 'Prato', quantity: '1' }],
        },
        {
          key: 'unrelated',
          type: 'DRY',
          station: null,
          inputs: [{ itemId: 5, name: 'Outro material', quantity: '1' }],
          outputs: [{ itemId: 4, name: 'Outro produto', quantity: '1' }],
        },
      ],
      items: [1, 2, 3, 4, 5].map((id) => ({ ...snapshot.items[0], id })),
    });
    page.store.update((state) => ({
      ...state,
      activityCoach: { ...state.activityCoach, preferredSkills: ['cooking'] },
    }));
    expect(page.candidates().map((row) => row.id)).toEqual(['dish']);
    expect(page.recipes().some((row) => row.id === 'elixir')).toBe(true);
    expect(
      page
        .materialItems()
        .map((item) => item.id)
        .sort(),
    ).toEqual([1, 2, 3]);
  });

  it('follows the active character and restores that character method calibration', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    vi.spyOn(page, 'compare').mockResolvedValue();
    page.store.update((state) => ({
      ...state,
      characters: ['first', 'second'].map((id) =>
        characterSchema.parse({ id, name: id, region: 'sa' }),
      ),
      activeCharacterId: 'first',
      activityCoach: {
        ...state.activityCoach,
        calibrations: [
          {
            characterId: 'first',
            method: 'ALCHEMY',
            seconds: 3,
            updatedAt: new Date().toISOString(),
          },
          {
            characterId: 'second',
            method: 'ALCHEMY',
            seconds: 7,
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    }));
    await page.load();
    page.selectProfile('first');
    fixture.detectChanges();
    await fixture.whenStable();
    page.store.update((state) => ({ ...state, activeCharacterId: 'second' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.profile()?.id).toBe('second');
    expect(page.calibration['ALCHEMY'].seconds).toBe(7);
    page.store.update((state) => ({
      ...state,
      activityCoach: {
        ...state.activityCoach,
        calibrations: state.activityCoach.calibrations.map((row) =>
          row.characterId === 'second' ? { ...row, seconds: 9 } : row,
        ),
      },
    }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(page.calibration['ALCHEMY'].seconds).toBe(9);
  });

  it('changes the leading product when the active character cooking mastery changes', async () => {
    const catalog: ProductionCatalogResponse = {
      ...snapshot,
      recipes: [
        ...snapshot.recipes,
        {
          key: 'dish',
          type: 'COOK',
          station: null,
          inputs: [{ itemId: 1, name: 'Material', quantity: '2' }],
          outputs: [{ itemId: 3, name: 'Prato', quantity: '1' }],
        },
      ],
      items: [...snapshot.items, { ...snapshot.items[1], id: 3, name: 'Prato' }],
    };
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: { ...api(), catalog: () => of(catalog) } },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'main',
          name: 'Main',
          region: 'sa',
          silver: '100000',
          activeMinutes: 1,
          weightLimit: 100,
          mastery: {
            ...characterSchema.parse({ id: 'defaults', name: 'Defaults', region: 'sa' }).mastery,
            cooking: 0,
            alchemy: 3000,
            processing: 0,
          },
        }),
      ],
      activeCharacterId: 'main',
    }));
    await page.load();
    page.quotes.set(
      Object.fromEntries(
        [1, 2, 3].map((id) => [
          id,
          {
            unitPrice: id === 1 ? '10' : '100',
            available: null,
            source: 'manual' as const,
            observedAt: new Date().toISOString(),
          },
        ]),
      ),
    );
    await page.compare();
    expect(page.topPlans()[0]?.recipeId).toBe('elixir');
    page.updateMastery('cooking', 3000);
    await page.compare();
    expect(page.topPlans()[0]?.recipeId).toBe('dish');
  });

  it('automatically compares again when the recipe search changes', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    const compare = vi.spyOn(page, 'compare').mockResolvedValue();
    vi.useFakeTimers();
    try {
      page.search.set('Elixir');
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(300);
      expect(compare).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('restarts an in-flight comparison with the latest recipe search', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [characterSchema.parse({ id: 'main', name: 'Main', region: 'sa' })],
      activeCharacterId: 'main',
    }));
    await page.load();
    fixture.detectChanges();
    await fixture.whenStable();
    vi.useFakeTimers();
    try {
      const firstRun = page.compare();
      expect(page.busy()).toBe(true);
      page.search.set('produto inexistente');
      fixture.detectChanges();
      await vi.advanceTimersByTimeAsync(300);
      await firstRun;
      expect(page.busy()).toBe(false);
      expect(page.plans()?.ranked).toEqual([]);
      expect(page.message()).toContain('0 receitas comparadas');
    } finally {
      vi.useRealTimers();
    }
  });

  it('shows the best variant per product and preserves stock opportunities in the storage tab', async () => {
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: api() },
    ]);
    const page = fixture.componentInstance;
    page.snapshot.set({
      ...snapshot,
      recipes: [
        ...snapshot.recipes,
        { ...snapshot.recipes[0], key: 'alternative' },
        {
          ...snapshot.recipes[0],
          key: 'other',
          outputs: [{ itemId: 3, name: 'Outro', quantity: '1' }],
        },
      ],
    });
    const owned = {
      ...completePlan('alternative'),
      materials: [{ itemId: 1, required: 1, owned: 1, bought: 0, produced: 0, substituted: 0 }],
    };
    page.plans.set({ ranked: [completePlan(), owned, completePlan('other')], incomplete: [] });
    expect(page.topPlans().map((row) => row.recipeId)).toEqual(['elixir', 'other']);
    page.viewTab.set('storage');
    expect(page.topPlans().map((row) => row.recipeId)).toEqual(['alternative']);
    expect(page.storageReadyCount()).toBe(1);
  });

  it('compares selling all recursive intermediates even when only the final profession is selected', async () => {
    const chain: ProductionCatalogResponse = {
      ...snapshot,
      recipes: ['ALCHEMY', 'GRIND', 'DRY', 'COOK'].map((type, i) => ({
        key: `chain-${i + 2}`,
        type,
        station: null,
        inputs: [{ itemId: i + 1, name: `Produto ${i + 1}`, quantity: '1' }],
        outputs: [{ itemId: i + 2, name: `Produto ${i + 2}`, quantity: '1' }],
      })),
      items: [1, 2, 3, 4, 5].map((id) => ({ ...snapshot.items[0], id, name: `Produto ${id}` })),
    };
    const fixture = await renderComponent(RecommendationsPage, {}, [
      { provide: ProductionApi, useValue: { ...api(), catalog: () => of(chain) } },
    ]);
    const page = fixture.componentInstance;
    page.store.update((state) => ({
      ...state,
      characters: [
        characterSchema.parse({
          id: 'main',
          name: 'Main',
          region: 'sa',
          silver: '100000',
          activeMinutes: 1,
          weightLimit: 100,
        }),
      ],
      activeCharacterId: 'main',
      activityCoach: { ...state.activityCoach, preferredSkills: ['cooking'] },
    }));
    await page.load();
    page.quotes.set(
      Object.fromEntries(
        [1, 2, 3, 4, 5].map((id) => [
          id,
          {
            unitPrice: String(id * 20),
            available: null,
            source: 'manual' as const,
            observedAt: new Date().toISOString(),
          },
        ]),
      ),
    );
    await page.compare();
    expect(page.plans()?.ranked.length).toBeGreaterThan(0);
    expect(page.plans()?.ranked.every((row) => row.recipeId === 'chain-5')).toBe(true);
    const rows = page.chainComparisons().get('chain-5')!;
    expect(rows.map((row) => [row.itemId, row.depth])).toEqual([
      [5, 0],
      [4, 1],
      [3, 2],
      [2, 3],
    ]);
    expect(rows.every((row) => row.plan !== null && row.plan.profitPerHour !== null)).toBe(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[data-chain-comparison-row]')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('.chain-comparison')?.open).toBe(true);

    page.quotes.update((quotes) => ({
      ...quotes,
      4: { ...quotes[4], source: 'market', totalTrades: '0' },
    }));
    await page.compare();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('[data-chain-comparison-row]')).toHaveLength(4);
    expect(fixture.nativeElement.querySelector('[data-depth="1"]').textContent).toContain(
      'Baixa atividade de venda conhecida',
    );

    page.quotes.update((quotes) => {
      const next = { ...quotes };
      delete next[2];
      return next;
    });
    await page.compare();
    expect(
      page
        .chainComparisons()
        .get('chain-5')
        ?.find((row) => row.itemId === 2)?.plan?.profitPerHour,
    ).toBeNull();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-depth="3"]').textContent).toContain(
      'Pendente',
    );
  });

  it('ranks recipes out-of-the-box using default method seconds without manual time calibration and supports storage/liquidity filters', async () => {
    expect(defaultRecipeMethodSeconds('COOKING')).toBe(1.2);
    expect(defaultRecipeMethodSeconds('SIMPLE_ALCHEMY')).toBe(6);

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
      inventory: [
        {
          id: 'stock-1',
          name: 'Material',
          region: 'sa',
          itemId: 1,
          quantity: 10,
          location: 'Heidel',
          price: '0',
          target: 0,
        },
      ],
    }));
    await page.load();
    page.manualPrice(1, '10');
    page.manualPrice(2, '100');
    // Note: no manual calibration set on page.calibration['ALCHEMY']!
    await page.compare();

    expect(page.plans()?.ranked.length).toBeGreaterThan(0);
    const customPlan = page.plans()?.ranked.find((row) => row.scenario === 'produce-all');
    expect(customPlan).toBeDefined();
    expect(page.ownedMaterials(customPlan!).length).toBe(1);
    expect(page.missingMaterials(customPlan!).length).toBe(1);

    page.updateMastery('cooking', 1200);
    expect(page.profile()?.mastery.cooking).toBe(1200);
  });
});
