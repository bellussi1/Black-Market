import type { CatalogRecipe } from '@bdo/shared';
import { EMPTY, expand, filter, from, map, mergeMap, of, take, toArray } from 'rxjs';

import type { CatalogApiService } from '../../core/catalog-api.service';

export interface RecipeProductionGraphIssue {
  itemId: number;
  code: 'missing-producer' | 'cycle' | 'dataset-mismatch';
}

export interface RecipeProductionGraph {
  rootRecipe: CatalogRecipe;
  producerRecipes: CatalogRecipe[];
  itemIds: number[];
  issues: RecipeProductionGraphIssue[];
  datasetVersion: string;
}

interface GraphSearchState {
  pendingItemIds: number[];
  visitedItemIds: Set<number>;
  itemIds: Set<number>;
  recipesByItemId: Map<number, CatalogRecipe>;
  issues: RecipeProductionGraphIssue[];
  datasetVersion: string;
}

const compareRecipeKeys = (left: CatalogRecipe, right: CatalogRecipe) =>
  left.key < right.key ? -1 : left.key > right.key ? 1 : 0;

/** Resolves one stable producer per reachable ingredient and preserves visible method choices. */
export function resolveRecipeProductionGraph(
  root: CatalogRecipe,
  api: CatalogApiService,
  selectedMethods: ReadonlyMap<number, string>,
  expectedDatasetVersion: string,
) {
  const rootOutputs = root.outputs.map((output) => output.itemId).filter(Number.isSafeInteger);
  const rootOutputIds = new Set(rootOutputs);
  const inputIds = [...new Set(root.inputs.map((input) => input.itemId))].filter(
    Number.isSafeInteger,
  );
  const initial: GraphSearchState = {
    pendingItemIds: inputIds.filter((itemId) => !rootOutputIds.has(itemId)),
    visitedItemIds: new Set(rootOutputs),
    itemIds: new Set([...rootOutputs, ...inputIds]),
    recipesByItemId: new Map(),
    issues: [],
    datasetVersion: expectedDatasetVersion,
  };

  return of(initial).pipe(
    expand((state) => {
      const batch = [...new Set(state.pendingItemIds)].filter(
        (itemId) => !state.visitedItemIds.has(itemId),
      );
      if (!batch.length) return EMPTY;

      const visitedItemIds = new Set(state.visitedItemIds);
      batch.forEach((itemId) => visitedItemIds.add(itemId));

      return from(batch).pipe(
        mergeMap(
          (itemId) =>
            api.getItemRecipes(itemId, 'produces').pipe(map((response) => ({ itemId, response }))),
          6,
        ),
        toArray(),
        map((results) => {
          const itemIds = new Set(state.itemIds);
          const recipesByItemId = new Map(state.recipesByItemId);
          const issues = [...state.issues];
          const pendingItemIds: number[] = [];
          let datasetVersion = state.datasetVersion;

          for (const { itemId, response } of results) {
            const responseVersion = response.dataset?.version ?? '';
            if (
              (expectedDatasetVersion && responseVersion !== expectedDatasetVersion) ||
              (datasetVersion && responseVersion !== datasetVersion)
            ) {
              issues.push({ itemId, code: 'dataset-mismatch' });
              continue;
            }
            if (!datasetVersion && responseVersion) datasetVersion = responseVersion;

            const sorted = [...response.recipes].sort(compareRecipeKeys);
            const selectedKey = selectedMethods.get(itemId);
            const selected = selectedKey
              ? sorted.find((candidate) => candidate.key === selectedKey)
              : sorted[0];

            if (!selected) {
              issues.push({ itemId, code: 'missing-producer' });
              continue;
            }

            recipesByItemId.set(itemId, selected);
            for (const input of selected.inputs) {
              itemIds.add(input.itemId);
              if (!visitedItemIds.has(input.itemId)) pendingItemIds.push(input.itemId);
            }
          }

          return {
            pendingItemIds,
            visitedItemIds,
            itemIds,
            recipesByItemId,
            issues,
            datasetVersion,
          } satisfies GraphSearchState;
        }),
      );
    }, 1),
    filter((state) => state.pendingItemIds.length === 0),
    take(1),
    map((state) => {
      const recipesByOutputId = new Map<number, CatalogRecipe>();
      for (const itemId of rootOutputs) recipesByOutputId.set(itemId, root);
      for (const [itemId, producer] of state.recipesByItemId)
        recipesByOutputId.set(itemId, producer);

      const cycles = new Set<number>();
      const completed = new Set<number>();
      const visit = (itemId: number, active: Set<number>) => {
        if (active.has(itemId)) {
          cycles.add(itemId);
          return;
        }
        if (completed.has(itemId)) return;
        const producer = recipesByOutputId.get(itemId);
        if (!producer) return;

        active.add(itemId);
        for (const input of producer.inputs) visit(input.itemId, active);
        active.delete(itemId);
        completed.add(itemId);
      };
      for (const itemId of rootOutputs) visit(itemId, new Set());

      const issues = [
        ...state.issues,
        ...[...cycles].map((itemId) => ({ itemId, code: 'cycle' as const })),
      ]
        .filter(
          (issue, index, all) =>
            all.findIndex(
              (candidate) => candidate.itemId === issue.itemId && candidate.code === issue.code,
            ) === index,
        )
        .sort(
          (left, right) => left.itemId - right.itemId || compareIssueCodes(left.code, right.code),
        );

      const producerRecipes = [
        ...new Map(
          [...state.recipesByItemId.values()].map((recipe) => [recipe.key, recipe]),
        ).values(),
      ].sort(compareRecipeKeys);

      return {
        rootRecipe: root,
        producerRecipes,
        itemIds: [...state.itemIds].sort((left, right) => left - right),
        issues,
        datasetVersion: state.datasetVersion,
      } satisfies RecipeProductionGraph;
    }),
  );
}

function compareIssueCodes(
  left: RecipeProductionGraphIssue['code'],
  right: RecipeProductionGraphIssue['code'],
) {
  return left < right ? -1 : left > right ? 1 : 0;
}
