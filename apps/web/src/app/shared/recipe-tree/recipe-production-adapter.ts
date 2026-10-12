import {
  availableInventory,
  type ProductionChoice,
  type ProductionEstimate,
  type ProductionPlannerInput,
} from '@bdo/calculators';
import type { Workspace } from '@bdo/calculators/workspace';
import type { CatalogRecipe, CatalogRecipePart, MarketItemQuote } from '@bdo/shared';

import { npcPurchasePrices } from './npc-purchase-prices';
import { fixedRecipeYield } from './recipe-fixed-yields';
import type { RecipeProductionGraph } from './recipe-production-graph';
import { stockLocationKey } from './recipe-tree-model';
import { lifeSkillForRecipe, resolveDefaultYield } from './recipe-yield';

export interface RecipeProductionAdapterOptions {
  quoteObservedAt?: ReadonlyMap<number, string>;
  masteryOverride?: number | null;
  masterySkill?: string | null;
  useGatheringDefaults?: boolean;
  optimize?: boolean;
  yieldOverrides?: ReadonlyMap<number, number>;
  excludedLocations?: readonly string[];
}

function positiveNumber(value: string | number | null | undefined): number | undefined {
  const parsed = typeof value === 'number' ? value : value === null ? NaN : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Standard BDO craft durations per method (in seconds), aligned with game equipment & buffs. */
export function defaultRecipeMethodSeconds(type: string): number {
  const norm = (type || '').toLowerCase();
  if (norm.includes('cooking') || norm.includes('culinaria')) return 1.2;
  if (norm.includes('alchemy') || norm.includes('alquimia')) {
    if (norm.includes('simple') || norm.includes('simples')) return 6.0;
    return 1.2;
  }
  if (norm.includes('gathering') || norm.includes('coleta')) return 4.0;
  return 6.0;
}

function outputQuantity(recipe: CatalogRecipe, itemId: number): number | null {
  const part = recipe.outputs.find((output) => output.itemId === itemId);
  return positiveNumber(part?.quantity) ?? fixedRecipeYield(recipe, itemId);
}

function outputPart(recipe: CatalogRecipe, itemId: number): CatalogRecipePart | undefined {
  return recipe.outputs.find((output) => output.itemId === itemId);
}

function quoteRecord(
  quotes: ReadonlyMap<number, MarketItemQuote>,
  observedAt: ReadonlyMap<number, string>,
): ProductionPlannerInput['quotes'] {
  const result: ProductionPlannerInput['quotes'] = {};
  for (const [itemId, quote] of quotes) {
    if (!quote.price || !/^\d{1,24}$/.test(quote.price)) continue;
    const timestamp = observedAt.get(itemId);
    if (!timestamp || !Number.isFinite(Date.parse(timestamp))) continue;
    result[itemId] = {
      unitPrice: quote.price,
      available: Number.isFinite(quote.stock) && quote.stock >= 0 ? quote.stock : null,
      observedAt: timestamp,
      source: 'market',
    };
  }

  return result;
}

/** Adapts the selected recipe graph and current workspace data to the exact production planner. */
export function buildRecipeProductionInput(
  graph: RecipeProductionGraph,
  operations: number,
  workspace: Workspace,
  quotes: ReadonlyMap<number, MarketItemQuote>,
  methodTimes: ReadonlyMap<string, number>,
  gatherEstimates: ReadonlyMap<number, ProductionEstimate>,
  sourceOverrides: ReadonlyMap<number, ProductionChoice>,
  now: Date,
  options: RecipeProductionAdapterOptions = {},
): ProductionPlannerInput {
  const rootItemId = graph.rootRecipe.outputs[0]?.itemId ?? 0;
  const activeCharacter = workspace.characters.find(
    (character) =>
      character.id === workspace.activeCharacterId && character.region === workspace.region,
  );
  const rootSkill = lifeSkillForRecipe(graph.rootRecipe.type);
  const contextHash = `${workspace.region}:${graph.datasetVersion}:${graph.rootRecipe.key}`;
  const masteryFor = (recipe: CatalogRecipe): number => {
    const skill = lifeSkillForRecipe(recipe.type);
    if (!skill) return 0;
    if (
      skill === (options.masterySkill ?? rootSkill) &&
      options.masteryOverride !== null &&
      options.masteryOverride !== undefined
    )
      return Math.max(0, Math.min(5000, Math.floor(options.masteryOverride)));
    return activeCharacter?.mastery[skill as keyof typeof activeCharacter.mastery] ?? 0;
  };

  const allRecipes = [graph.rootRecipe, ...graph.producerRecipes];
  const recipes = allRecipes.flatMap((recipe) => {
    const primary =
      recipe === graph.rootRecipe
        ? (outputPart(recipe, rootItemId) ?? recipe.outputs[0])
        : recipe.outputs[0];
    if (!primary) return [];
    const itemId = primary.itemId;
    const fixedOrCatalogYield = outputQuantity(recipe, itemId);
    const overrideYield = options.yieldOverrides?.get(itemId);
    const expectedYield =
      fixedOrCatalogYield ??
      overrideYield ??
      resolveDefaultYield(recipe, itemId, masteryFor(recipe));
    const time = methodTimes.get(recipe.type);
    const estimateSource: ProductionEstimate['source'] =
      fixedRecipeYield(recipe, itemId) !== null
        ? 'fixed'
        : time !== undefined && Number.isFinite(time) && time > 0
          ? 'calibrated'
          : 'informed';
    const estimate: ProductionEstimate = {
      expectedYield,
      source: estimateSource,
      ...(time !== undefined && Number.isFinite(time) && time > 0
        ? { craftSeconds: time, contextHash }
        : {}),
      ...(estimateSource === 'calibrated' ? { contextHash } : {}),
    };
    const numericOutput =
      positiveNumber(primary.quantity) ?? fixedRecipeYield(recipe, itemId) ?? null;
    return [
      {
        id: recipe.key,
        name: primary.name,
        method: recipe.type,
        output: { itemId, quantity: numericOutput },
        ingredients: recipe.inputs.map((part) => ({
          itemId: part.itemId,
          quantity: positiveNumber(part.quantity) ?? null,
        })),
        byproducts: recipe.outputs
          .filter((part) => part.itemId !== itemId)
          .map((part) => ({
            itemId: part.itemId,
            quantity: positiveNumber(part.quantity) ?? null,
          })),
        estimate,
      },
    ];
  });

  const estimates = Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe.estimate]));
  const plannerRecipes = recipes.map(({ estimate: _estimate, ...recipe }) => recipe);
  const excluded = new Set(options.excludedLocations ?? []);
  const freeInventory = availableInventory(
    workspace.personalPlans,
    workspace.inventory.filter(
      (entry) => entry.region === workspace.region && !excluded.has(stockLocationKey(entry)),
    ),
  );
  const inventory = new Map<number, number>();
  for (const entry of freeInventory) {
    if (!entry.itemId || entry.quantity <= 0) continue;
    inventory.set(entry.itemId, (inventory.get(entry.itemId) ?? 0) + entry.quantity);
  }
  const character = activeCharacter;
  const quoteObservedAt = new Map(options.quoteObservedAt ?? []);
  const mappedQuotes = quoteRecord(quotes, quoteObservedAt);
  for (const itemId of graph.itemIds) {
    const npc = npcPurchasePrices.get(itemId);
    if (!npc) continue;
    mappedQuotes[itemId] = {
      unitPrice: npc.unitPrice,
      available: null,
      observedAt: npc.verifiedAt,
      source: 'npc',
      sourceUrl: npc.sourceUrl,
    };
  }
  const gatheringEstimates = Object.fromEntries(
    [...gatherEstimates].filter(
      ([, estimate]) =>
        estimate.origin === 'user-confirmed' &&
        estimate.source === 'calibrated' &&
        (estimate.expectedYield ?? 0) > 0 &&
        (estimate.craftSeconds ?? 0) > 0,
    ),
  );
  const customChoices = Object.fromEntries(sourceOverrides);

  return {
    recipes: plannerRecipes,
    quotes: mappedQuotes,
    inventory: [...inventory].map(([itemId, quantity]) => ({ itemId, quantity, reserved: 0 })),
    estimates,
    candidates: [
      {
        recipeId: graph.rootRecipe.key,
        crafts: operations,
        ...(options.optimize !== false ? { optimizeCrafts: operations } : {}),
      },
    ],
    // The selected Edania graph needs more than the planner's conservative 100k default.
    // Keep the planner's 1M hard cap; it reports an inconclusive result if exceeded.
    maxOptimizationStates: 250_000,
    profile: {
      budget: character?.silver ?? workspace.familySilver,
      activeMinutes: character?.activeMinutes ?? 60,
      contextHash,
      ...(character && character.weightLimit > 0
        ? { maxWeight: character.weightLimit, currentWeight: character.carriedWeight }
        : {}),
    },
    tax: workspace.taxOptions,
    now: now.toISOString(),
    gatheringEstimates,
    customChoices,
    useOwnedInProduction: true,
    enforcePurchaseLimits: false,
  };
}
