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

// Reviewed pairs only; DRY yields and item grade do not define cooking equivalence.
// Sources and SA client inspection: docs/research/fish-price-equivalence-review-2026-10-16.md.
const COOKING_DRIED_SUBSTITUTIONS = [
  { itemId: 8201, substituteItemId: 8501, name: 'Gobião Desidratado', label: 'fish' },
  { itemId: 8211, substituteItemId: 8511, name: 'Calamar Desidratado', label: 'seafood' },
  { itemId: 8211, substituteItemId: 8515, name: 'Marisco Desidratado', label: 'seafood' },
] as const;

const COOKING_DRIED_SUBSTITUTE_ITEM_IDS = new Set<number>([
  ...ORGANIC_FEED_SUBSTITUTIONS.filter((entry) => entry.label === 'fish').map(
    (entry) => entry.substituteItemId,
  ),
  ...COOKING_DRIED_SUBSTITUTIONS.map((entry) => entry.substituteItemId),
  6520,
  6521,
]);

export function isCookingDriedSubstituteItemId(itemId: number): boolean {
  return COOKING_DRIED_SUBSTITUTE_ITEM_IDS.has(itemId);
}
type Substitution =
  | (typeof ORGANIC_FEED_SUBSTITUTIONS)[number]
  | (typeof COOKING_DRIED_SUBSTITUTIONS)[number];
const substitutionsFor = (recipe: CatalogRecipe): readonly Substitution[] => {
  if (recipe.type !== 'COOK') return [];
  return recipe.outputs.some((output) => output.itemId === 54018)
    ? ORGANIC_FEED_SUBSTITUTIONS
    : COOKING_DRIED_SUBSTITUTIONS;
};

/** Keeps the original formula and exposes reviewed substitutions as concrete SKU variants. */
export function withVerifiedIngredientSubstitutions(recipes: CatalogRecipe[]): CatalogRecipe[] {
  const expanded = recipes.flatMap((recipe) => {
    if (recipe.key.includes('~verified-')) return [recipe];
    let combinations: Substitution[][] = [[]];
    for (const part of recipe.inputs) {
      if (
        !part.quantity ||
        !/^\d+(?:\.0+)?$/.test(part.quantity) ||
        BigInt(part.quantity.split('.')[0]) <= 0n
      )
        continue;
      const choices = substitutionsFor(recipe).filter(
        (entry) =>
          entry.itemId === part.itemId &&
          (entry.label === 'meat' || /^0*1(?:\.0+)?$/.test(part.quantity!)),
      );
      const previous = combinations;
      combinations = [
        ...previous,
        ...previous.flatMap((selected) => choices.map((choice) => [...selected, choice])),
      ];
    }
    return combinations.map((selected) =>
      selected.length === 0
        ? recipe
        : {
            ...recipe,
            key:
              recipe.key +
              '~verified-' +
              selected.map((entry) => entry.label + '-' + entry.substituteItemId).join('-'),
            inputs: recipe.inputs.map((part) => {
              const choice = selected.find((entry) => entry.itemId === part.itemId);
              return choice
                ? {
                    ...part,
                    itemId: choice.substituteItemId,
                    name: choice.name,
                    iconUrl: undefined,
                  }
                : part;
            }),
          },
    );
  });
  return [...new Map(expanded.map((recipe) => [recipe.key, recipe])).values()];
}

export function verifiedIngredientSubstitutionItemIds(recipes: CatalogRecipe[]): number[] {
  return [
    ...new Set(
      recipes.flatMap((recipe) =>
        substitutionsFor(recipe)
          .filter((entry) =>
            recipe.inputs.some(
              (part) =>
                part.itemId === entry.itemId &&
                (entry.label === 'meat' || /^0*1(?:\.0+)?$/.test(part.quantity ?? '')),
            ),
          )
          .map((entry) => entry.substituteItemId),
      ),
    ),
  ];
}

/** Prefer the reviewed dried SKU for an initial choice; explicit user choices remain intact. */
export function preferMarketIngredientRecipe(
  recipe: CatalogRecipe,
  alternatives: CatalogRecipe[],
): CatalogRecipe {
  return (
    alternatives.find((candidate) => candidate.key === recipe.key + '~verified-fish-8501') ??
    alternatives.find((candidate) => candidate.key === recipe.key + '~verified-seafood-8511') ??
    recipe
  );
}

export function compareMarketIngredientRecipes(left: CatalogRecipe, right: CatalogRecipe): number {
  const count = (recipe: CatalogRecipe) =>
    recipe.type === 'COOK'
      ? recipe.inputs.filter((part) =>
          COOKING_DRIED_SUBSTITUTIONS.some((entry) => entry.itemId === part.itemId),
        ).length
      : 0;
  return count(left) - count(right);
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
        compareMarketIngredientRecipes(a, b) ||
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
