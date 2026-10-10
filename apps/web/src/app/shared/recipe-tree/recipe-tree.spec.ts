import type { CatalogItemDetail, CatalogRecipe, CatalogRecipesResponse } from '@bdo/shared';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MarketApi } from '../../features/market/market-api';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { type ItemSources, RecipeKnowledge } from './recipe-knowledge';
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
    getItem: vi.fn(() =>
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
  return {
    knowledge,
    market,
    list: [
      { provide: RecipeKnowledge, useValue: knowledge },
      { provide: MarketApi, useValue: market },
    ],
  };
}
describe('Interactive recipe tree', () => {
  useMemoryStorage();
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
      of({ recipes: [salt, { ...salt, key: 'salt-other' }] }),
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
  it('allows retrying a market lookup interrupted by collapse all', async () => {
    const mocks = providers();
    mocks.market.getItem.mockReturnValueOnce(new Subject<never>());
    const fixture = await renderComponent(RecipeTree, { recipe, selectedItem: item }, mocks.list);
    const tree = fixture.componentInstance;
    tree.action({ path: 'root', action: 'source' });
    tree.consultMarket();
    expect(tree.marketLoading()).toBe(true);
    tree.collapseAll();
    expect(tree.marketLoading()).toBe(false);
    tree.consultMarket();
    expect(mocks.market.getItem).toHaveBeenCalledTimes(2);
    expect(tree.livePrices().get(5301)).toBe('100');
  });
  it('shows known material cost directly in simple mode and marks absent quotations', async () => {
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      providers().list,
    );
    const tree = fixture.componentInstance;
    tree.setRootYield(1);
    tree.target.set(10);
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.production-overview .cost-value')?.textContent,
    ).toContain('Sem cotações');
    tree.livePrices.set(new Map([[9001, '5']]));
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
  it('saves external material requirements only after the yield is known and updates the same draft', async () => {
    const dependencies = providers();
    const fixture = await renderComponent(
      RecipeTree,
      { recipe, selectedItem: item },
      dependencies.list,
    );
    const tree = fixture.componentInstance;
    tree.saveShoppingList();
    expect(tree.store.data().personalPlans).toHaveLength(0);
    tree.setRootYield(1);
    tree.target.set(500);
    tree.saveShoppingList();
    expect(tree.store.data().personalPlans[0]).toMatchObject({
      sourceItemId: 5301,
      status: 'draft',
      materials: [{ itemId: 9001, quantity: 1000 }],
    });
    tree.target.set(100);
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
  it('renders the real catalog recipe with unknown yield, then recalculates an explicit scenario', async () => {
    const dependencies = providers(),
      fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;
    expect(tree.plan()?.value).toBeNull();
    tree.setRootYield(2.5);
    tree.target.set(10);
    fixture.detectChanges();
    expect(tree.plan()?.value?.rows.find((r) => r.itemId === 9001)?.required).toBe(8);
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
  it('queries prices only on user action, respects stale results and retains graph state across view switches', async () => {
    const dependencies = providers(),
      fixture = await renderComponent(
        RecipeTree,
        { recipe, selectedItem: item },
        dependencies.list,
      ),
      tree = fixture.componentInstance;
    tree.action({ path: 'root', action: 'source' });
    expect(dependencies.market.getItem).not.toHaveBeenCalled();
    tree.consultMarket();
    expect(tree.livePrices().get(5301)).toBe('100');
    dependencies.market.getItem.mockReturnValueOnce(
      of({
        source: 'arsha',
        region: 'sa',
        fetchedAt: '2026-10-09T12:00:00Z',
        cacheStatus: 'stale',
        items: [{ itemId: 5301, subId: 0, price: '999', stock: 1 }],
      }),
    );
    tree.consultMarket();
    expect(tree.livePrices().get(5301)).toBe('100');
    tree.action({ path: 'root', action: 'collapse' });
    tree.view.set('list');
    tree.view.set('graph');
    expect(tree.root()?.expanded).toBe(false);
  });
});
