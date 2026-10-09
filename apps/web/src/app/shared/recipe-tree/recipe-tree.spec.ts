import type { CatalogItemDetail, CatalogRecipe } from '@bdo/shared';
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
