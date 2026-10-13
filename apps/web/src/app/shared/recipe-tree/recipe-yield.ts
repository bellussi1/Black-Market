import type { CatalogRecipe } from '@bdo/shared';

import { fixedRecipeYield } from './recipe-fixed-yields';
import {
  maximumProductProcChance,
  processingBatchCount,
  standardProductYield,
} from './recipe-mastery';

function isOrganicFeedRecipe(recipe: CatalogRecipe, itemId: number): boolean {
  const input = (id: number, quantity: number) =>
    recipe.inputs.some((part) => part.itemId === id && Number(part.quantity) === quantity);
  return (
    recipe.type === 'COOK' &&
    itemId === 54018 &&
    recipe.inputs.length === 4 &&
    (input(7905, 5) || input(7901, 5)) &&
    (input(8201, 1) || input(8501, 1)) &&
    input(7921, 4) &&
    (input(9276, 1) || input(9261, 2))
  );
}

/**
 * Maps a catalog recipe type to the corresponding life skill key.
 */
export function lifeSkillForRecipe(recipeType: string): string | null {
  switch (recipeType) {
    case 'COOK':
    case 'COOKING':
      return 'cooking';
    case 'ALCHEMY':
      return 'alchemy';
    case 'PROCESSING':
    case 'MANUFACTURE':
    case 'HEAT':
    case 'GRIND':
    case 'DRY':
    case 'FIREWOOD':
    case 'SHAKE':
    case 'THINNING':
      return 'processing';
    default:
      return null;
  }
}

/**
 * Recipe catalogs store the ordinary output of cooking and alchemy as one item.
 * That is the base output before mastery procs, not a fixed yield. Larger explicit
 * quantities and recipes outside those skills remain exact catalog yields. A
 * processing output of one is its base unit, whose average process yield is 2.5.
 */
export function recipeOutputQuantityWithoutMastery(
  recipe: CatalogRecipe,
  itemId: number,
): number | null {
  const quantity = Number(recipe.outputs.find((part) => part.itemId === itemId)?.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const skill = lifeSkillForRecipe(recipe.type);
  return (skill === 'cooking' || skill === 'alchemy' || skill === 'processing') && quantity === 1
    ? null
    : quantity;
}

/** Whether the recipe's output can change with the selected mastery level. */
export function recipeMasteryCanChangeOutput(recipe: CatalogRecipe, itemId: number): boolean {
  if (fixedRecipeYield(recipe, itemId) !== null) return false;
  if (isOrganicFeedRecipe(recipe, itemId)) return true;
  const skill = lifeSkillForRecipe(recipe.type);
  if (skill === 'processing')
    return (
      recipe.inputs.length > 0 &&
      recipe.inputs.every((input) => {
        const quantity = Number(input.quantity);
        return Number.isFinite(quantity) && quantity > 0;
      })
    );
  if (skill !== 'cooking' && skill !== 'alchemy') return false;
  return recipeOutputQuantityWithoutMastery(recipe, itemId) === null;
}

/**
 * Resolves a balanced, intelligent default yield per operation for a recipe:
 * 1. Fixed recipes (Draughts, Harmony, Edania) use their verified game yields.
 * 2. Explicit output quantity in the catalog is preserved, except that processing
 *    applies the mastery batch count to both inputs and outputs.
 * 3. Cooking and Alchemy recipes default to standard 2.50 units average,
 *    adjusted by the maximum-product proc chance of the mastery bracket.
 * 4. Processing recipes default to 2.50 units per batch, scaled by mastery.
 * 5. Other recipes default to 1.0 unit.
 */
export function resolveDefaultYield(
  recipe: CatalogRecipe | null | undefined,
  itemId: number,
  mastery = 0,
): number {
  if (!recipe) return 1;

  // 1. Check verified fixed yields (Draughts = 10, Harmony = 10, Edania = 1, etc.)
  const fixed = fixedRecipeYield(recipe, itemId);
  if (fixed !== null && fixed > 0) {
    return fixed;
  }

  const skill = lifeSkillForRecipe(recipe.type);
  const explicitYield = recipeOutputQuantityWithoutMastery(recipe, itemId);

  // Processing mastery scales the normal recipe batch; without complete input
  // quantities, keep the base yield rather than inventing a batch cost.
  if (skill === 'processing') {
    const baseYield = explicitYield ?? 2.5;
    const hasKnownInputs =
      recipe.inputs.length > 0 &&
      recipe.inputs.every(
        (input) => Number(input.quantity) > 0 && Number.isFinite(Number(input.quantity)),
      );
    return baseYield * (hasKnownInputs ? processingBatchCount(mastery) : 1);
  }

  // 2. Preserve fixed or larger explicit quantities. A catalog quantity of one
  // for ordinary cooking/alchemy is only its base output and still procs.
  if (explicitYield !== null) return explicitYield;

  // Organic Feed produces a four-unit base batch plus the cooking maximum-product proc.
  if (isOrganicFeedRecipe(recipe, itemId))
    return Number((4 + maximumProductProcChance('cooking', mastery)).toFixed(4));

  // 3. Cooking & Alchemy average yields (the source catalog uses COOK for cooking).
  if (skill === 'cooking' || skill === 'alchemy') return standardProductYield(skill, mastery);

  return 1;
}
