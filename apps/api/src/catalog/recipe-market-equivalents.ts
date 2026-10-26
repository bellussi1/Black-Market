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
 * Derives buyable dried fish/seafood equivalents from catalog DRY relations for
 * non-marketable fishing and underwater-gathering inputs.
 */
export function deriveRecipeMarketEquivalents(
  sourceItems: ItemData[],
  processingRecipes: ProcessingRecipeData[],
  outputItems: ItemData[],
): RecipeMarketEquivalentItem[] {
  const marketableFish = new Map(
    outputItems
      .filter((item) => item.category === 'Fish' && item.sourceData['marketable'] === true)
      .map((item) => [item.id, item]),
  );
  const tradableFreshFishIds = new Set(
    sourceItems
      .filter(
        (item) =>
          item.category === 'Fish' &&
          item.sourceData['forTrade'] === true &&
          item.sourceData['marketable'] !== true,
      )
      .map((item) => item.id),
  );
  const equivalents = new Map<string, RecipeMarketEquivalentItem>();

  for (const recipe of processingRecipes) {
    if (recipe.type !== 'DRY') continue;
    if (recipe.inputs.length !== 1 || recipe.outputs.length !== 1) continue;
    for (const input of recipe.inputs) {
      if (!tradableFreshFishIds.has(input.itemId)) continue;
      for (const output of recipe.outputs) {
        const item = marketableFish.get(output.itemId);
        if (!item) continue;
        const equivalent = {
          sourceItemId: input.itemId,
          itemId: output.itemId,
          name: item.name ?? `Item ${item.id}`,
          iconUrl: item.iconUrl ?? null,
          quantityRatio: 1,
        };
        equivalents.set(`${equivalent.sourceItemId}:${equivalent.itemId}`, equivalent);
      }
    }
  }

  return [...equivalents.values()].sort(
    (left, right) => left.sourceItemId - right.sourceItemId || left.itemId - right.itemId,
  );
}
