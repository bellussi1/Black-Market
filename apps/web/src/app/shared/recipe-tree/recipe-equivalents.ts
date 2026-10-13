import type { CatalogRecipe, CatalogRecipePart } from '@bdo/shared';

import { isCookingRareProductItemId } from './recipe-bonus-products';
import { fixedRecipeYield } from './recipe-fixed-yields';

const yieldOf = (recipe: CatalogRecipe) => {
  const output = recipe.outputs[0];
  return output?.quantity && Number(output.quantity) > 0
    ? Number(output.quantity)
    : (fixedRecipeYield(recipe, output?.itemId ?? 0) ?? 1);
};
const token = (part: CatalogRecipePart, recipe: CatalogRecipe) =>
  `${part.itemId}:${part.quantity === null ? '?' : (Number(part.quantity) / yieldOf(recipe)).toFixed(8)}`;
const inputs = (recipe: CatalogRecipe) => recipe.inputs.map((p) => token(p, recipe)).sort();
const context = (recipe: CatalogRecipe) =>
  JSON.stringify([
    recipe.type,
    recipe.station,
    recipe.byproductOfItemId ?? null,
    recipe.outputs.map((p) => p.itemId).sort(),
  ]);

const ORGANIC_FEED_SUBSTITUTIONS = [
  {
    itemId: 7905,
    substituteItemId: 7901,
    name: 'Carne de Veado',
    label: 'meat',
  },
  {
    itemId: 8201,
    substituteItemId: 8501,
    name: 'Gobião Desidratado',
    label: 'fish',
  },
] as const;

/** Adds the 1:1 meat and fish substitutes used in the checked Organic Feed comparison. */
export function withVerifiedIngredientSubstitutions(recipes: CatalogRecipe[]): CatalogRecipe[] {
  return recipes.flatMap((recipe) => {
    const isOrganicFeed =
      recipe.type === 'COOK' && recipe.outputs.some((output) => output.itemId === 54018);
    const applicable = ORGANIC_FEED_SUBSTITUTIONS.filter((substitution) =>
      recipe.inputs.some((part) => part.itemId === substitution.itemId),
    );
    if (!isOrganicFeed || applicable.length === 0) return [recipe];

    const variants = [recipe];
    for (let mask = 1; mask < 1 << applicable.length; mask++) {
      const selected = applicable.filter((_, index) => mask & (1 << index));
      const suffix = selected.map(
        (substitution) => `${substitution.label}-${substitution.substituteItemId}`,
      );
      variants.push({
        ...recipe,
        key: `${recipe.key}~verified-${suffix.join('-')}`,
        inputs: recipe.inputs.map((part) => {
          const substitution = selected.find((entry) => entry.itemId === part.itemId);
          return substitution
            ? {
                ...part,
                itemId: substitution.substituteItemId,
                name: substitution.name,
                iconUrl: undefined,
              }
            : part;
        }),
      });
    }
    return variants;
  });
}

export function verifiedIngredientSubstitutionItemIds(recipes: CatalogRecipe[]): number[] {
  return [
    ...new Set(
      recipes.flatMap((recipe) => {
        if (recipe.type !== 'COOK' || !recipe.outputs.some((output) => output.itemId === 54018))
          return [];
        return ORGANIC_FEED_SUBSTITUTIONS.filter((substitution) =>
          recipe.inputs.some((part) => part.itemId === substitution.itemId),
        ).map((substitution) => substitution.substituteItemId);
      }),
    ),
  ];
}

// Connect actual catalog formulas that differ in one ingredient slot. This
// recognizes meat/blood/elixir substitutions without guessing from their names
// or inventing combinations missing from the source. Known batches normalize
// by yield, so concentrated processing remains the same production family.
export function recipeFamilies(recipes: CatalogRecipe[]): CatalogRecipe[][] {
  const parents = recipes.map((_, i) => i);
  const find = (i: number): number => (parents[i] === i ? i : (parents[i] = find(parents[i])));
  const signatures = new Map<string, number>();
  recipes.forEach((recipe, i) => {
    const parts = inputs(recipe);
    const keys = parts.length
      ? [
          context(recipe) + '/' + JSON.stringify(parts),
          ...parts.map(
            (_, omitted) =>
              context(recipe) + '/' + JSON.stringify(parts.filter((_, j) => j !== omitted)),
          ),
        ]
      : [context(recipe) + '/empty'];
    for (const key of keys) {
      const previous = signatures.get(key);
      if (previous !== undefined) parents[find(i)] = find(previous);
      else signatures.set(key, i);
    }
  });
  const families = new Map<number, CatalogRecipe[]>();
  recipes.forEach((recipe, i) => {
    const id = find(i);
    families.set(id, [...(families.get(id) ?? []), recipe]);
  });
  return [...families.values()].map((family) =>
    family.sort(
      (a, b) =>
        a.inputs.filter((part) => isCookingRareProductItemId(part.itemId)).length -
          b.inputs.filter((part) => isCookingRareProductItemId(part.itemId)).length ||
        yieldOf(b) - yieldOf(a) ||
        a.inputs.filter((p) => p.name.startsWith('[Evento]')).length -
          b.inputs.filter((p) => p.name.startsWith('[Evento]')).length ||
        b.inputs.reduce((sum, p) => sum + Number(p.quantity), 0) -
          a.inputs.reduce((sum, p) => sum + Number(p.quantity), 0) ||
        a.key.localeCompare(b.key),
    ),
  );
}

export function ingredientAlternatives(
  selected: CatalogRecipe,
  recipes: CatalogRecipe[],
  part: CatalogRecipePart,
) {
  const rest = selected.inputs
    .filter((p) => p !== part)
    .map((p) => token(p, selected))
    .sort();
  const choices = new Map<string, { recipeKey: string; part: CatalogRecipePart }>();
  for (const recipe of recipes) {
    if (context(recipe) !== context(selected) || yieldOf(recipe) !== yieldOf(selected)) continue;
    for (const candidate of recipe.inputs) {
      const others = recipe.inputs
        .filter((p) => p !== candidate)
        .map((p) => token(p, recipe))
        .sort();
      if (JSON.stringify(others) !== JSON.stringify(rest)) continue;
      const key = `${candidate.itemId}:${candidate.quantity}`;
      choices.set(key, { recipeKey: recipe.key, part: candidate });
    }
  }
  return [...choices.values()];
}

export function batchAlternatives(selected: CatalogRecipe, recipes: CatalogRecipe[]) {
  const core = (recipe: CatalogRecipe) =>
    recipe.inputs
      .filter((part) => ![820936, 821372, 4986].includes(part.itemId))
      .map((p) => token(p, recipe))
      .sort();
  const result = new Map<number, CatalogRecipe>();
  for (const recipe of recipes) {
    const output = recipe.outputs[0];
    const known =
      output?.quantity && Number(output.quantity) > 0
        ? Number(output.quantity)
        : fixedRecipeYield(recipe, output?.itemId ?? 0);
    if (
      known &&
      context(recipe) === context(selected) &&
      JSON.stringify(core(recipe)) === JSON.stringify(core(selected))
    )
      result.set(known, recipe);
  }
  return [...result.entries()]
    .sort(([a], [b]) => a - b)
    .map(([quantity, recipe]) => ({ quantity, recipe }));
}
