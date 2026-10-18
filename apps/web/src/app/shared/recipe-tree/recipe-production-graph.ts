import type { CatalogRecipe } from '@bdo/shared';
import { catchError, EMPTY, expand, filter, from, map, mergeMap, of, take, toArray } from 'rxjs';

import type { CatalogApiService } from '../../core/catalog-api.service';
import { isCookingRareProductItemId } from './recipe-bonus-products';
import { withVerifiedIngredientSubstitutions } from './recipe-equivalents';

export interface RecipeProductionGraphIssue {
  itemId: number;
  code:
    | 'missing-producer'
    | 'cycle'
    | 'dataset-mismatch'
    | 'incomplete-recipes'
    | 'invalid-alternative';
}

export interface RecipeProductionGraph {
  rootRecipe: CatalogRecipe;
  rootAlternatives?: readonly CatalogRecipe[];
  producerAlternativesByItemId?: ReadonlyMap<number, readonly CatalogRecipe[]>;
  producerRecipes: CatalogRecipe[];
  returnRecipes?: CatalogRecipe[];
  itemIds: number[];
  issues: RecipeProductionGraphIssue[];
  datasetVersion: string;
}

interface GraphSearchState {
  pendingItemIds: number[];
  visitedItemIds: Set<number>;
  itemIds: Set<number>;
  recipesByItemId: Map<number, CatalogRecipe>;
  alternativesByItemId: Map<number, CatalogRecipe[]>;
  issues: RecipeProductionGraphIssue[];
  datasetVersion: string;
}

const compareRecipeKeys = (left: CatalogRecipe, right: CatalogRecipe) =>
  left.key < right.key ? -1 : left.key > right.key ? 1 : 0;
const compareRecipeCandidates = (left: CatalogRecipe, right: CatalogRecipe) =>
  left.inputs.filter((part) => isCookingRareProductItemId(part.itemId)).length -
    right.inputs.filter((part) => isCookingRareProductItemId(part.itemId)).length ||
  compareRecipeKeys(left, right);

/** Loads all reached formulas in one catalog version, retaining selected producers for display. */
export function resolveRecipeProductionGraph(
  root: CatalogRecipe,
  api: CatalogApiService,
  selectedMethods: ReadonlyMap<number, string>,
  expectedDatasetVersion: string,
) {
  const rootOutputs = root.outputs
    .slice(0, 1)
    .map((output) => output.itemId)
    .filter(Number.isSafeInteger);
  const rootOutputIds = new Set(rootOutputs);
  const inputIds = [...new Set(root.inputs.map((input) => input.itemId))].filter(
    Number.isSafeInteger,
  );
  const initial: GraphSearchState = {
    pendingItemIds: [...rootOutputs, ...inputIds],
    visitedItemIds: new Set(),
    itemIds: new Set([...root.outputs.map((output) => output.itemId), ...inputIds]),
    recipesByItemId: new Map(),
    alternativesByItemId: new Map(rootOutputs.map((itemId) => [itemId, [root]])),
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
            api.getItemRecipes(itemId, 'produces').pipe(
              map((response) => ({ itemId, response })),
              catchError(() => of({ itemId, response: null })),
            ),
          6,
        ),
        toArray(),
        map((results) => {
          const itemIds = new Set(state.itemIds);
          const recipesByItemId = new Map(state.recipesByItemId);
          const alternativesByItemId = new Map(state.alternativesByItemId);
          const issues = [...state.issues];
          const pendingItemIds: number[] = [];
          let datasetVersion = state.datasetVersion;

          for (const { itemId, response } of results.sort((a, b) => a.itemId - b.itemId)) {
            if (!response) {
              issues.push({ itemId, code: 'incomplete-recipes' });
              continue;
            }
            if (isCookingRareProductItemId(itemId)) {
              issues.push({ itemId, code: 'missing-producer' });
              continue;
            }
            const responseVersion = response.dataset?.version ?? '';
            if (
              (expectedDatasetVersion && responseVersion !== expectedDatasetVersion) ||
              (datasetVersion && responseVersion !== datasetVersion)
            ) {
              issues.push({ itemId, code: 'dataset-mismatch' });
              continue;
            }
            if (!datasetVersion && responseVersion) datasetVersion = responseVersion;

            const unique = [
              ...new Map(response.recipes.map((recipe) => [recipe.key, recipe])).values(),
            ];
            if (unique.length < response.total) issues.push({ itemId, code: 'incomplete-recipes' });
            const valid = unique.filter((candidate) => candidate.outputs[0]?.itemId === itemId);
            if (valid.length !== unique.length)
              issues.push({ itemId, code: 'invalid-alternative' });
            const expanded = withVerifiedIngredientSubstitutions(valid);
            const sorted = [
              ...new Map(
                [...(rootOutputIds.has(itemId) ? [root] : []), ...expanded].map((candidate) => [
                  candidate.key,
                  candidate,
                ]),
              ).values(),
            ].sort(compareRecipeCandidates);
            alternativesByItemId.set(itemId, sorted);
            for (const candidate of sorted) {
              for (const output of candidate.outputs) itemIds.add(output.itemId);
              for (const input of candidate.inputs) {
                itemIds.add(input.itemId);
                if (!visitedItemIds.has(input.itemId)) pendingItemIds.push(input.itemId);
              }
            }
            const selectedKey = rootOutputIds.has(itemId) ? root.key : selectedMethods.get(itemId);
            const selected = selectedKey
              ? sorted.find((candidate) => candidate.key === selectedKey)
              : sorted[0];

            if (!selected) {
              issues.push({ itemId, code: 'missing-producer' });
              continue;
            }

            recipesByItemId.set(itemId, selected);
            for (const output of selected.outputs) itemIds.add(output.itemId);
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
            alternativesByItemId,
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
      const excludedRecipes = new Set<string>();
      const visit = (itemId: number, active: Set<number>, parent?: CatalogRecipe) => {
        if (active.has(itemId)) {
          cycles.add(itemId);
          if (parent && parent.key !== root.key) excludedRecipes.add(parent.key);
          return;
        }
        if (completed.has(itemId)) return;
        const producer = recipesByOutputId.get(itemId);
        if (!producer) return;

        active.add(itemId);
        for (const input of producer.inputs) visit(input.itemId, active, producer);
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
          [...state.recipesByItemId.values()]
            .filter(
              (recipe) =>
                !rootOutputIds.has(recipe.outputs[0]?.itemId) && !excludedRecipes.has(recipe.key),
            )
            .map((recipe) => [recipe.key, recipe]),
        ).values(),
      ].sort(compareRecipeKeys);

      return {
        rootRecipe: root,
        rootAlternatives: state.alternativesByItemId.get(rootOutputs[0]) ?? [root],
        producerAlternativesByItemId: new Map(
          [...state.alternativesByItemId].filter(([itemId]) => !rootOutputIds.has(itemId)),
        ),
        producerRecipes,
        returnRecipes: [],
        itemIds: [...state.itemIds].sort((left, right) => left - right),
        issues,
        datasetVersion: state.datasetVersion,
      } satisfies RecipeProductionGraph;
    }),
    mergeMap((graph) => {
      const baseItemIds = [
        ...new Set(
          [
            ...(graph.rootAlternatives ?? [graph.rootRecipe]),
            ...[...(graph.producerAlternativesByItemId?.values() ?? [])].flat(),
          ]
            .map((recipe) => recipe.outputs[0]?.itemId)
            .filter((itemId): itemId is number => Number.isSafeInteger(itemId)),
        ),
      ].sort((left, right) => left - right);
      if (typeof api.getByproductRecipes !== 'function') return of(graph);
      return api.getByproductRecipes(baseItemIds, graph.datasetVersion).pipe(
        map((response) => {
          if (graph.datasetVersion && response.dataset?.version !== graph.datasetVersion)
            return {
              ...graph,
              issues: [
                ...graph.issues,
                { itemId: rootOutputs[0], code: 'dataset-mismatch' as const },
              ],
            };
          const baseIds = new Set(baseItemIds);
          const returnRecipes = [
            ...new Map(
              response.recipes
                .filter(
                  (recipe) =>
                    recipe.byproductOfItemId !== null &&
                    recipe.byproductOfItemId !== undefined &&
                    baseIds.has(recipe.byproductOfItemId),
                )
                .map((recipe) => [recipe.key, recipe]),
            ).values(),
          ].sort(compareRecipeKeys);
          const itemIds = new Set(graph.itemIds);
          for (const recipe of returnRecipes)
            for (const output of recipe.outputs) itemIds.add(output.itemId);
          return {
            ...graph,
            returnRecipes,
            itemIds: [...itemIds].sort((left, right) => left - right),
          };
        }),
        catchError(() =>
          of({
            ...graph,
            issues: [
              ...graph.issues,
              { itemId: rootOutputs[0], code: 'incomplete-recipes' as const },
            ],
          }),
        ),
      );
    }),
  );
}

function compareIssueCodes(
  left: RecipeProductionGraphIssue['code'],
  right: RecipeProductionGraphIssue['code'],
) {
  return left < right ? -1 : left > right ? 1 : 0;
}
