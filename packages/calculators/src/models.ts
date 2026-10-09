import { z } from 'zod';

export const moneySchema = z
  .string()
  .regex(/^\d{1,24}$/, 'Informe prata inteira, sem separadores (até 24 dígitos).');
export const labelSchema = z.string().trim().min(1, 'Informe um nome.').max(140);
export const countSchema = z.number().int().min(0).max(1_000_000_000);
const positiveCount = countSchema.min(1);
const percent = z
  .number()
  .min(0)
  .max(100)
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001, 'Use até duas casas decimais.');
const decimal = z
  .number()
  .min(0)
  .max(1_000_000)
  .refine(
    (v) => Math.abs(v * 1000 - Math.round(v * 1000)) < 0.00001,
    'Use até três casas decimais.',
  );
export const taxShape = {
  taxPercent: percent,
  valuePack: z.boolean(),
  collectionBonus: percent.max(50),
  exempt: z.boolean(),
};
export const defaultTax = {
  taxPercent: 35,
  valuePack: false,
  collectionBonus: 0,
  exempt: false,
};
export const marketSchema = z.object({
  ...taxShape,
  price: moneySchema,
  quantity: positiveCount,
  cost: moneySchema,
});
export const ingredientSchema = z.object({
  itemId: z.number().int().positive().optional(),
  name: labelSchema,
  quantity: decimal.positive(),
  owned: decimal,
  price: moneySchema,
});
export const craftingSchema = z.object({
  ...taxShape,
  crafts: positiveCount.max(1_000_000),
  yield: decimal.positive(),
  salePrice: moneySchema,
  extraCost: moneySchema,
  minutes: decimal.positive(),
  ingredients: z.array(ingredientSchema).min(1).max(40),
});
export const enhancementSchema = z
  .object({
    chance: percent,
    increase: percent,
    cap: percent,
    limit: positiveCount.max(2000),
    pity: countSchema.max(2000),
    currentPity: countSchema.max(2000),
    attemptCost: moneySchema,
    failureCost: moneySchema,
    guaranteedCost: moneySchema,
    stackCost: moneySchema,
    buyPrice: moneySchema,
  })
  .refine((v) => v.cap >= v.chance, 'O teto deve ser maior ou igual à chance inicial.')
  .refine(
    (v) => (v.pity === 0 ? v.currentPity === 0 : v.currentPity <= v.pity),
    'A essência atual deve estar entre zero e o limite de pity.',
  );
export const failstackSchema = z.object({
  baseCost: moneySchema,
  steps: z
    .array(
      z.object({
        label: labelSchema,
        chance: percent.max(99.99),
        cost: moneySchema,
        failureCost: moneySchema,
      }),
    )
    .min(1)
    .max(30),
});
export const boxSchema = z
  .object({
    ...taxShape,
    boxPrice: moneySchema,
    boxes: positiveCount.max(1_000_000),
    outcomes: z
      .array(
        z.object({
          itemId: z.number().int().positive().optional(),
          name: labelSchema,
          probability: percent,
          quantity: positiveCount,
          price: moneySchema,
        }),
      )
      .min(1)
      .max(40),
  })
  .refine(
    (v) => v.outcomes.reduce((n, r) => n + Math.round(r.probability * 100), 0) === 10_000,
    'As probabilidades dos resultados exclusivos devem somar 100%.',
  );
export const activitySchema = z.object({
  ...taxShape,
  mode: z.enum(['active', 'afk']).optional(),
  skill: z
    .enum([
      'gathering',
      'cooking',
      'alchemy',
      'processing',
      'fishing',
      'hunting',
      'training',
      'trading',
      'farming',
      'sailing',
      'barter',
    ])
    .optional(),
  mastery: z.number().int().min(0).max(5000).optional(),
  name: labelSchema,
  minutes: decimal.min(0.001),
  energy: countSchema,
  cost: moneySchema,
  directIncome: moneySchema,
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive().optional(),
        name: labelSchema,
        quantity: positiveCount,
        price: moneySchema,
      }),
    )
    .max(40),
});
export const trainingSchema = z.object({
  remainingXp: z.number().int().min(1).max(Number.MAX_SAFE_INTEGER),
  xpPerHour: z.number().min(0.001).max(1e12),
  sessionMinutes: positiveCount.max(1440),
});
export const investmentSchema = z.object({
  upgradeCost: moneySchema,
  currentHourly: moneySchema,
  nextHourly: moneySchema,
  dailyHours: decimal.positive().max(24),
});
export const upgradeSchema = z.object({
  id: z.string().min(1).max(64),
  name: labelSchema,
  cost: moneySchema,
  mainApGain: countSchema.max(1000),
  awakeApGain: countSchema.max(1000),
  dpGain: countSchema.max(1000),
});
export const gearSchema = z.object({
  mainAp: countSchema.max(5000),
  awakeAp: countSchema.max(5000),
  dp: countSchema.max(5000),
  budget: moneySchema,
  upgrades: z.array(upgradeSchema).max(50),
});
export const recipeSchema = z.object({
  itemId: z.number().int().positive().optional(),
  id: z.string().min(1).max(64),
  name: labelSchema,
  yield: decimal.positive().max(1_000_000),
  ingredients: z
    .array(
      z.object({
        itemId: z.number().int().positive().optional(),
        name: labelSchema,
        quantity: positiveCount.max(1_000_000),
        price: moneySchema,
        recipeId: z.string().min(1).max(64).nullable(),
      }),
    )
    .min(1)
    .max(30),
});
export const inventorySchema = z.object({
  itemId: z.number().int().positive().optional(),
  id: z.string().min(1).max(64),
  name: labelSchema,
  location: labelSchema,
  quantity: countSchema,
  target: countSchema,
  price: moneySchema,
});
export const productionSchema = z.object({
  recipeId: z.string().min(1).max(64),
  quantity: positiveCount.max(1_000_000),
  recipes: z.array(recipeSchema).min(1).max(100),
  inventory: z.array(inventorySchema).max(1000),
});
export type MarketInput = z.infer<typeof marketSchema>;
export type CraftingInput = z.infer<typeof craftingSchema>;
export type EnhancementInput = z.infer<typeof enhancementSchema>;
export type FailstackInput = z.infer<typeof failstackSchema>;
export type BoxInput = z.infer<typeof boxSchema>;
export type ActivityInput = z.infer<typeof activitySchema>;
export type TrainingInput = z.infer<typeof trainingSchema>;
export type InvestmentInput = z.infer<typeof investmentSchema>;
export type GearInput = z.infer<typeof gearSchema>;
export type ManualRecipe = z.infer<typeof recipeSchema>;
export type InventoryEntry = z.infer<typeof inventorySchema>;
export type ProductionInput = z.infer<typeof productionSchema>;
export type TaxOptions = typeof defaultTax;
