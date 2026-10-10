import type { CatalogRecipe } from '@bdo/shared';

// SA patch 25/07/2024 (groupContentNo=4950): five draughts and Harmony
// produce ten units. Current catalyst tooltips preserve 3:1 superior-elixir
// substitutions and concentrated batches at 10x. Ordinary alchemy stays unknown.
const draughts: Record<number, number[][]> = {
  1389: [
    [672, 673],
    [700, 701],
    [704, 705],
    [1180, 1181],
  ],
  1391: [
    [708, 709],
    [716, 717],
    [722, 723],
    [782, 783],
  ],
  1393: [
    [688, 689],
    [690, 691],
    [692, 693],
    [762, 763],
  ],
  1395: [
    [676, 677],
    [680, 681],
    [686, 687],
    [712, 713],
  ],
  1397: [
    [696, 697],
    [698, 699],
    [718, 719],
    [720, 721],
  ],
};
export function fixedRecipeYield(recipe: CatalogRecipe, itemId: number): number | null {
  if (recipe.type !== 'SIMPLE_ALCHEMY' || recipe.byproductOfItemId) return null;
  const input = (id: number, quantity: number) =>
    recipe.inputs.some((p) => p.itemId === id && Number(p.quantity) === quantity);
  if (
    itemId === 1399 &&
    recipe.inputs.length === 5 &&
    [1389, 1391, 1393, 1395, 1397].every((id) => input(id, 10))
  )
    return 10;
  const groups = draughts[itemId];
  if (groups && recipe.inputs.length === 5) {
    const scale = input(820936, 10) ? 1 : input(821372, 10) ? 10 : 0;
    if (
      scale &&
      groups.every(([base, superior]) => input(base, 30 * scale) || input(superior, 10 * scale))
    )
      return 10 * scale;
  }
  // Current Edania: Harmony + Will + Edania + catalyst, with substitutions.
  // Do not infer historic Ibellab recipes or unreviewed future compositions.
  if (
    itemId === 1407 &&
    (recipe.inputs.length === 4 || (recipe.inputs.length === 5 && input(4986, 1)))
  ) {
    const scale =
      recipe.inputs.length === 5
        ? input(821372, 10)
          ? 100
          : 0
        : input(820936, 1)
          ? 1
          : input(821372, 1)
            ? 10
            : 0;
    if (
      scale &&
      input(1399, scale) &&
      (input(702, 3 * scale) || input(703, scale)) &&
      (input(1409, 3 * scale) || input(1410, scale))
    )
      return scale;
  }
  return null;
}
