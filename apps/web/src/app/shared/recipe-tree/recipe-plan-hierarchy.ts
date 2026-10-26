import type { CatalogRecipe, CatalogRecipePart } from '@bdo/shared';

export const RECIPE_PLAN_MAX_DEPTH = 8;

export type RecipePlanNodeState =
  /** Part of the current plan: quantities come from the aggregate material row. */
  | 'active'
  /** Formula preview of a bought sub-recipe: excluded from the current cost. */
  | 'reference'
  /** Same item already shown earlier; points to the canonical row. */
  | 'duplicate'
  | 'cycle'
  | 'depth-limit';

export interface RecipePlanNode {
  path: string;
  itemId: number;
  part: CatalogRecipePart;
  state: RecipePlanNodeState;
  /** Per-operation quantity from the parent formula. */
  perOperation: string | null;
  canonicalPath?: string;
  /** Item has a known producer (can be expanded). */
  producible: boolean;
  children: RecipePlanNode[];
}

export interface RecipePlanHierarchyInput {
  rootRecipe: CatalogRecipe;
  producerRecipes: readonly CatalogRecipe[];
  /** True when the item is currently produced instead of bought. */
  isProduced: (itemId: number) => boolean;
  maxDepth?: number;
}

/** Projects the active formula chain into nested nodes without recalculating quantities. */
export function buildRecipePlanHierarchy(input: RecipePlanHierarchyInput): RecipePlanNode[] {
  const producers = new Map<number, CatalogRecipe>();
  for (const recipe of input.producerRecipes) {
    const itemId = recipe.outputs[0]?.itemId;
    if (itemId !== undefined && !producers.has(itemId)) producers.set(itemId, recipe);
  }
  const maxDepth = input.maxDepth ?? RECIPE_PLAN_MAX_DEPTH;
  const seen = new Map<number, string>();

  const build = (
    recipe: CatalogRecipe,
    parentPath: string,
    active: boolean,
    ancestors: ReadonlySet<number>,
    depth: number,
  ): RecipePlanNode[] =>
    recipe.inputs.map((part, index) => {
      const path = `${parentPath}/${index}`;
      const producer = producers.get(part.itemId);
      const base = {
        path,
        itemId: part.itemId,
        part,
        perOperation: part.quantity,
        producible: producer !== undefined,
        children: [] as RecipePlanNode[],
      };
      if (ancestors.has(part.itemId)) return { ...base, state: 'cycle' as const };
      const canonicalPath = active ? seen.get(part.itemId) : undefined;
      if (canonicalPath !== undefined)
        return { ...base, state: 'duplicate' as const, canonicalPath };
      if (active) seen.set(part.itemId, path);
      const state = active ? ('active' as const) : ('reference' as const);
      if (!producer) return { ...base, state };
      if (depth + 1 >= maxDepth) return { ...base, state: 'depth-limit' as const };
      const produced = active && input.isProduced(part.itemId);
      return {
        ...base,
        state,
        children: build(producer, path, produced, new Set(ancestors).add(part.itemId), depth + 1),
      };
    });

  const rootId = input.rootRecipe.outputs[0]?.itemId;
  return build(input.rootRecipe, 'plan', true, new Set(rootId === undefined ? [] : [rootId]), 0);
}
