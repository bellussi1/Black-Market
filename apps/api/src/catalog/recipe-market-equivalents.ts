export interface RecipeMarketEquivalentItem {
  sourceItemId: number;
  itemId: number;
  name: string;
  iconUrl: string | null;
  quantityRatio: number;
}

interface ItemData {
  id: number;
  name?: string;
  iconUrl?: string | null;
  category: string | null;
  sourceData: Record<string, unknown>;
}

interface ProcessingRecipeData {
  type: string;
  inputs: Array<{ itemId: number }>;
  outputs: Array<{ itemId: number }>;
}

/**
 * DRY identifies a processing relation, not the culinary substitution ratio.
 * The active catalog does not contain verified, versioned substitution values.
 * Preserve the response contract without supplying a fabricated economic price.
 */
export function deriveRecipeMarketEquivalents(
  _sourceItems: ItemData[],
  _processingRecipes: ProcessingRecipeData[],
  _outputItems: ItemData[],
): RecipeMarketEquivalentItem[] {
  return [];
}
