import { normalizeRecipeMastery } from './recipe-mastery';

export type AlchemyExtraItemTier = 'regular' | 'special' | 'rare';

interface WeightedAlchemyExtraItem {
  itemId: number;
  weight: number;
  quantity?: number;
}

export interface AlchemyExtraItemProduct {
  itemId: number;
  tier: AlchemyExtraItemTier;
  expectedQuantity: number;
}

/** BDOlytics defaults: 20 Clear Liquid Reagents per 26.196% alchemy byproduct proc. */
export const ALCHEMY_BYPRODUCT_ITEM_ID = 5301;
export const ALCHEMY_BYPRODUCT_QUANTITY_PER_PROC = 20;
export const ALCHEMY_BYPRODUCT_PROC_CHANCE = 0.26196;

const masteryBrackets = [
  {
    regular: 0.002499,
    special: 0.000441,
    rare: 0.00006,
  },
  {
    regular: 0.0027934115,
    special: 0.00051240093,
    rare: 0.0000691875,
  },
  {
    regular: 0.003236809,
    special: 0.000616535,
    rare: 0.000082656,
  },
  {
    regular: 0.0037102127,
    special: 0.0007331558,
    rare: 0.0000976315,
  },
  {
    regular: 0.0042121187,
    special: 0.00086272316,
    rare: 0.000114158,
  },
  {
    regular: 0.0047418526,
    special: 0.0010058475,
    rare: 0.0001323,
  },
  {
    regular: 0.005299541,
    special: 0.0011633139,
    rare: 0.000152145,
  },
  {
    regular: 0.005882905,
    special: 0.0013353833,
    rare: 0.000173712,
  },
  {
    regular: 0.0064928695,
    special: 0.0015230187,
    rare: 0.000197112,
  },
  {
    regular: 0.007127964,
    special: 0.0017266496,
    rare: 0.0002223865,
  },
  {
    regular: 0.00778752,
    special: 0.00194688,
    rare: 0.0002496,
  },
  {
    regular: 0.008471645,
    special: 0.0021845123,
    rare: 0.0002788425,
  },
  {
    regular: 0.009178119,
    special: 0.0024397532,
    rare: 0.000310128,
  },
  {
    regular: 0.00990782,
    special: 0.002713607,
    rare: 0.0003435725,
  },
  {
    regular: 0.010659312,
    special: 0.0030064727,
    rare: 0.000379215,
  },
  {
    regular: 0.011431932,
    special: 0.003318948,
    rare: 0.00041712,
  },
  {
    regular: 0.012225768,
    special: 0.0036518525,
    rare: 0.00045738,
  },
  {
    regular: 0.013038657,
    special: 0.004005339,
    rare: 0.000500004,
  },
  {
    regular: 0.013871434,
    special: 0.004380453,
    rare: 0.000545113,
  },
  {
    regular: 0.014722694,
    special: 0.004777563,
    rare: 0.0005927435,
  },
  {
    regular: 0.01559178,
    special: 0.00519726,
    rare: 0.00064296,
  },
  {
    regular: 0.016478762,
    special: 0.0056403815,
    rare: 0.0006958575,
  },
  {
    regular: 0.017381534,
    special: 0.006107026,
    rare: 0.00075144,
  },
  {
    regular: 0.018300887,
    special: 0.0065982793,
    rare: 0.0008098335,
  },
  {
    regular: 0.019235447,
    special: 0.0071144807,
    rare: 0.000871072,
  },
  {
    regular: 0.020184565,
    special: 0.0076562143,
    rare: 0.00093522,
  },
  {
    regular: 0.02114829,
    special: 0.008224335,
    rare: 0.001002375,
  },
  {
    regular: 0.022124577,
    special: 0.008818887,
    rare: 0.001072536,
  },
  {
    regular: 0.023114167,
    special: 0.009440999,
    rare: 0.001145834,
  },
  {
    regular: 0.024115723,
    special: 0.010090976,
    rare: 0.0012223005,
  },
  {
    regular: 0.0251286,
    special: 0.0107694,
    rare: 0.001302,
  },
  {
    regular: 0.026152827,
    special: 0.01147714,
    rare: 0.0013850325,
  },
  {
    regular: 0.02718642,
    special: 0.012214188,
    rare: 0.001471392,
  },
  {
    regular: 0.028230073,
    special: 0.012981713,
    rare: 0.0015612144,
  },
  {
    regular: 0.02928248,
    special: 0.01377999,
    rare: 0.001654529,
  },
  {
    regular: 0.030343005,
    special: 0.014609595,
    rare: 0.0017514,
  },
  {
    regular: 0.031411655,
    special: 0.015471413,
    rare: 0.00185193,
  },
  {
    regular: 0.03248651,
    special: 0.016365385,
    rare: 0.001956108,
  },
  {
    regular: 0.03356821,
    special: 0.017292714,
    rare: 0.002064075,
  },
  {
    regular: 0.03465549,
    special: 0.018253654,
    rare: 0.0021758575,
  },
  {
    regular: 0.03574771,
    special: 0.019248769,
    rare: 0.00229152,
  },
  {
    regular: 0.035935134,
    special: 0.019724319,
    rare: 0.0023455482,
  },
  {
    regular: 0.0361157,
    special: 0.020205079,
    rare: 0.0024002208,
  },
  {
    regular: 0.036290117,
    special: 0.02069142,
    rare: 0.0024554613,
  },
  {
    regular: 0.03645832,
    special: 0.021183293,
    rare: 0.0025113877,
  },
  {
    regular: 0.03662039,
    special: 0.02168073,
    rare: 0.0025678806,
  },
  {
    regular: 0.036776263,
    special: 0.022183677,
    rare: 0.0026250607,
  },
  {
    regular: 0.03692602,
    special: 0.022692176,
    rare: 0.0026828058,
  },
  {
    regular: 0.037069593,
    special: 0.023206167,
    rare: 0.0027412395,
  },
  {
    regular: 0.037207067,
    special: 0.023725694,
    rare: 0.002800237,
  },
  {
    regular: 0.037338376,
    special: 0.0242507,
    rare: 0.0028599245,
  },
  {
    regular: 0.037463605,
    special: 0.024781222,
    rare: 0.002920174,
  },
  {
    regular: 0.03758268,
    special: 0.025317203,
    rare: 0.0029811154,
  },
  {
    regular: 0.037695695,
    special: 0.02585869,
    rare: 0.003042617,
  },
  {
    regular: 0.03780257,
    special: 0.026405618,
    rare: 0.0031048122,
  },
  {
    regular: 0.037903402,
    special: 0.026958033,
    rare: 0.0031675664,
  },
  {
    regular: 0.03799811,
    special: 0.027515873,
    rare: 0.003231015,
  },
  {
    regular: 0.03808679,
    special: 0.028079187,
    rare: 0.0032950214,
  },
  {
    regular: 0.03816937,
    special: 0.028647907,
    rare: 0.0033597238,
  },
  {
    regular: 0.03824593,
    special: 0.029222084,
    rare: 0.0034249825,
  },
  {
    regular: 0.03831748,
    special: 0.029802484,
    rare: 0.0034910364,
  },
] as const;

export const ALCHEMY_EXTRA_ITEM_POOLS: Record<
  AlchemyExtraItemTier,
  readonly WeightedAlchemyExtraItem[]
> = {
  regular: [
    { itemId: 5301, weight: 10 },
    { itemId: 5302, weight: 10 },
    { itemId: 6601, weight: 10 },
    { itemId: 6602, weight: 10 },
    { itemId: 6603, weight: 10 },
    { itemId: 6604, weight: 10 },
    { itemId: 6605, weight: 10 },
    { itemId: 16001, weight: 20.23 },
    { itemId: 4924, weight: 9.78 },
  ],
  special: [
    { itemId: 721002, weight: 12.25 },
    { itemId: 4076, weight: 12.86 },
    { itemId: 4481, weight: 12.97 },
    { itemId: 4684, weight: 4.7 },
    { itemId: 6183, weight: 4.39 },
    { itemId: 44336, weight: 11.9 },
    { itemId: 5019, weight: 6.18 },
    { itemId: 5304, weight: 9.73 },
    { itemId: 44195, weight: 10.07 },
    { itemId: 4998, weight: 8.46 },
    { itemId: 820910, weight: 3.87 },
    { itemId: 5306, weight: 2.63 },
  ],
  rare: [
    { itemId: 16080, weight: 10.66 },
    { itemId: 5964, weight: 24.05 },
    { itemId: 721003, weight: 24.97 },
    { itemId: 766107, weight: 38.82 },
    { itemId: 45216, weight: 0.5 },
    { itemId: 45248, weight: 0.5 },
    { itemId: 45280, weight: 0.5 },
  ],
};

export const ALCHEMY_EXTRA_ITEM_IDS = Object.values(ALCHEMY_EXTRA_ITEM_POOLS)
  .flatMap((pool) => pool.map(({ itemId }) => itemId))
  .filter((itemId, index, all) => all.indexOf(itemId) === index)
  .sort((left, right) => left - right);

/** Exact 50-point bracket chances used by the public BDOlytics crafting calculator. */
export function alchemyExtraItemChances(mastery: number) {
  const bracket = Math.floor(normalizeRecipeMastery(mastery) / 50);
  return masteryBrackets[bracket]!;
}

/** Expected random alchemy items per normal alchemy operation at the selected mastery. */
export function alchemyExtraItemExpectedProducts(mastery: number): AlchemyExtraItemProduct[] {
  const chances = alchemyExtraItemChances(mastery);
  return (
    Object.entries(ALCHEMY_EXTRA_ITEM_POOLS) as [
      AlchemyExtraItemTier,
      readonly WeightedAlchemyExtraItem[],
    ][]
  )
    .flatMap(([tier, pool]) => {
      const totalWeight = pool.reduce((sum, item) => sum + item.weight, 0);
      return pool.map((item) => ({
        itemId: item.itemId,
        tier,
        expectedQuantity: chances[tier] * (item.weight / totalWeight) * (item.quantity ?? 1),
      }));
    })
    .sort((left, right) => left.itemId - right.itemId);
}

export function alchemyByproductExpectedQuantity(): number {
  return ALCHEMY_BYPRODUCT_QUANTITY_PER_PROC * ALCHEMY_BYPRODUCT_PROC_CHANCE;
}
