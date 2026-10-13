import type { CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { emptyWorkspace } from '../../core/workspace-models';
import { isGraphAncestor, layoutRecipeGraph } from './recipe-graph-model';
import type { ItemSources } from './recipe-knowledge';
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
  type: 'OTHER',
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
  it('preserves a confirmed yield and unaffected branches when switching equivalent ingredients', () => {
    const base = recipe(
      'base',
      1,
      [
        [2, '5'],
        [4, '1'],
      ],
      null,
    );
    const alternative = recipe(
      'alternative',
      1,
      [
        [3, '5'],
        [4, '1'],
      ],
      null,
    );
    let root = withRecipe(nodeFor(part(1), 'root'), base, 2.5);
    root.children[1] = withRecipe(root.children[1], recipe('nested', 4, [[5, '1']]), 2);
    root.children[1].loading = true;
    root = withRecipe(root, alternative);
    expect(root.yield).toBe(2.5);
    expect(root.children[0].part.itemId).toBe(3);
    expect(root.children[1].recipe?.key).toBe('nested');
    expect(root.children[1].loading).toBe(false);
    expect(root.children[1].children[0].path).toBe('root/1/0');
  });
  it('calculates the Harmony batch automatically and keeps unknown sub-yields as required items', () => {
    let root = withRecipe(nodeFor(part(1399), 'root'), {
      ...recipe(
        'harmony',
        1399,
        [
          [1389, '10'],
          [1391, '10'],
          [1393, '10'],
          [1395, '10'],
          [1397, '10'],
        ],
        null,
      ),
      type: 'SIMPLE_ALCHEMY',
    });
    root = patchNode(root, 'root/0', (n) =>
      withRecipe(n, recipe('unknown', 1389, [[4, '2']], null)),
    );
    expect(root.yield).toBe(10);
    const result = planRecipeTree(root, 25, emptyWorkspace());
    expect(result.value?.rows.find((r) => r.itemId === 1389)?.required).toBe(30);
    expect(result.value?.rows.some((r) => r.itemId === 4)).toBe(false);
    expect(result.warnings.join(' ')).toContain('rendimento');
  });
  it('uses reviewed Edania single and batch yields without guessing ordinary alchemy yields', () => {
    const edania = (qty: string) => ({
      ...recipe(
        'edania',
        1407,
        [
          [1399, qty],
          [702, String(Number(qty) * 3)],
          [1409, String(Number(qty) * 3)],
          [Number(qty) === 1 ? 820936 : 821372, '1'],
        ],
        null,
      ),
      type: 'SIMPLE_ALCHEMY',
    });
    expect(withRecipe(nodeFor(part(1407), 'root'), edania('1')).yield).toBe(1);
    const batch = withRecipe(nodeFor(part(1407), 'root'), edania('10'));
    expect(batch.yield).toBe(10);
    expect(
      planRecipeTree(batch, 100, emptyWorkspace()).value?.rows.find((r) => r.itemId === 702)
        ?.required,
    ).toBe(300);
    expect(
      withRecipe(nodeFor(part(5301), 'root'), recipe('ordinary', 5301, [[4, '1']], null)).yield,
    ).toBeNull();
  });
  it('does not treat the catalog base output of ordinary alchemy as fixed', () => {
    const baseOutput = { ...recipe('ordinary-alchemy', 5301, [[4, '2']], '1'), type: 'ALCHEMY' };

    expect(withRecipe(nodeFor(part(5301), 'root'), baseOutput).yield).toBeNull();
  });
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
  it('reveals separate acquisition methods and real locations only on expanded acquisition leaves', () => {
    const root = nodeFor(part(16001), 'root');
    const origins = new Map<number, ItemSources['nodes']>([
      [
        16001,
        [
          {
            id: 'spot:3',
            name: 'Floresta Mansha',
            activity: 'grinding',
            territory: null,
            managerNode: null,
            contribution: null,
            position: null,
          },
          {
            id: 'node:1',
            name: 'Mineração',
            territory: null,
            managerNode: null,
            contribution: 1,
            position: [1, 2, 3],
          },
        ],
      ],
    ]);
    expect(layoutRecipeGraph(root, '', origins).sources).toEqual([]);
    root.expanded = true;
    const graph = layoutRecipeGraph(root, '', origins);
    expect(graph.sources.filter((n) => n.kind === 'method').map((n) => n.activity)).toEqual([
      'workers',
      'grinding',
    ]);
    expect(graph.sources.filter((n) => n.kind === 'location')).toHaveLength(2);
    expect(graph.edges).toHaveLength(4);
    expect(new Set(graph.sources.map((n) => `${n.x}/${n.y}`)).size).toBe(4);
    expect(planRecipeTree(root, 5, emptyWorkspace()).value?.rows).toHaveLength(1);
    const crafted = withRecipe(root, recipe('main', 16001, [[2, '1']]));
    expect(layoutRecipeGraph(crafted, '', origins).sources).toEqual([]);
  });
  it('groups many alternative locations without expanding a gigantic graph', () => {
    const root = { ...nodeFor(part(1), 'root'), expanded: true };
    const origins = new Map<number, ItemSources['nodes']>([
      [
        1,
        Array.from({ length: 400 }, (_, i) => ({
          id: String(i),
          name: 'Local',
          territory: null,
          managerNode: null,
          contribution: null,
          position: null,
        })),
      ],
    ]);
    const graph = layoutRecipeGraph(root, '', origins);
    expect(graph.nodes.length + graph.sources.length).toBe(6);
    expect(graph.sources.find((n) => n.kind === 'more')?.remaining).toBe(397);
    expect(graph.truncated).toBe(false);
    const large = withRecipe(
      nodeFor(part(0), 'root'),
      recipe(
        'large',
        0,
        Array.from({ length: 40 }, () => [1, '1'] as [number, string]),
      ),
    );
    large.children = large.children.map((child) => ({ ...child, expanded: true }));
    const bounded = layoutRecipeGraph(large, '', origins);
    expect(bounded.nodes.length + bounded.sources.length).toBe(200);
    expect(bounded.truncated).toBe(true);
  });
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
