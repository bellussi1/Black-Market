import type { CatalogRecipe } from '@bdo/shared';

import { ALCHEMY_BYPRODUCT_ITEM_ID, ALCHEMY_EXTRA_ITEM_IDS } from './recipe-alchemy-extra-items';

export interface RecipeBonusProduct {
  itemId: number;
  name: string;
}

export const COOKING_MILK_BYPRODUCT_ITEM_ID = 9065;
export const COOKING_MILK_BYPRODUCT_PER_CRAFT = 0.2832;

const COOKING_RARE_PRODUCTS = new Map<number, RecipeBonusProduct>([
  [9202, { itemId: 9281, name: 'Vegetais em Conserva Agridoce' }],
  [9214, { itemId: 9299, name: 'Pão de Teff Macio' }],
  [9215, { itemId: 9300, name: 'Ensopado Espesso de Cobra Freekeh' }],
  [9216, { itemId: 9301, name: 'Torta de Figo Doce' }],
  [9218, { itemId: 9303, name: 'Sanduíche Picante de Teff' }],
  [9219, { itemId: 9304, name: 'Vinho Suave de Tâmara' }],
  [9220, { itemId: 9305, name: 'Cuscuz Clássico' }],
  [9261, { itemId: 9276, name: 'Aveia Refinada' }],
  [9461, { itemId: 9462, name: 'Escorpião Grelhado Crocante' }],
  [9463, { itemId: 9464, name: 'Hambúrguer Jumbo do Rei da Selva' }],
  [9609, { itemId: 9610, name: 'Refeição de Valência Especial' }],
]);

const COOKING_RARE_PRODUCT_ITEM_IDS = new Set(
  [...COOKING_RARE_PRODUCTS.values()].map((product) => product.itemId),
);

/** Returns known bonus products that come from the selected recipe action. */
export function recipeBonusProducts(recipe: CatalogRecipe): RecipeBonusProduct[] {
  if (recipe.type !== 'COOK') return [];
  return recipe.outputs.flatMap((output) => {
    const product = COOKING_RARE_PRODUCTS.get(output.itemId);
    return product ? [{ ...product }] : [];
  });
}

export function isCookingRareProductItemId(itemId: number): boolean {
  return COOKING_RARE_PRODUCT_ITEM_IDS.has(itemId);
}

export function recipeBonusProductItemIds(recipes: readonly CatalogRecipe[]): number[] {
  return [
    ...new Set(recipes.flatMap((recipe) => recipeBonusProducts(recipe).map((p) => p.itemId))),
  ];
}

/** IDs for catalog side outputs and known mastery bonus products in a selected graph. */
export function recipeReturnProductItemIds(recipes: readonly CatalogRecipe[]): number[] {
  const hasAlchemy = recipes.some((recipe) => recipe.type === 'ALCHEMY');
  const hasCooking = recipes.some((recipe) => recipe.type === 'COOK');
  return [
    ...new Set([
      ...recipes.flatMap((recipe) => recipe.outputs.slice(1).map((output) => output.itemId)),
      ...recipeBonusProductItemIds(recipes),
      ...(hasCooking ? [COOKING_MILK_BYPRODUCT_ITEM_ID] : []),
      ...(hasAlchemy ? [ALCHEMY_BYPRODUCT_ITEM_ID, ...ALCHEMY_EXTRA_ITEM_IDS] : []),
    ]),
  ].sort((left, right) => left - right);
}
