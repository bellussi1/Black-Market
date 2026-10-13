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

export function standardProductYield(skill: 'cooking' | 'alchemy', mastery: number): number {
  const table = skill === 'cooking' ? cookingMaximumProc : alchemyMaximumProc;
  const chance = table[Math.floor(normalizeRecipeMastery(mastery) / 50)]! / 100;
  // Recipe quantity contracts use thousandths; preserve the same precision in both planners.
  return Number((2.5 + 1.5 * chance).toFixed(3));
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
