import { availableInventory, calculateProduction, type ManualRecipe } from '@bdo/calculators';
import type { CatalogRecipe, CatalogRecipePart } from '@bdo/shared';
import { z } from 'zod';

import type { Workspace } from '../../core/workspace-models';
import { validationMessage } from '../calculation-feedback';
import { ingredientAlternatives, recipeFamilies } from './recipe-equivalents';
import { fixedRecipeYield } from './recipe-fixed-yields';
import { recipeOutputQuantityWithoutMastery } from './recipe-yield';
export interface RecipeNode {
  path: string;
  part: CatalogRecipePart;
  recipe: CatalogRecipe | null;
  yield: number | null;
  expanded: boolean;
  useRareProcs: boolean;
  children: RecipeNode[];
  options: CatalogRecipe[];
  loading: boolean;
  message: string;
  category?: string;
  substitutions?: { recipeKey: string; part: CatalogRecipePart }[];
  acquisition?: { kind: 'external' | 'workers' | 'grinding'; label: string; sourceId?: string };
}
export function nodeFor(part: CatalogRecipePart, path: string): RecipeNode {
  return {
    path,
    part,
    recipe: null,
    yield: null,
    expanded: false,
    useRareProcs: false,
    children: [],
    options: [],
    loading: false,
    message: '',
    acquisition: { kind: 'external', label: 'Obter pronto' },
  };
}
export function withRecipe(
  node: RecipeNode,
  recipe: CatalogRecipe,
  yieldOverride?: number,
): RecipeNode {
  const sourceYield =
    fixedRecipeYield(recipe, node.part.itemId) ??
    recipeOutputQuantityWithoutMastery(recipe, node.part.itemId);
  const previousYield = node.recipe
    ? (fixedRecipeYield(node.recipe, node.part.itemId) ??
      recipeOutputQuantityWithoutMastery(node.recipe, node.part.itemId))
    : null;
  const preserveYield =
    node.recipe &&
    sourceYield === previousYield &&
    recipeFamilies([node.recipe, recipe]).length === 1;
  return {
    ...node,
    recipe,
    useRareProcs: node.recipe?.key === recipe.key ? node.useRareProcs : false,
    acquisition: undefined,
    yield: yieldOverride ?? (preserveYield ? (node.yield ?? sourceYield) : sourceYield),
    expanded: true,
    children: recipe.inputs.map((p, i) => {
      const path = node.path + '/' + i;
      const previous = node.children.find((child) => child.part.itemId === p.itemId);
      const relocate = (child: RecipeNode, nextPath: string): RecipeNode => ({
        ...child,
        loading: false,
        path: nextPath,
        children: child.children.map((c, index) => relocate(c, nextPath + '/' + index)),
      });
      const child = previous ? { ...relocate(previous, path), part: p } : nodeFor(p, path);
      return {
        ...child,
        substitutions: ingredientAlternatives(
          recipe,
          node.options.length ? node.options : [recipe],
          p,
        ),
      };
    }),
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
export function stockLocationKey(row: Workspace['inventory'][number]) {
  return JSON.stringify([
    row.kind ?? 'storage',
    row.kind === 'inventory'
      ? (row.characterId ?? row.location)
      : row.location.trim().toLocaleLowerCase('pt-BR'),
  ]);
}
export function planRecipeTree(
  root: RecipeNode,
  target: number,
  state: Workspace,
  options: {
    excludedLocations?: string[];
    prices?: ReadonlyMap<number, string>;
    rootCrafts?: number;
  } = {},
) {
  const recipes: ManualRecipe[] = [],
    warnings: string[] = [];
  let visited = 0;
  let blocked = false;
  const prices = new Map<number, string>();
  for (const q of [...state.quotes]
    .filter((q) => q.region === state.region && !q.subId)
    .sort((a, b) => a.observedAt.localeCompare(b.observedAt)))
    if (q.itemId) prices.set(q.itemId, q.price);
  for (const row of state.inventory.filter((r) => r.region === state.region))
    if (row.itemId && !prices.has(row.itemId) && row.price !== '0')
      prices.set(row.itemId, row.price);
  for (const [id, price] of options.prices ?? [])
    if (/^\d{1,24}$/.test(price)) prices.set(id, price);
  const visit = (node: RecipeNode, ancestors: number[]) => {
    if (++visited > 500 || ancestors.length > 12)
      throw new Error('A árvore está muito extensa. Simplifique o plano.');
    if (!node.recipe) return;
    if (ancestors.includes(node.part.itemId))
      throw new Error('Esta cadeia contém um ciclo. Escolha outra origem para o ingrediente.');
    if (!node.yield || !Number.isFinite(node.yield) || node.yield <= 0) {
      if (node.path === root.path) blocked = true;
      warnings.push(
        'Confirme o rendimento de ' +
          node.part.name +
          '. Seus ingredientes ainda não foram calculados.',
      );
      return;
    }
    const ingredients = node.children.map((child) => {
      const quantity = Number(child.part.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) {
        blocked = true;
        warnings.push('Confirme a quantidade de ' + child.part.name + '.');
      }
      visit(child, [...ancestors, node.part.itemId]);
      return {
        itemId: child.part.itemId,
        name: child.part.name,
        quantity: quantity,
        price: prices.get(child.part.itemId) ?? '0',
        recipeId:
          child.recipe && child.yield && Number.isFinite(child.yield) && child.yield > 0
            ? child.path
            : null,
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
    if (
      !Number.isFinite(target) ||
      target <= 0 ||
      target > 1_000_000 ||
      (options.rootCrafts === undefined && !Number.isSafeInteger(target))
    )
      throw new Error('Escolha entre 1 e 1.000.000 unidades inteiras.');
    const selected = state.inventory.filter(
      (r) =>
        r.region === state.region &&
        r.itemId &&
        !options.excludedLocations?.includes(stockLocationKey(r)),
    );
    const duplicateKeys = selected.map((r) => stockLocationKey(r) + ':' + r.itemId);
    if (new Set(duplicateKeys).size !== duplicateKeys.length)
      throw new Error(
        'Há registros duplicados no mesmo local. Corrija o estoque ou desmarque esse local antes de calcular.',
      );
    const inventory = availableInventory(state.personalPlans, selected);
    // No recipe is an acquisition leaf, not a fabricated one-unit crafting recipe.
    if (!root.recipe) {
      const fromStock = Math.min(
        target,
        inventory
          .filter((r) => r.itemId === root.part.itemId)
          .reduce((sum, r) => sum + r.quantity, 0),
      );
      const missing = target - fromStock;
      const cost = String(BigInt(prices.get(root.part.itemId) ?? '0') * BigInt(missing));
      const unknownPrices = missing && !prices.has(root.part.itemId) ? [root.part.name] : [];
      return {
        value: {
          target: root.part.name,
          quantity: target,
          cost,
          rows: [
            {
              itemId: root.part.itemId,
              name: root.part.name,
              required: target,
              fromStock,
              fromSurplus: 0,
              purchased: missing,
              produced: 0,
              cost,
            },
          ],
          tasks: [],
          allocations: [
            {
              path: root.path,
              itemId: root.part.itemId,
              required: target,
              fromStock,
              fromSurplus: 0,
              missing,
              crafts: 0,
              produced: 0,
            },
          ],
        },
        warnings,
        unknownPrices,
        knownCostOnly: unknownPrices.length > 0,
      };
    }
    visit(root, []);
    if (blocked) return { value: null, warnings, unknownPrices: [], knownCostOnly: false };
    const value = calculateProduction({
      recipeId: root.path,
      quantity: target,
      ...(options.rootCrafts === undefined ? {} : { rootCrafts: options.rootCrafts }),
      recipes,
      inventory,
    });
    const unknownPrices = value.rows
      .filter((r) => r.purchased > 0 && (!r.itemId || !prices.has(r.itemId)))
      .map((r) => r.name);
    return {
      value,
      warnings,
      unknownPrices,
      knownCostOnly: unknownPrices.length > 0 || warnings.length > 0,
    };
  } catch (error) {
    return {
      value: null,
      warnings: [
        error instanceof z.ZodError
          ? validationMessage(error)
          : error instanceof Error
            ? error.message
            : 'Confira os dados da produção.',
      ],
      unknownPrices: [],
      knownCostOnly: false,
    };
  }
}
