import type { CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { emptyWorkspace } from '../../core/workspace-models';
import { isGraphAncestor, layoutRecipeGraph } from './recipe-graph-model';
import {
  nodeFor,
  patchNode,
  planRecipeTree,
  stockLocationKey,
  withRecipe,
} from './recipe-tree-model';
const part = (itemId: number, quantity = '1') => ({ itemId, name: 'Item ' + itemId, quantity });
const recipe = (
  key: string,
  output: number,
  inputs: [number, string][],
  yieldValue: string | null = '1',
): CatalogRecipe => ({
  key,
  type: 'ALCHEMY',
  station: null,
  outputs: [{ ...part(output), quantity: yieldValue }],
  inputs: inputs.map(([id, q]) => part(id, q)),
});
const stock = (id: string, itemId: number, quantity: number, location = 'Velia') => ({
  id,
  itemId,
  name: 'Item ' + itemId,
  region: 'sa' as const,
  location,
  quantity,
  price: '0',
  target: 0,
});
describe('Recipe graph planning', () => {
  it('reuses shared stock only once across branches and consolidates the shortfall', () => {
    const state = emptyWorkspace();
    state.inventory = [
      stock('a', 4, 20),
      stock('b', 4, 50, 'Heidel'),
      { ...stock('c', 4, 10, 'Aventureiro'), kind: 'inventory', characterId: 'owner' },
    ];
    let root = withRecipe(
      nodeFor(part(1), 'root'),
      recipe('main', 1, [
        [2, '1'],
        [3, '1'],
      ]),
    );
    root = patchNode(root, 'root/0', (n) => withRecipe(n, recipe('a', 2, [[4, '1']])));
    root = patchNode(root, 'root/1', (n) => withRecipe(n, recipe('b', 3, [[4, '1']])));
    const result = planRecipeTree(root, 50, state, { prices: new Map([[4, '100']]) });
    expect(result.value?.rows.find((row) => row.itemId === 4)).toMatchObject({
      required: 100,
      fromStock: 80,
      purchased: 20,
      cost: '2000',
    });
    expect(result.value?.cost).toBe('2000');
    expect(state.inventory.map((r) => r.quantity)).toEqual([20, 50, 10]);
  });
  it('filters locations and regions and consumes known finished products', () => {
    const state = emptyWorkspace();
    state.inventory = [
      stock('a', 2, 80),
      { ...stock('b', 2, 90, 'Heidel'), region: 'na' },
      stock('c', 1, 5),
    ];
    const root = withRecipe(nodeFor(part(1), 'root'), recipe('main', 1, [[2, '1']]));
    const result = planRecipeTree(root, 10, state, {
      excludedLocations: [stockLocationKey(state.inventory[0])],
      prices: new Map([[2, '3']]),
    });
    expect(result.value?.rows.find((row) => row.itemId === 1)?.fromStock).toBe(0);
    expect(result.value?.rows.find((row) => row.itemId === 2)?.purchased).toBe(10);
  });
  it('uses known final stock before producing additional units', () => {
    const state = emptyWorkspace();
    state.inventory = [stock('a', 1, 5)];
    const result = planRecipeTree(
      withRecipe(nodeFor(part(1), 'root'), recipe('main', 1, [[2, '1']])),
      10,
      state,
    );
    expect(result.value?.rows.find((row) => row.itemId === 1)?.fromStock).toBe(5);
    expect(result.value?.rows.find((row) => row.itemId === 2)?.required).toBe(5);
  });
  it('does not fabricate missing yields or ingredient amounts', () => {
    const root = withRecipe(nodeFor(part(1), 'root'), recipe('main', 1, [[2, '1']], null));
    expect(planRecipeTree(root, 100, emptyWorkspace()).value).toBeNull();
    root.yield = 2.5;
    root.children[0].part.quantity = null;
    expect(planRecipeTree(root, 100, emptyWorkspace()).value).toBeNull();
  });
  it('recalculates yields, preserves a collapsed choice and replaces alternatives rather than adding them', () => {
    let root = withRecipe(nodeFor(part(1), 'root'), recipe('main', 1, [[2, '2']], '2.5'));
    expect(
      planRecipeTree(root, 10, emptyWorkspace()).value?.rows.find((r) => r.itemId === 2)?.required,
    ).toBe(8);
    root = { ...root, expanded: false };
    expect(planRecipeTree(root, 10, emptyWorkspace()).value?.tasks[0].crafts).toBe(4);
    root = withRecipe(root, recipe('other', 1, [[3, '3']], '1'));
    expect(planRecipeTree(root, 10, emptyWorkspace()).value?.rows.some((r) => r.itemId === 2)).toBe(
      false,
    );
  });
  it('signals unknown prices instead of presenting a complete zero cost', () => {
    const result = planRecipeTree(
      withRecipe(nodeFor(part(1), 'root'), recipe('main', 1, [[2, '1']])),
      10,
      emptyWorkspace(),
    );
    expect(result.knownCostOnly).toBe(true);
    expect(result.unknownPrices).toEqual(['Item 2']);
  });
  it('can explore a raw material without manufacturing a recipe', () => {
    const state = emptyWorkspace();
    state.inventory = [stock('a', 2, 80)];
    const result = planRecipeTree(nodeFor(part(2), 'root'), 100, state, {
      prices: new Map([[2, '100']]),
    });
    expect(result.value?.tasks).toEqual([]);
    expect(result.value?.cost).toBe('2000');
  });
  it('blocks ambiguous duplicate stock rather than summing it', () => {
    const state = emptyWorkspace();
    state.inventory = [stock('a', 2, 48), stock('b', 2, 48)];
    expect(planRecipeTree(nodeFor(part(2), 'root'), 100, state).warnings[0]).toContain(
      'duplicados',
    );
  });
  it('detects repeated items in the chain and invalid target inputs', () => {
    let root = withRecipe(nodeFor(part(1), 'root'), recipe('main', 1, [[2, '1']]));
    root = patchNode(root, 'root/0', (n) => withRecipe(n, recipe('a', 2, [[1, '1']])));
    root = patchNode(root, 'root/0/0', (n) => withRecipe(n, recipe('cycle', 1, [[3, '1']])));
    expect(planRecipeTree(root, 10, emptyWorkspace()).warnings.join(' ')).toContain('ciclo');
    for (const quantity of [0, -1, 1.5, 1000001, NaN])
      expect(planRecipeTree(nodeFor(part(2), 'root'), quantity, emptyWorkspace()).value).toBeNull();
  });
  it('handles more than 1000 linked imported stock records', () => {
    const state = emptyWorkspace();
    state.inventory = Array.from({ length: 1200 }, (_, i) =>
      stock(String(i), 2, 1, 'Location ' + i),
    );
    const result = planRecipeTree(
      withRecipe(nodeFor(part(1), 'root'), recipe('main', 1, [[2, '1']])),
      1300,
      state,
    );
    expect(result.value?.rows.find((r) => r.itemId === 2)?.fromStock).toBe(1200);
  });
});
describe('Progressive graph layout', () => {
  it('renders selected descendants and highlights the ancestry without deleting hidden data', () => {
    let root = withRecipe(
      nodeFor(part(1), 'root'),
      recipe('main', 1, [
        [2, '1'],
        [3, '1'],
      ]),
    );
    root = patchNode(root, 'root/0', (n) => withRecipe(n, recipe('a', 2, [[4, '1']])));
    expect(layoutRecipeGraph(root).nodes).toHaveLength(4);
    expect(layoutRecipeGraph(root, 'root/0').nodes).toHaveLength(3);
    expect(isGraphAncestor('root/0', 'root/0/0')).toBe(true);
    expect(isGraphAncestor('root/1', 'root/0/0')).toBe(false);
    expect(layoutRecipeGraph({ ...root, expanded: false }).nodes).toHaveLength(1);
  });
  it('bounds large trees and all generated coordinates', () => {
    const root = nodeFor(part(1), 'root');
    root.expanded = true;
    root.children = Array.from({ length: 400 }, (_, i) => nodeFor(part(i + 2), 'root/' + i));
    const layout = layoutRecipeGraph(root);
    expect(layout.nodes).toHaveLength(200);
    expect(layout.truncated).toBe(true);
    expect(layout.nodes.every((n) => Number.isFinite(n.x) && Number.isFinite(n.y))).toBe(true);
  });
});
