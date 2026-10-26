import type { ProductionPlan, ProductionQuantity, ProductionRecipe } from '@bdo/calculators';
import type { CatalogRecipe, CatalogRecipePart } from '@bdo/shared';

export const RECIPE_PLAN_MAX_DEPTH = 12;

export type RecipePlanNodeState = 'active' | 'reference' | 'duplicate' | 'cycle' | 'pending';
export type RecipePlanQuantityMode = 'planned' | 'reference' | 'pending';

export interface RecipePlanProduct {
  itemId: number;
  part: CatalogRecipePart;
  quantity: number | null;
}

export interface RecipePlanNode<TMaterial extends { itemId: number; required: number }> {
  path: string;
  itemId: number;
  part: CatalogRecipePart;
  state: RecipePlanNodeState;
  quantityMode: RecipePlanQuantityMode;
  displayQuantity: number | null;
  material: TMaterial | null;
  /** Normalized planner input quantity for one operation, or null when unavailable. */
  perOperation: ProductionQuantity;
  canonicalPath?: string;
  producerRecipe: CatalogRecipe | null;
  planned: boolean;
  producible: boolean;
  depthLimited: boolean;
  children: RecipePlanNode<TMaterial>[];
}

export interface RecipePlanHierarchy<TMaterial extends { itemId: number; required: number }> {
  product: RecipePlanProduct | null;
  materials: RecipePlanNode<TMaterial>[];
}

export interface RecipePlanHierarchyInput<
  TMaterial extends { itemId: number; required: number; quantityPending?: boolean },
> {
  rootRecipe: CatalogRecipe;
  /** All catalog producers in the loaded graph, including recipe alternatives. */
  producerRecipes: readonly CatalogRecipe[];
  /** Production recipes after mastery, processing batches, and yield normalization. */
  normalizedRecipes: readonly ProductionRecipe[];
  /** Concrete plan selected for the current buy/produce/optimized scenario. */
  plan: Pick<ProductionPlan, 'steps' | 'recipeChoices' | 'materials' | 'output'> | null;
  /** Aggregated rows from the planner, already decorated for display. */
  materials: readonly TMaterial[];
  maxDepth?: number;
}

function addQuantities(values: readonly ProductionQuantity[]): ProductionQuantity {
  if (!values.length || values.some((value) => value === null)) return null;
  let min = 0;
  let max = 0;
  for (const value of values) {
    if (value === null) return null;
    const lower = typeof value === 'number' ? value : value.min;
    const upper = typeof value === 'number' ? value : value.max;
    if (!Number.isFinite(lower) || !Number.isFinite(upper)) return null;
    min += lower;
    max += upper;
  }
  return min === max ? min : { min, max };
}

/** Projects the active planner chain into a sidebar without recalculating its quantities. */
export function buildRecipePlanHierarchy<
  TMaterial extends { itemId: number; required: number; quantityPending?: boolean },
>(input: RecipePlanHierarchyInput<TMaterial>): RecipePlanHierarchy<TMaterial> {
  const normalizedById = new Map(input.normalizedRecipes.map((recipe) => [recipe.id, recipe]));
  const producersByItemId = new Map<number, CatalogRecipe[]>();
  for (const recipe of input.producerRecipes) {
    const itemId = recipe.outputs[0]?.itemId;
    if (itemId === undefined) continue;
    const producers = producersByItemId.get(itemId) ?? [];
    if (!producers.some((candidate) => candidate.key === recipe.key)) producers.push(recipe);
    producersByItemId.set(itemId, producers);
  }

  const materialsById = new Map(input.materials.map((material) => [material.itemId, material]));
  const plannerMaterialsById = new Map(input.plan?.materials.map((material) => [material.itemId, material]) ?? []);
  const plannedRecipeIds = new Set(
    input.plan?.steps
      .filter((step) => step.crafts > 0 && step.output > 0)
      .map((step) => step.recipeId) ?? [],
  );
  const seenActiveItems = new Map<number, string>();
  const maxDepth = Math.max(1, input.maxDepth ?? RECIPE_PLAN_MAX_DEPTH);

  const selectedProducerFor = (itemId: number): CatalogRecipe | null => {
    const candidates = producersByItemId.get(itemId) ?? [];
    const chosenId = input.plan?.recipeChoices?.[itemId];
    if (chosenId) {
      const chosen = candidates.find((recipe) => recipe.key === chosenId);
      if (chosen) return chosen;
    }
    return (
      candidates.find((recipe) => plannedRecipeIds.has(recipe.key)) ??
      candidates[0] ??
      null
    );
  };

  const quantityFor = (recipe: CatalogRecipe, itemId: number): ProductionQuantity => {
    const normalized = normalizedById.get(recipe.key);
    if (!normalized) return null;
    return addQuantities(
      normalized.ingredients
        .filter((ingredient) => ingredient.itemId === itemId)
        .map((ingredient) => ingredient.quantity),
    );
  };

  const buildInputs = (
    recipe: CatalogRecipe,
    parentPath: string,
    ancestors: ReadonlySet<number>,
    depth: number,
    referenceOnly: boolean,
  ): RecipePlanNode<TMaterial>[] =>
    recipe.inputs.map((part, index) => {
      const path = `${parentPath}/${index}`;
      const producerRecipe = selectedProducerFor(part.itemId);
      const normalizedProducer = producerRecipe
        ? normalizedById.get(producerRecipe.key)
        : undefined;
      const material = referenceOnly ? null : (materialsById.get(part.itemId) ?? null);
      const plannerRow = plannerMaterialsById.get(part.itemId);
      const planned = Boolean(
        producerRecipe &&
          normalizedProducer &&
          plannedRecipeIds.has(normalizedProducer.id) &&
          (plannerRow?.produced ?? 0) > 0,
      );

      if (ancestors.has(part.itemId)) {
        return {
          path,
          itemId: part.itemId,
          part,
          state: 'cycle',
          quantityMode: referenceOnly ? 'reference' : 'pending',
          displayQuantity: material?.required ?? null,
          material,
          perOperation: quantityFor(recipe, part.itemId),
          producerRecipe,
          planned: false,
          producible: producerRecipe !== null,
          depthLimited: false,
          children: [],
        };
      }

      const canonicalPath = material ? seenActiveItems.get(part.itemId) : undefined;
      if (canonicalPath !== undefined) {
        return {
          path,
          itemId: part.itemId,
          part,
          state: 'duplicate',
          quantityMode: 'planned',
          displayQuantity: material?.required ?? null,
          material: null,
          perOperation: quantityFor(recipe, part.itemId),
          canonicalPath,
          producerRecipe,
          planned,
          producible: producerRecipe !== null,
          depthLimited: false,
          children: [],
        };
      }

      if (material) seenActiveItems.set(part.itemId, path);
      const quantityMode: RecipePlanQuantityMode = referenceOnly
        ? 'reference'
        : material && !material.quantityPending
          ? 'planned'
          : 'pending';
      const state: RecipePlanNodeState = referenceOnly
        ? 'reference'
        : material
          ? 'active'
          : 'pending';
      const depthLimited = producerRecipe !== null && depth >= maxDepth - 1;
      const children = producerRecipe && !depthLimited
        ? buildInputs(
            producerRecipe,
            path,
            new Set(ancestors).add(part.itemId),
            depth + 1,
            referenceOnly || !planned,
          )
        : [];

      return {
        path,
        itemId: part.itemId,
        part,
        state,
        quantityMode,
        displayQuantity: material && !material.quantityPending ? material.required : null,
        material,
        perOperation: quantityFor(recipe, part.itemId),
        producerRecipe,
        planned,
        producible: producerRecipe !== null,
        depthLimited,
        children,
      };
    });

  const productPart = input.rootRecipe.outputs[0];
  const product = productPart
    ? {
        itemId: productPart.itemId,
        part: productPart,
        quantity: input.plan?.output ?? null,
      }
    : null;

  return {
    product,
    materials: buildInputs(
      input.rootRecipe,
      'plan',
      new Set(productPart ? [productPart.itemId] : []),
      0,
      false,
    ),
  };
}
