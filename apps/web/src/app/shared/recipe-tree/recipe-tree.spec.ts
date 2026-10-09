import type { CatalogItemDetail, CatalogRecipe, CatalogRecipesResponse } from '@bdo/shared';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MarketApi } from '../../features/market/market-api';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { RecipeKnowledge } from './recipe-knowledge';
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
    sources: vi.fn(() => of({ nodes: [], updatedAt: null })),
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
