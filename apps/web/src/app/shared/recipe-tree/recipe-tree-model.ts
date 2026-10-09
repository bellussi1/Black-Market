import { availableInventory, calculateProduction, type ManualRecipe } from '@bdo/calculators';
import type { CatalogRecipe, CatalogRecipePart } from '@bdo/shared';

import type { Workspace } from '../../core/workspace-models';
export interface RecipeNode {
  path: string;
  part: CatalogRecipePart;
  recipe: CatalogRecipe | null;
  yield: number | null;
  expanded: boolean;
  children: RecipeNode[];
  options: CatalogRecipe[];
  loading: boolean;
  message: string;
}
export function nodeFor(part: CatalogRecipePart, path: string): RecipeNode {
  return {
    path,
    part,
    recipe: null,
    yield: null,
    expanded: false,
    children: [],
    options: [],
    loading: false,
    message: '',
  };
}
export function withRecipe(
  node: RecipeNode,
  recipe: CatalogRecipe,
  yieldOverride?: number,
): RecipeNode {
  const out = recipe.outputs.find((p) => p.itemId === node.part.itemId);
  return {
    ...node,
    recipe,
    yield:
      yieldOverride ?? (out?.quantity && Number(out.quantity) > 0 ? Number(out.quantity) : null),
    expanded: true,
    children: recipe.inputs.map((p, i) => nodeFor(p, node.path + '/' + i)),
    message: '',
  };
}
export function patchNode(
  root: RecipeNode,
  path: string,
  change: (node: RecipeNode) => RecipeNode,
): RecipeNode {
  if (root.path === path) return change(root);
  return { ...root, children: root.children.map((n) => patchNode(n, path, change)) };
}
export function planRecipeTree(root: RecipeNode, target: number, state: Workspace) {
  const recipes: ManualRecipe[] = [],
    warnings: string[] = [];
  let visited = 0;
  const prices = new Map<number, string>();
  for (const q of [...state.quotes]
    .filter((q) => q.region === state.region && !q.subId)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt)))
    if (q.itemId) prices.set(q.itemId, q.price);
  for (const row of state.inventory.filter((r) => r.region === state.region))
    if (row.itemId && !prices.has(row.itemId) && row.price !== '0')
      prices.set(row.itemId, row.price);
  const visit = (node: RecipeNode, ancestors: number[]) => {
    if (++visited > 500 || ancestors.length > 12)
      throw new Error('A árvore está muito extensa. Simplifique o plano.');
    if (!node.recipe) return;
    if (ancestors.includes(node.part.itemId))
      throw new Error('Esta cadeia contém um ciclo. Escolha outra origem para o ingrediente.');
    if (!node.yield || !Number.isFinite(node.yield) || node.yield <= 0)
      warnings.push('Confirme o rendimento de ' + node.part.name + '.');
    const ingredients = node.children.map((child) => {
      const quantity = Number(child.part.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0)
        warnings.push('Confirme a quantidade de ' + child.part.name + '.');
      visit(child, [...ancestors, node.part.itemId]);
      return {
        itemId: child.part.itemId,
        name: child.part.name,
        quantity: quantity || 1,
        price: prices.get(child.part.itemId) ?? '0',
        recipeId: child.recipe ? child.path : null,
      };
    });
    recipes.push({
      id: node.path,
      itemId: node.part.itemId,
      name: node.part.name,
      yield: node.yield ?? 1,
      ingredients,
    });
  };
  try {
    visit(root, []);
    if (warnings.length) return { value: null, warnings, unknownPrices: [], knownCostOnly: false };
    const inventory = availableInventory(state.personalPlans, state.inventory).filter(
      (r) => r.region === state.region && r.itemId !== root.part.itemId,
    );
    const value = calculateProduction({
      recipeId: root.path,
      quantity: target,
      recipes,
      inventory,
    });
    const unknownPrices = value.rows
      .filter((r) => r.purchased > 0 && (!r.itemId || !prices.has(r.itemId)))
      .map((r) => r.name);
    return { value, warnings, unknownPrices, knownCostOnly: unknownPrices.length > 0 };
  } catch (error) {
    return {
      value: null,
      warnings: [error instanceof Error ? error.message : 'Confira os dados da produção.'],
      unknownPrices: [],
      knownCostOnly: false,
    };
  }
}
