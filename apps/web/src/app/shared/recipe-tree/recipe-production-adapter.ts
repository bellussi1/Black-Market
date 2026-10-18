import {
  availableInventory,
  type ProductionChoice,
  type ProductionEstimate,
  type ProductionPlannerInput,
} from '@bdo/calculators';
import type { Workspace } from '@bdo/calculators/workspace';
import type {
  CatalogRecipe,
  CatalogRecipePart,
  MarketItemQuote,
  NpcPurchasePrice,
} from '@bdo/shared';

import {
  ALCHEMY_BYPRODUCT_ITEM_ID,
  alchemyByproductExpectedQuantity,
  alchemyExtraItemExpectedProducts,
} from './recipe-alchemy-extra-items';
import {
  COOKING_MILK_BYPRODUCT_ITEM_ID,
  COOKING_MILK_BYPRODUCT_PER_CRAFT,
  recipeBonusProducts,
} from './recipe-bonus-products';
import { fixedRecipeYield } from './recipe-fixed-yields';
import {
  type RecipeMarketEquivalent as RecipeMarketEquivalentPriceInput,
  resolveRecipeMaterialPrice,
} from './recipe-market-equivalent-price';
import { recipeMarketPrice } from './recipe-market-price';
import {
  alchemySpecialProductExpectedYield,
  cookingMassProduceRate,
  cookingRareProductExpectedYield,
  processingBatchCount,
} from './recipe-mastery';
import type { RecipeProductionGraph } from './recipe-production-graph';
import { stockLocationKey } from './recipe-tree-model';
import {
  lifeSkillForRecipe,
  recipeOutputQuantityWithoutMastery,
  resolveDefaultYield,
} from './recipe-yield';

export interface RecipeProductionAdapterOptions {
  quoteObservedAt?: ReadonlyMap<number, string>;
  defaultTimeMethods?: ReadonlySet<string>;
  calibratedTimeMethods?: ReadonlySet<string>;
  masteryOverride?: number | null;
  masterySkill?: string | null;
  masteryOverrides?: Readonly<Partial<Record<RecipeMasterySkill, number>>>;
  useGatheringDefaults?: boolean;
  optimize?: boolean;
  yieldOverrides?: ReadonlyMap<number, number>;
  excludedLocations?: readonly string[];
  npcPurchasePrices?: ReadonlyMap<number, NpcPurchasePrice>;
  marketEquivalentInputs?: ReadonlyMap<number, readonly RecipeMarketEquivalentPriceInput[]>;
  byproductSales?: ReadonlyMap<number, boolean>;
  useRareProcs?: ReadonlySet<string>;
}

export type RecipeMasterySkill = 'alchemy' | 'cooking' | 'processing';

function positiveNumber(value: string | number | null | undefined): number | undefined {
  const parsed = typeof value === 'number' ? value : value === null ? NaN : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

/** Baseline duration assumptions in seconds; these are not measurements of the player. */
export function defaultRecipeMethodSeconds(type: string): number {
  const norm = (type || '').toLowerCase();
  if (norm === 'cook' || norm.includes('cooking') || norm.includes('culinaria')) return 1.2;
  if (norm.includes('alchemy') || norm.includes('alquimia')) {
    if (norm.includes('simple') || norm.includes('simples')) return 6.0;
    return 1.2;
  }
  if (norm.includes('gathering') || norm.includes('coleta')) return 4.0;
  return 6.0;
}

function outputQuantity(recipe: CatalogRecipe, itemId: number): number | null {
  return fixedRecipeYield(recipe, itemId) ?? recipeOutputQuantityWithoutMastery(recipe, itemId);
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
    const selectedPrice = recipeMarketPrice(quote);
    if (!selectedPrice) continue;
    const timestamp = observedAt.get(itemId);
    if (!timestamp || !Number.isFinite(Date.parse(timestamp))) continue;
    result[itemId] = {
      unitPrice: selectedPrice.price,
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
    const skillOverride = options.masteryOverrides?.[skill as RecipeMasterySkill];
    if (skillOverride !== undefined) return Math.max(0, Math.min(3000, Math.floor(skillOverride)));
    if (
      skill === (options.masterySkill ?? rootSkill) &&
      options.masteryOverride !== null &&
      options.masteryOverride !== undefined
    )
      return Math.max(0, Math.min(3000, Math.floor(options.masteryOverride)));
    return Math.max(
      0,
      Math.min(
        3000,
        activeCharacter?.mastery[skill as keyof typeof activeCharacter.mastery] ?? 1000,
      ),
    );
  };

  const allRecipes = [
    ...new Map(
      [
        graph.rootRecipe,
        ...graph.producerRecipes,
        ...(graph.rootAlternatives ?? []),
        ...[...(graph.producerAlternativesByItemId?.values() ?? [])].flat(),
      ].map((recipe) => [recipe.key, recipe]),
    ).values(),
  ];
  const byproductValues: NonNullable<ProductionPlannerInput['byproductValues']> = {};
  const recipes = allRecipes.flatMap((recipe) => {
    const primary =
      recipe === graph.rootRecipe
        ? (outputPart(recipe, rootItemId) ?? recipe.outputs[0])
        : recipe.outputs[0];
    if (!primary) return [];
    const itemId = primary.itemId;
    const skill = lifeSkillForRecipe(recipe.type);
    const mastery = masteryFor(recipe);
    const processingBatch =
      skill === 'processing' &&
      recipe.inputs.length > 0 &&
      recipe.inputs.every((input) => positiveNumber(input.quantity) !== undefined)
        ? processingBatchCount(mastery)
        : 1;
    const fixedOrCatalogYield = outputQuantity(recipe, itemId);
    const overrideYield =
      recipe.key === graph.rootRecipe.key ||
      graph.producerRecipes.some((selected) => selected.key === recipe.key)
        ? options.yieldOverrides?.get(itemId)
        : undefined;
    const expectedYield =
      (skill === 'processing' && fixedRecipeYield(recipe, itemId) === null
        ? null
        : fixedOrCatalogYield) ??
      overrideYield ??
      (skill ? resolveDefaultYield(recipe, itemId, mastery) : undefined);
    const baseTime = methodTimes.get(recipe.type);
    const time =
      baseTime !== undefined && Number.isFinite(baseTime) && baseTime > 0
        ? baseTime / (skill === 'cooking' ? cookingMassProduceRate(mastery) : 1)
        : undefined;
    const timeSource = options.defaultTimeMethods?.has(recipe.type)
      ? 'default'
      : options.calibratedTimeMethods?.has(recipe.type)
        ? 'calibrated'
        : 'informed';
    const estimate: ProductionEstimate = {
      expectedYield,
      source: fixedRecipeYield(recipe, itemId) !== null ? 'fixed' : timeSource,
      timeSource,
      ...(time !== undefined && Number.isFinite(time) && time > 0 ? { craftSeconds: time } : {}),
      ...(timeSource === 'calibrated' ? { contextHash } : {}),
    };
    const numericOutput =
      skill === 'processing' && fixedRecipeYield(recipe, itemId) === null
        ? expectedYield
        : outputQuantity(recipe, itemId);
    const bonusProducts = recipeBonusProducts(recipe);
    const catalogReturns = recipe.outputs
      .filter((part) => part.itemId !== itemId && positiveNumber(part.quantity) !== undefined)
      .map((part) => ({
        itemId: part.itemId,
        expectedQuantity: positiveNumber(part.quantity)! * processingBatch,
      }));
    const attachedReturns = (graph.returnRecipes ?? [])
      .filter((returnRecipe) => returnRecipe.byproductOfItemId === itemId)
      .flatMap((returnRecipe) =>
        returnRecipe.outputs.map((part) => ({
          itemId: part.itemId,
          expectedQuantity:
            returnRecipe.type === 'ALCHEMY'
              ? alchemySpecialProductExpectedYield(mastery)
              : (positiveNumber(part.quantity) ?? 0),
        })),
      )
      .filter((product) => product.expectedQuantity > 0);
    const explicitReturns = [
      ...catalogReturns,
      ...attachedReturns,
      ...bonusProducts.map((product) => ({
        itemId: product.itemId,
        expectedQuantity: cookingRareProductExpectedYield(mastery),
      })),
      ...(skill === 'cooking'
        ? [
            {
              itemId: COOKING_MILK_BYPRODUCT_ITEM_ID,
              expectedQuantity: COOKING_MILK_BYPRODUCT_PER_CRAFT,
            },
          ]
        : []),
      ...(skill === 'alchemy'
        ? [
            {
              itemId: ALCHEMY_BYPRODUCT_ITEM_ID,
              expectedQuantity: alchemyByproductExpectedQuantity(),
            },
            ...alchemyExtraItemExpectedProducts(mastery),
          ]
        : []),
    ];
    const aggregatedReturns = new Map<number, number>();
    for (const product of explicitReturns)
      aggregatedReturns.set(
        product.itemId,
        (aggregatedReturns.get(product.itemId) ?? 0) + product.expectedQuantity,
      );
    if (explicitReturns.length) {
      byproductValues[recipe.key] = [...aggregatedReturns]
        .sort(([left], [right]) => left - right)
        .map(([itemId, expectedQuantity]) => ({
          itemId,
          expectedQuantity,
          unitPrice: quotes.has(itemId)
            ? (recipeMarketPrice(quotes.get(itemId)!)?.price ?? '')
            : '',
          sell:
            options.byproductSales?.get(itemId) ??
            Boolean(quotes.has(itemId) && recipeMarketPrice(quotes.get(itemId)!)),
        }));
    }
    const plannerByproducts = new Map<number, number | null>(
      recipe.outputs
        .filter((part) => part.itemId !== itemId)
        .map((part) => [
          part.itemId,
          positiveNumber(part.quantity) === undefined
            ? null
            : positiveNumber(part.quantity)! * processingBatch,
        ]),
    );
    for (const [returnItemId] of aggregatedReturns)
      if (!plannerByproducts.has(returnItemId)) plannerByproducts.set(returnItemId, null);
    return [
      {
        id: recipe.key,
        catalogVersion: graph.datasetVersion,
        name: primary.name,
        method: recipe.type,
        output: { itemId, quantity: numericOutput ?? null },
        ingredients: recipe.inputs.map((part) => ({
          itemId: part.itemId,
          quantity:
            positiveNumber(part.quantity) === undefined
              ? null
              : positiveNumber(part.quantity)! * processingBatch,
        })),
        byproducts: [...plannerByproducts].map(([returnItemId, quantity]) => ({
          itemId: returnItemId,
          quantity,
        })),
        ...(bonusProducts[0]
          ? { rareSubstitution: { itemId: bonusProducts[0].itemId, ratio: 3 } }
          : {}),
        estimate,
      },
    ];
  });

  const estimates = Object.fromEntries(recipes.map((recipe) => [recipe.id, recipe.estimate]));
  const plannerRecipes = recipes.map(({ estimate: _estimate, ...recipe }) => recipe);
  const surplusSales = Object.fromEntries(
    [
      ...new Set(
        allRecipes
          .filter((recipe) => recipe.outputs[0]?.itemId !== rootItemId)
          .flatMap((recipe) => recipe.outputs.map((output) => output.itemId)),
      ),
    ].map((itemId) => [
      itemId,
      options.byproductSales?.get(itemId) ??
        Boolean(quotes.has(itemId) && recipeMarketPrice(quotes.get(itemId)!)),
    ]),
  );
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
    const npc = options.npcPurchasePrices?.get(itemId);
    if (!npc || mappedQuotes[itemId]) continue;
    mappedQuotes[itemId] = {
      unitPrice: npc.unitPrice,
      available: null,
      observedAt: npc.verifiedAt,
      source: 'npc',
    };
  }
  for (const itemId of graph.itemIds) {
    if (mappedQuotes[itemId]) continue;
    const resolved = resolveRecipeMaterialPrice(
      itemId,
      quotes,
      options.npcPurchasePrices ?? new Map(),
      options.marketEquivalentInputs ?? new Map(),
    );
    if (resolved?.source !== 'equivalent' || !resolved.equivalentItem) continue;
    const observedAt = quoteObservedAt.get(resolved.equivalentItem.itemId);
    if (!observedAt || !Number.isFinite(Date.parse(observedAt))) continue;
    mappedQuotes[itemId] = {
      unitPrice: resolved.price,
      available: null,
      observedAt,
      source: 'market',
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
    catalogVersion: graph.datasetVersion,
    ...(graph.rootAlternatives || graph.producerAlternativesByItemId
      ? {
          recipeAlternativesByItemId: Object.fromEntries([
            [
              rootItemId,
              (graph.rootAlternatives ?? [graph.rootRecipe]).map((recipe) => recipe.key),
            ],
            ...[...(graph.producerAlternativesByItemId ?? [])].map(([itemId, alternatives]) => [
              itemId,
              alternatives.map((recipe) => recipe.key),
            ]),
          ]),
        }
      : {}),
    customRecipes: Object.fromEntries(
      graph.producerRecipes.map((recipe) => [recipe.outputs[0]?.itemId, recipe.key]),
    ),
    optimizationIssues: graph.issues
      .filter(
        (issue) =>
          issue.code === 'dataset-mismatch' ||
          issue.code === 'incomplete-recipes' ||
          issue.code === 'invalid-alternative',
      )
      .map((issue) => ({
        code:
          issue.code === 'dataset-mismatch'
            ? ('dataset-mismatch' as const)
            : issue.code === 'invalid-alternative'
              ? ('invalid-alternative' as const)
              : ('missing-recipe' as const),
        itemId: issue.itemId,
        message:
          issue.code === 'dataset-mismatch'
            ? 'O catálogo mudou durante a consulta.'
            : 'A consulta de fórmulas ficou incompleta.',
      })),
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
    // Cap expensive exact searches; the planner keeps the best candidate found at this limit.
    maxOptimizationStates: 10_000,
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
    byproductValues,
    surplusSales,
    useRareProcs: Object.fromEntries(
      [...(options.useRareProcs ?? [])].map((recipeId) => [recipeId, true]),
    ),
    useOwnedInProduction: true,
    enforcePurchaseLimits: false,
  };
}
