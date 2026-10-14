/** Snapshot 2026-10-12: https://garmoth.com/mastery-brackets/cooking
 * and https://garmoth.com/mastery-brackets/alchemy.
 * Values are maximum product proc chances in percent at each 50-point bracket.
 * Expected yield assumes the standard uniform 1–4 base product distribution.
 * Fixed and explicit catalog yields must bypass this model.
 */
const cookingMaximumProc = [
  0, 0.64, 0.96, 1.35, 1.8, 2.31, 2.89, 3.53, 4.24, 5.02, 5.86, 6.76, 7.73, 8.76, 9.86, 11.02,
  12.25, 13.54, 14.9, 16.32, 17.81, 19.36, 20.98, 22.66, 24.4, 26.21, 28.09, 30.03, 32.04, 34.11,
  36.24, 38.44, 40.7, 43.03, 45.43, 47.89, 50.41, 53, 55.65, 58.37, 61.15, 61.92, 62.68, 63.45,
  64.21, 64.98, 65.74, 66.51, 67.27, 68.04, 68.8, 69.57, 70.33, 71.09, 71.86, 72.62, 73.39, 74.15,
  74.92, 75.68, 76.45,
];
// Cooking's rare-product amount increase, in percent, at 50-mastery brackets.
// Snapshot 2026-10-13: https://garmoth.com/mastery-brackets/cooking
const cookingRareProductIncrease = [
  0, 0.25, 0.36, 0.49, 0.64, 0.81, 1, 1.21, 1.44, 1.69, 1.96, 2.25, 2.56, 2.89, 3.24, 3.61, 4, 4.41,
  4.84, 5.29, 5.76, 6.25, 6.76, 7.29, 7.84, 8.41, 9, 9.61, 10.24, 10.89, 11.56, 12.25, 12.96, 13.69,
  14.44, 15.21, 16, 16.81, 17.64, 18.49, 19.36, 19.6, 19.84, 20.09, 20.33, 20.57, 20.81, 21.05,
  21.3, 21.54, 21.78, 22.02, 22.26, 22.51, 22.75, 22.99, 23.23, 23.47, 23.72, 23.96, 24.2,
];
// Cooking mastery brackets reported by the BDOlytics cooking mastery endpoint.
// These percentages shorten cooking action time; product yields are modeled separately.
const cookingMassProduceChance = [
  0, 0.1089, 0.117649, 0.126736, 0.136161, 0.145924, 0.156025, 0.166464, 0.177241, 0.188356,
  0.199809, 0.2116, 0.223729, 0.236196, 0.249001, 0.262144, 0.275625, 0.289444, 0.305809, 0.322624,
  0.339889, 0.357604, 0.375769, 0.394384, 0.413449, 0.442225, 0.471969, 0.502681, 0.534361,
  0.567009, 0.600625, 0.635209, 0.670761, 0.707281, 0.744769, 0.783225, 0.822649, 0.863041,
  0.904401, 0.995, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];
const alchemyMaximumProc = [
  0, 5.76, 6.35, 6.97, 7.62, 8.29, 9, 9.73, 10.5, 11.29, 12.11, 12.96, 13.84, 14.75, 15.68, 16.65,
  17.64, 18.66, 19.71, 20.79, 21.9, 23.04, 24.21, 25.4, 26.63, 27.88, 29.16, 30.47, 31.81, 33.18,
  34.57, 36, 37.45, 38.94, 40.45, 41.99, 43.56, 45.16, 46.79, 48.44, 50, 50.63, 51.25, 51.88, 52.5,
  53.13, 53.75, 54.38, 55, 55.63, 56.25, 56.88, 57.5, 58.13, 58.75, 59.38, 60, 60.63, 61.25, 61.88,
  62.5,
];
/** Processing mastery brackets from https://garmoth.com/mastery-brackets/processing. */
const processingMaterialCounts = [
  [2, 10],
  [20, 11],
  [40, 12],
  [60, 13],
  [80, 14],
  [100, 15],
  [120, 16],
  [140, 17],
  [160, 18],
  [180, 19],
  [200, 20],
  [220, 21],
  [240, 22],
  [260, 23],
  [280, 24],
  [300, 25],
  [320, 26],
  [340, 27],
  [360, 28],
  [380, 29],
  [400, 30],
  [420, 31],
  [440, 32],
  [460, 33],
  [480, 34],
  [500, 35],
  [520, 36],
  [540, 37],
  [560, 38],
  [580, 39],
  [600, 40],
  [620, 41],
  [640, 42],
  [660, 43],
  [680, 45],
  [700, 47],
  [720, 49],
  [740, 51],
  [760, 53],
  [780, 57],
  [810, 60],
  [840, 64],
  [870, 68],
  [900, 72],
  [930, 76],
  [960, 80],
  [990, 85],
  [1020, 90],
  [1060, 96],
  [1100, 112],
  [1140, 118],
  [1180, 124],
  [1220, 130],
  [1260, 137],
  [1300, 144],
  [1350, 154],
  [1400, 162],
  [1450, 170],
  [1500, 178],
  [1550, 186],
  [1600, 194],
  [1650, 203],
  [1700, 212],
  [1800, 222],
  [1900, 235],
  [2000, 250],
  [2100, 260],
  [2200, 270],
  [2300, 280],
  [2400, 285],
  [2500, 290],
  [2600, 295],
  [2700, 300],
  [2800, 305],
  [2900, 310],
  [3000, 315],
] as const;

export const DEFAULT_RECIPE_MASTERY = 1000;
export const MAX_RECIPE_MASTERY = 3000;

export function normalizeRecipeMastery(value: number): number {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(MAX_RECIPE_MASTERY, Math.floor(value)))
    : DEFAULT_RECIPE_MASTERY;
}

/** Maximum-product proc chance as a fraction for the selected mastery bracket. */
export function maximumProductProcChance(skill: 'cooking' | 'alchemy', mastery: number): number {
  const table = skill === 'cooking' ? cookingMaximumProc : alchemyMaximumProc;
  return table[Math.floor(normalizeRecipeMastery(mastery) / 50)]! / 100;
}

export function standardProductYield(skill: 'cooking' | 'alchemy', mastery: number): number {
  const chance = maximumProductProcChance(skill, mastery);
  // Recipe quantity contracts use thousandths; preserve the same precision in both planners.
  return Number((2.5 + 1.5 * chance).toFixed(3));
}

/** Cooking actions per second multiplier, capped at ten actions per base craft time. */
export function cookingMassProduceRate(mastery: number): number {
  const bracket = Math.floor(normalizeRecipeMastery(mastery) / 50);
  const chance = cookingMassProduceChance[bracket] ?? (bracket >= 40 ? 1 : 0);
  return Number((1 + 9 * chance).toFixed(6));
}

/** Expected cooking rare-proc output per craft, including mastery amount increase. */
export function cookingRareProductExpectedYield(mastery: number, minProc = 1, maxProc = 2): number {
  const bracket = Math.floor(normalizeRecipeMastery(mastery) / 50);
  const maximumProductChance = cookingMaximumProc[bracket]! / 100;
  const rareProductAmountIncrease = cookingRareProductIncrease[bracket]! / 100;
  const averageProc = (minProc + maxProc) / 2;
  return Number(
    (
      (averageProc + (maxProc - averageProc) * maximumProductChance) *
      (0.2 + rareProductAmountIncrease)
    ).toFixed(6),
  );
}

/** Expected special Valencia meal quantity per Valencia Meal craft. */
export function valenciaSpecialMealExpectedYield(mastery: number): number {
  // Valencia Meal rare proc has the same 1–2 output range as other cooking rares.
  return cookingRareProductExpectedYield(mastery, 1, 2);
}

/** Expected rare-product yield for an alchemy byproduct recipe (mean proc × 20% chance). */
export function alchemySpecialProductExpectedYield(_mastery: number): number {
  return 0.3;
}

/** Number of normal processing batches that one mass-processing action can handle. */
export function processingBatchCount(mastery: number): number {
  const normalized = normalizeRecipeMastery(mastery);
  if (normalized < processingMaterialCounts[0][0]) return 1;
  let count = 1;
  for (const [bracket, materials] of processingMaterialCounts) {
    if (normalized < bracket) break;
    count = materials;
  }
  return count;
}
