import type { CatalogRecipe } from '@bdo/shared';

import { fixedRecipeYield } from './recipe-fixed-yields';
import { processingBatchCount, standardProductYield } from './recipe-mastery';

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
      return 'processing';
    default:
      return null;
  }
}

/** Whether the recipe's output can change with the selected mastery level. */
export function recipeMasteryCanChangeOutput(recipe: CatalogRecipe, itemId: number): boolean {
  if (fixedRecipeYield(recipe, itemId) !== null) return false;
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
  const output = recipe.outputs.find((part) => part.itemId === itemId);
  return !(Number(output?.quantity) > 0);
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
  const output = recipe.outputs.find((p) => p.itemId === itemId);

  // Processing mastery scales the normal recipe batch; without complete input
  // quantities, keep the base yield rather than inventing a batch cost.
  if (skill === 'processing') {
    const baseYield = Number(output?.quantity) > 0 ? Number(output!.quantity) : 2.5;
    const hasKnownInputs =
      recipe.inputs.length > 0 &&
      recipe.inputs.every(
        (input) => Number(input.quantity) > 0 && Number.isFinite(Number(input.quantity)),
      );
    return baseYield * (hasKnownInputs ? processingBatchCount(mastery) : 1);
  }

  // 2. Explicit output quantity if catalog defines it.
  if (output?.quantity && Number(output.quantity) > 0) return Number(output.quantity);

  // 3. Cooking & Alchemy average yields (the source catalog uses COOK for cooking).
  if (skill === 'cooking' || skill === 'alchemy') return standardProductYield(skill, mastery);

  return 1;
}
