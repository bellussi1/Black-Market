import {
  compareProductionPlans,
  type ProductionPlan,
  type ProductionRecipe,
} from '@bdo/calculators';

export interface RecipeChainIndex {
  recipes: ReadonlyMap<string, ProductionRecipe>;
  producers: ReadonlyMap<number, readonly ProductionRecipe[]>;
}

export interface RecipeChainComparison {
  itemId: number;
  depth: number;
  plan: ProductionPlan | null;
  betterThanFinal: boolean;
}

export function buildRecipeChainIndex(recipes: readonly ProductionRecipe[]): RecipeChainIndex {
  const producers = new Map<number, ProductionRecipe[]>();
  for (const recipe of recipes) {
    const alternatives = producers.get(recipe.output.itemId) ?? [];
    alternatives.push(recipe);
    producers.set(recipe.output.itemId, alternatives);
  }
  return { recipes: new Map(recipes.map((recipe) => [recipe.id, recipe])), producers };
}

function traverse(index: RecipeChainIndex, roots: readonly string[]) {
  const queue = roots.map((recipeId) => ({ recipeId, depth: 0 }));
  const visited = new Set<string>();
  const items = new Map<number, { depth: number; recipeIds: string[] }>();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const { recipeId, depth } = queue[cursor];
    if (visited.has(recipeId)) continue;
    const recipe = index.recipes.get(recipeId);
    if (!recipe) continue;
    visited.add(recipeId);
    const entry = items.get(recipe.output.itemId) ?? { depth, recipeIds: [] };
    entry.recipeIds.push(recipeId);
    items.set(recipe.output.itemId, entry);
    for (const ingredient of recipe.ingredients) {
      for (const producer of index.producers.get(ingredient.itemId) ?? []) {
        if (!visited.has(producer.id)) queue.push({ recipeId: producer.id, depth: depth + 1 });
      }
    }
  }
  return { visited, items };
}

export function relatedRecipeIds(index: RecipeChainIndex, roots: readonly string[]): Set<string> {
  return traverse(index, roots).visited;
}

function complete(plan: ProductionPlan): boolean {
  return (
    plan.profitPerHour !== null &&
    plan.profit !== null &&
    plan.durationMilliseconds !== null &&
    BigInt(plan.durationMilliseconds) > 0n
  );
}

/** Each row sells its own product; rows are mutually exclusive uses of the same resources. */
export function compareRecipeChain(
  index: RecipeChainIndex,
  root: ProductionPlan,
  ranked: readonly ProductionPlan[],
  incomplete: readonly ProductionPlan[],
): RecipeChainComparison[] {
  const best = new Map<string, ProductionPlan>();
  for (const plan of [...ranked, ...incomplete]) {
    const previous = best.get(plan.recipeId);
    if (
      !previous ||
      (complete(plan) && (!complete(previous) || compareProductionPlans(plan, previous) < 0)) ||
      (!complete(plan) && !complete(previous) && plan.issues.length < previous.issues.length)
    ) {
      best.set(plan.recipeId, plan);
    }
  }
  return [...traverse(index, [root.recipeId]).items].map(([itemId, entry]) => {
    let selected: ProductionPlan | null = entry.depth === 0 ? root : null;
    if (entry.depth > 0) {
      for (const recipeId of entry.recipeIds) {
        const alternative = best.get(recipeId);
        if (!alternative) continue;
        if (
          !selected ||
          (complete(alternative) &&
            (!complete(selected) || compareProductionPlans(alternative, selected) < 0)) ||
          (!complete(alternative) &&
            !complete(selected) &&
            alternative.issues.length < selected.issues.length)
        ) {
          selected = alternative;
        }
      }
    }
    const betterThanFinal =
      entry.depth > 0 &&
      selected !== null &&
      complete(selected) &&
      complete(root) &&
      BigInt(selected.profit!) * BigInt(root.durationMilliseconds!) >
        BigInt(root.profit!) * BigInt(selected.durationMilliseconds!);
    return { itemId, depth: entry.depth, plan: selected, betterThanFinal };
  });
}
