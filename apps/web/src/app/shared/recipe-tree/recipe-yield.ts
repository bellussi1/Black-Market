import type { CatalogRecipe } from '@bdo/shared';

import { fixedRecipeYield } from './recipe-fixed-yields';
import { standardProductYield } from './recipe-mastery';

/**
 * Maps a catalog recipe type to the corresponding life skill key.
 */
export function lifeSkillForRecipe(recipeType: string): string | null {
  switch (recipeType) {
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

/**
 * Resolves a balanced, intelligent default yield per operation for a recipe:
 * 1. Fixed recipes (Draughts, Harmony, Edania) use their verified game yields.
 * 2. Explicit output quantity in the catalog is preserved.
 * 3. Cooking and Alchemy recipes default to standard 2.50 units average,
 *    adjusted by the maximum-product proc chance of the mastery bracket.
 * 4. Processing recipes default to 2.50 units.
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

  // 2. Explicit output quantity if catalog defines it
  const output = recipe.outputs.find((p) => p.itemId === itemId);
  if (output?.quantity && Number(output.quantity) > 0) {
    return Number(output.quantity);
  }

  // 3. Cooking & Alchemy average yields
  if (recipe.type === 'COOKING' || recipe.type === 'ALCHEMY') {
    return standardProductYield(recipe.type === 'COOKING' ? 'cooking' : 'alchemy', mastery);
  }

  // 4. Processing averages
  if (recipe.type === 'PROCESSING' || recipe.type === 'MANUFACTURE') {
    return 2.5;
  }

  return 1;
}
