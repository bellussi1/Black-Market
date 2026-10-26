import type { ProductionPlan, ProductionRecipe } from '@bdo/calculators';
import type { CatalogRecipe } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { buildRecipePlanHierarchy } from './recipe-plan-hierarchy';

type PlanSlice = Pick<ProductionPlan, 'steps' | 'recipeChoices' | 'materials' | 'output'>;

const catalogRecipe = (
  key: string,
  output: number,
  inputs: [number, string | null][],
): CatalogRecipe => ({
  key,
  type: 'PROCESSING',
  station: null,
  inputs: inputs.map(([itemId, quantity]) => ({ itemId, name: `Item ${itemId}`, quantity })),
  outputs: [{ itemId: output, name: `Item ${output}`, quantity: '1' }],
});

const productionRecipe = (
  id: string,
  output: number,
  ingredients: [number, number | null | { min: number; max: number }][] ,
): ProductionRecipe => ({
  id,
  name: `Item ${output}`,
  method: 'PROCESSING',
  output: { itemId: output, quantity: 1 },
  ingredients: ingredients.map(([itemId, quantity]) => ({ itemId, quantity })),
});

const material = (itemId: number, required: number, produced: number) => ({
  itemId,
  name: `Item ${itemId}`,
  iconUrl: null,
  required,
  bought: required - produced,
  owned: 0,
  produced,
  substituted: 0,
  source: produced > 0 ? ('produce' as const) : ('buy' as const),
});

function planSlice(
  recipeIds: string[],
  materials: PlanSlice['materials'],
  recipeChoices: Record<number, string> = {},
): PlanSlice {
  return {
    output: 100,
    recipeChoices,
    materials,
    steps: recipeIds.map((recipeId) => ({ recipeId, crafts: 1, output: 1, seconds: 1 })),
  };
}

const root = catalogRecipe('root', 100, [
  [1, '2'],
  [2, '1'],
]);
const producer1 = catalogRecipe('p1', 1, [[10, '1']]);
const producer2 = catalogRecipe('p2', 2, [[10, '1']]);
const catalogProducers = [producer1, producer2];
const normalizedRecipes = [
  productionRecipe('root', 100, [
    [1, 2],
    [2, 1],
  ]),
  productionRecipe('p1', 1, [[10, 3]]),
  productionRecipe('p2', 2, [[10, 1]]),
];

// Keep the contract red against the previous intention-only helper while the projection is
// updated to consume real planner output.
type ExpectedNode = {
  itemId: number;
  path: string;
  state: string;
  material: ReturnType<typeof material> | null;
  displayQuantity: number | null;
  quantityMode: string;
  perOperation: number | null;
  canonicalPath?: string;
  children: ExpectedNode[];
};

function build(input: Record<string, unknown>): ExpectedNode[] {
  return buildRecipePlanHierarchy({
    ...input,
    isProduced: (itemId: number) => itemId === 1,
  } as never) as unknown as ExpectedNode[];
}

describe('buildRecipePlanHierarchy', () => {
  it('uses aggregated planner material rows and activates only recipes present in plan steps', () => {
    const hierarchy = build({
      rootRecipe: root,
      producerRecipes: catalogProducers,
      normalizedRecipes,
      plan: planSlice(
        ['p1'],
        [material(1, 20, 20), material(2, 10, 0), material(10, 60, 60)],
        { 1: 'p1', 2: 'p2' },
      ),
      materials: [material(1, 20, 20), material(2, 10, 0), material(10, 60, 60)],
    });

    expect(hierarchy.map((node) => node.material?.required)).toEqual([20, 10]);
    expect(hierarchy[0].children[0]).toMatchObject({
      state: 'active',
      material: { itemId: 10, required: 60 },
      perOperation: 3,
    });
    expect(hierarchy[1].children[0]).toMatchObject({
      state: 'reference',
      material: null,
      perOperation: 1,
    });
  });

  it('shows bought sub-recipe inputs as read-only references using normalized quantities', () => {
    const processingCatalog = catalogRecipe('mass-process', 1, [[10, '1']]);
    const processingNormalized = productionRecipe('mass-process', 1, [[10, 250]]);
    const hierarchy = build({
      rootRecipe: catalogRecipe('root', 100, [[1, '2']]),
      producerRecipes: [processingCatalog],
      normalizedRecipes: [
        productionRecipe('root', 100, [[1, 2]]),
        processingNormalized,
      ],
      plan: planSlice([], [material(1, 20, 0)], { 1: 'mass-process' }),
      materials: [material(1, 20, 0)],
    });

    expect(hierarchy[0].state).toBe('active');
    expect(hierarchy[0].children[0]).toMatchObject({
      state: 'reference',
      material: null,
      perOperation: 250,
      quantityMode: 'reference',
    });
  });

  it('keeps missing aggregate rows pending instead of inventing planned quantities', () => {
    const hierarchy = build({
      rootRecipe: root,
      producerRecipes: catalogProducers,
      normalizedRecipes,
      plan: null,
      materials: [],
    });

    expect(hierarchy[0]).toMatchObject({
      state: 'pending',
      material: null,
      displayQuantity: null,
      quantityMode: 'pending',
    });
  });

  it('points repeated active items to their single canonical aggregate row', () => {
    const materials = [material(1, 20, 20), material(2, 10, 10), material(10, 90, 90)];
    const hierarchy = build({
      rootRecipe: root,
      producerRecipes: catalogProducers,
      normalizedRecipes,
      plan: planSlice(['p1', 'p2'], materials, { 1: 'p1', 2: 'p2' }),
      materials,
    });

    expect(hierarchy[0].children[0]).toMatchObject({ state: 'active', material: materials[2] });
    expect(hierarchy[1].children[0]).toMatchObject({
      state: 'duplicate',
      material: null,
      canonicalPath: hierarchy[0].children[0].path,
      children: [],
    });
  });

  it('stops cycles and respects the depth limit', () => {
    const cyclicRoot = catalogRecipe('cycle-root', 100, [[1, '1']]);
    const cyclicProducer = catalogRecipe('cycle-producer', 1, [[100, '1']]);
    const cyclic = build({
      rootRecipe: cyclicRoot,
      producerRecipes: [cyclicProducer],
      normalizedRecipes: [
        productionRecipe('cycle-root', 100, [[1, 1]]),
        productionRecipe('cycle-producer', 1, [[100, 1]]),
      ],
      plan: planSlice(['cycle-producer'], [material(1, 1, 1)], { 1: 'cycle-producer' }),
      materials: [material(1, 1, 1)],
    });
    expect(cyclic[0].children[0].state).toBe('cycle');

    const limited = build({
      rootRecipe: root,
      producerRecipes: catalogProducers,
      normalizedRecipes,
      plan: planSlice(['p1'], [material(1, 2, 2), material(10, 6, 6)], { 1: 'p1' }),
      materials: [material(1, 2, 2), material(10, 6, 6)],
      maxDepth: 1,
    });
    expect(limited[0].state).toBe('depth-limit');
  });
});
