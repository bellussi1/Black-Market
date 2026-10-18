import type { CatalogRecipe, CatalogRecipesResponse } from '@bdo/shared';
import { of, Subject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import type { CatalogApiService } from '../../core/catalog-api.service';
import { withVerifiedIngredientSubstitutions } from './recipe-equivalents';
import {
  type RecipeProductionGraph,
  resolveRecipeProductionGraph,
} from './recipe-production-graph';

const dataset = {
  version: 'dataset-v1',
  region: 'sa',
  locale: 'pt',
  checksum: null,
  itemCount: 0,
  recipeCount: 0,
  importedAt: '2026-10-10T00:00:00Z',
};

function recipe(key: string, output: number, inputs: number[]): CatalogRecipe {
  return {
    key,
    type: 'ALCHEMY',
    station: null,
    inputs: inputs.map((itemId) => ({ itemId, name: `Item ${itemId}`, quantity: '1' })),
    outputs: [{ itemId: output, name: `Item ${output}`, quantity: '1' }],
  };
}

function response(recipes: CatalogRecipe[], version = 'dataset-v1'): CatalogRecipesResponse {
  return {
    recipes,
    total: recipes.length,
    direction: 'produces',
    dataset: { ...dataset, version },
    page: 1,
    pageSize: 100,
  };
}

function apiFor(entries: ReadonlyMap<number, CatalogRecipe[]>) {
  return {
    getItemRecipes: vi.fn((itemId: number) => of(response(entries.get(itemId) ?? []))),
  } as unknown as CatalogApiService;
}

describe('resolveRecipeProductionGraph', () => {
  it('resolves all reachable unique item IDs', () => {
    const api = apiFor(
      new Map([
        [1, [recipe('producer-1', 1, [3, 3])]],
        [2, [recipe('producer-2', 2, [3, 4])]],
      ]),
    );

    const result = resolveRecipeProductionGraph(
      recipe('root', 100, [1, 2]),
      api,
      new Map(),
      'dataset-v1',
    );
    let graph: unknown;
    result.subscribe((value) => (graph = value));

    expect(graph).toMatchObject({
      itemIds: [1, 2, 3, 4, 100],
      producerRecipes: [{ key: 'producer-1' }, { key: 'producer-2' }],
    });
    expect(api.getItemRecipes).toHaveBeenCalledTimes(5);
    expect(api.getItemRecipes).toHaveBeenCalledWith(3, 'produces');
  });

  it('includes every nested recipe output in the market quote scope', () => {
    const byproductRecipe: CatalogRecipe = {
      ...recipe('producer-with-byproduct', 1, [2]),
      outputs: [
        { itemId: 1, name: 'Produto principal', quantity: '1' },
        { itemId: 5, name: 'Subproduto', quantity: '1' },
      ],
    };
    const api = apiFor(new Map([[1, [byproductRecipe]]]));
    let graph: unknown;

    resolveRecipeProductionGraph(recipe('root', 100, [1]), api, new Map(), 'dataset-v1').subscribe(
      (value) => (graph = value),
    );

    expect(graph).toMatchObject({ itemIds: [1, 2, 5, 100] });
  });

  it('loads attached byproduct recipes for all selected production outputs in one batch', () => {
    const root = recipe('root', 100, [1]);
    const producer = recipe('producer', 1, [2]);
    const sideProduct: CatalogRecipe = {
      ...recipe('alchemy-side-product', 750, []),
      byproductOfItemId: 1,
    };
    const api = {
      getItemRecipes: vi.fn((itemId: number) => of(response(itemId === 1 ? [producer] : []))),
      getByproductRecipes: vi.fn(() =>
        of({
          recipes: [sideProduct],
          total: 1,
          direction: 'byproducts',
          dataset,
        }),
      ),
    } as unknown as CatalogApiService;
    let graph: unknown;

    resolveRecipeProductionGraph(root, api, new Map(), 'dataset-v1').subscribe(
      (value) => (graph = value),
    );

    expect(api.getByproductRecipes).toHaveBeenCalledWith([1, 100], 'dataset-v1');
    expect(graph).toMatchObject({
      itemIds: [1, 2, 100, 750],
      returnRecipes: [{ key: 'alchemy-side-product', byproductOfItemId: 1 }],
    });
  });

  it('reuses the visible selected nested method', () => {
    const api = apiFor(new Map([[1, [recipe('a-default', 1, [8]), recipe('z-selected', 1, [9])]]]));

    let graph: unknown;
    resolveRecipeProductionGraph(
      recipe('root', 100, [1]),
      api,
      new Map([[1, 'z-selected']]),
      'dataset-v1',
    ).subscribe((value) => (graph = value));

    expect(graph).toMatchObject({
      itemIds: [1, 8, 9, 100],
      producerRecipes: [{ key: 'z-selected' }],
    });
  });

  it('chooses a stable recipe for an unselected intermediate', () => {
    const api = apiFor(
      new Map([[1, [recipe('z-producer', 1, [9]), recipe('a-producer', 1, [8])]]]),
    );

    let graph: unknown;
    resolveRecipeProductionGraph(recipe('root', 100, [1]), api, new Map(), 'dataset-v1').subscribe(
      (value) => (graph = value),
    );

    expect(graph).toMatchObject({
      itemIds: [1, 8, 9, 100],
      producerRecipes: [{ key: 'a-producer' }],
    });
  });

  it('defaults to the normal cooking formula before a rare-proc ingredient substitute', () => {
    const specialInput = {
      ...recipe('a-special-proc-substitute', 9220, [9300, 7206, 7020, 7318]),
    };
    const regularInput = {
      ...recipe('z-normal-substitute', 9220, [9215, 7206, 7020, 7318]),
    };
    const api = apiFor(new Map([[9220, [specialInput, regularInput]]]));

    let graph: unknown;
    resolveRecipeProductionGraph(
      recipe('root', 9609, [9220]),
      api,
      new Map(),
      'dataset-v1',
    ).subscribe((value) => (graph = value));

    expect(graph).toMatchObject({
      itemIds: expect.arrayContaining([9300]),
      producerRecipes: [{ key: 'z-normal-substitute' }],
    });
  });

  it('does not treat a cooking rare proc as a normal craftable intermediate', () => {
    const rareProcRecipe = recipe('false-couscous-producer', 9305, [9216, 9218, 9219]);
    const api = apiFor(new Map([[9305, [rareProcRecipe]]]));

    let graph: unknown;
    resolveRecipeProductionGraph(
      recipe('root', 9609, [9305]),
      api,
      new Map(),
      'dataset-v1',
    ).subscribe((value) => (graph = value));

    expect(graph).toMatchObject({
      producerRecipes: [],
      issues: [{ itemId: 9305, code: 'missing-producer' }],
    });
  });

  it('reports missing producers and reachable cycles', () => {
    const api = apiFor(new Map([[1, [recipe('cycle', 1, [100, 999])]]]));

    let graph: unknown;
    resolveRecipeProductionGraph(recipe('root', 100, [1]), api, new Map(), 'dataset-v1').subscribe(
      (value) => (graph = value),
    );

    expect(graph).toMatchObject({
      issues: [
        { itemId: 100, code: 'cycle' },
        { itemId: 999, code: 'missing-producer' },
      ],
      producerRecipes: [],
    });
  });

  it('rejects recipes from a different dataset version', () => {
    const api = {
      getItemRecipes: vi.fn(() => of(response([recipe('wrong-version', 1, [8])], 'dataset-v2'))),
    } as unknown as CatalogApiService;

    let graph: unknown;
    resolveRecipeProductionGraph(recipe('root', 100, [1]), api, new Map(), 'dataset-v1').subscribe(
      (value) => (graph = value),
    );

    expect(graph).toMatchObject({
      itemIds: [1, 100],
      producerRecipes: [],
      issues: [
        { itemId: 1, code: 'dataset-mismatch' },
        { itemId: 100, code: 'dataset-mismatch' },
      ],
    });
  });

  it('limits graph requests to six in flight', () => {
    const requests = Array.from({ length: 7 }, () => new Subject<CatalogRecipesResponse>());
    const api = {
      getItemRecipes: vi.fn((itemId: number) =>
        itemId === 100
          ? of(response([recipe('root', 100, [1, 2, 3, 4, 5, 6, 7])]))
          : requests[itemId - 1].asObservable(),
      ),
    } as unknown as CatalogApiService;
    const root = recipe('root', 100, [1, 2, 3, 4, 5, 6, 7]);

    resolveRecipeProductionGraph(root, api, new Map(), 'dataset-v1').subscribe();

    expect(api.getItemRecipes).toHaveBeenCalledTimes(7);
    requests[0].next(response([]));
    requests[0].complete();
    expect(api.getItemRecipes).toHaveBeenCalledTimes(8);
  });
});

it('retains all root and recursive alternatives, including inputs unique to an unselected formula', () => {
  const root = recipe('root', 100, [1]);
  const alternateRoot = recipe('root-other', 100, [5]);
  const nested = recipe('a-default', 1, [8]);
  const alternateNested = recipe('z-alternative', 1, [9]);
  const api = apiFor(
    new Map([
      [100, [root, alternateRoot, root]],
      [1, [nested, alternateNested]],
    ]),
  );
  let result: RecipeProductionGraph | undefined;
  resolveRecipeProductionGraph(root, api, new Map(), 'dataset-v1').subscribe(
    (value) => (result = value),
  );
  expect(result?.rootAlternatives?.map((entry) => entry.key)).toEqual(['root', 'root-other']);
  expect(result?.producerAlternativesByItemId?.get(1)?.map((entry) => entry.key)).toEqual([
    'a-default',
    'z-alternative',
  ]);
  expect(result?.itemIds).toEqual([1, 5, 8, 9, 100]);
  expect(api.getItemRecipes).toHaveBeenCalledTimes(5);
});

it('reports failed and partial catalog coverage without dropping the known root', () => {
  const root = recipe('root', 100, [1]);
  const api = {
    getItemRecipes: vi.fn((itemId: number) =>
      of({ ...response(itemId === 100 ? [root] : []), total: itemId === 1 ? 2 : 1 }),
    ),
  } as unknown as CatalogApiService;
  let result: RecipeProductionGraph | undefined;
  resolveRecipeProductionGraph(root, api, new Map(), 'dataset-v1').subscribe(
    (value) => (result = value),
  );
  expect(result?.issues).toContainEqual({ itemId: 1, code: 'incomplete-recipes' });
  expect(result?.rootAlternatives).toEqual([root]);
});

it('keeps verified substitution coverage independent of the selected root formula', () => {
  const organic = { ...recipe('organic', 54018, [7905, 8201, 7921, 9276]), type: 'COOK' };
  const api = apiFor(new Map([[54018, [organic]]]));
  let result: RecipeProductionGraph | undefined;
  resolveRecipeProductionGraph(organic, api, new Map(), 'dataset-v1').subscribe(
    (value) => (result = value),
  );
  expect(result?.rootAlternatives).toHaveLength(4);
  expect(result?.itemIds).toEqual(expect.arrayContaining([7901, 8501]));
  const keys = result?.rootAlternatives?.map((candidate) => candidate.key);
  const selected = withVerifiedIngredientSubstitutions([organic])[3];
  resolveRecipeProductionGraph(selected, api, new Map(), 'dataset-v1').subscribe(
    (value) => (result = value),
  );
  expect(result?.rootAlternatives?.map((candidate) => candidate.key)).toEqual(keys);

  resolveRecipeProductionGraph(
    recipe('parent', 100, [54018]),
    api,
    new Map(),
    'dataset-v1',
  ).subscribe((value) => (result = value));
  expect(result?.producerAlternativesByItemId?.get(54018)).toHaveLength(4);
});
