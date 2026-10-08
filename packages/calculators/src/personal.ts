import { z } from 'zod';

import { moneySchema } from './models';

export const lifeSkills = [
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
] as const;
export const gearSlots = [
  'mainhand',
  'offhand',
  'awakening',
  'helmet',
  'armor',
  'gloves',
  'shoes',
  'necklace',
  'belt',
  'ring1',
  'ring2',
  'earring1',
  'earring2',
  'tool',
  'clothes',
] as const;
export const characterSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(80),
    region: z.string().regex(/^[a-z0-9-]{2,12}$/),
    silver: moneySchema.default('0'),
    energy: z.number().int().min(0).max(2000).default(0),
    mainAp: z.number().int().min(0).max(5000).default(0),
    awakeAp: z.number().int().min(0).max(5000).default(0),
    dp: z.number().int().min(0).max(5000).default(0),
    activeMinutes: z.number().int().min(1).max(1440).default(60),
    afkMinutes: z.number().int().min(0).max(1440).default(0),
    mastery: z
      .record(z.enum(lifeSkills), z.number().int().min(0).max(5000))
      .default(
        () =>
          Object.fromEntries(lifeSkills.map((skill) => [skill, 0])) as Record<
            (typeof lifeSkills)[number],
            number
          >,
      ),
    gear: z
      .array(
        z.object({
          slot: z.enum(gearSlots),
          itemId: z.number().int().positive(),
          name: z.string().min(1).max(140),
          level: z.number().int().min(0).max(30).default(0),
          caphras: z.number().int().min(0).max(20).default(0),
        }),
      )
      .max(15)
      .default([]),
  })
  .superRefine((character, context) => {
    if (new Set(character.gear.map((part) => part.slot)).size !== character.gear.length)
      context.addIssue({
        code: 'custom',
        message: 'Use apenas um equipamento em cada espaço.',
        path: ['gear'],
      });
  });
export type CharacterProfile = z.infer<typeof characterSchema>;
export const personalPlanSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(140),
  region: z.string().regex(/^[a-z0-9-]{2,12}$/),
  status: z.enum(['draft', 'reserved', 'completed', 'cancelled']).default('draft'),
  createdAt: z.string().datetime(),
  estimatedProfit: z
    .string()
    .regex(/^-?\d{1,30}$/)
    .nullable()
    .default(null),
  minutes: z.number().min(0).max(1e6).default(0),
  materials: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        name: z.string().min(1).max(140),
        quantity: z.number().int().min(1).max(1e9),
        location: z.string().max(140).optional(),
      }),
    )
    .max(100)
    .default([]),
  tasks: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        label: z.string().min(1).max(300),
        done: z.boolean().default(false),
      }),
    )
    .max(100)
    .default([]),
});
export type PersonalPlan = z.infer<typeof personalPlanSchema>;
export function availableInventory<
  T extends { region: string; itemId?: number; location: string; quantity: number },
>(plans: PersonalPlan[], inventory: T[]): T[] {
  const remaining = inventory.map((row) => ({ ...row }));
  for (const plan of plans.filter((row) => row.status === 'reserved'))
    for (const material of plan.materials) {
      let needed = material.quantity;
      for (const row of remaining) {
        if (
          row.region !== plan.region ||
          row.itemId !== material.itemId ||
          (material.location && row.location !== material.location)
        )
          continue;
        const used = Math.min(needed, row.quantity);
        row.quantity -= used;
        needed -= used;
        if (!needed) break;
      }
    }
  return remaining;
}

export function reservationIssues(
  plans: PersonalPlan[],
  inventory: { region: string; itemId?: number; location: string; quantity: number }[],
): string[] {
  const remaining = inventory.map((row) => ({ ...row }));
  const issues: string[] = [];
  for (const plan of plans.filter((row) => row.status === 'reserved'))
    for (const material of plan.materials) {
      let needed = material.quantity;
      for (const stock of remaining) {
        if (
          stock.region !== plan.region ||
          stock.itemId !== material.itemId ||
          (material.location && stock.location !== material.location)
        )
          continue;
        const used = Math.min(needed, stock.quantity);
        stock.quantity -= used;
        needed -= used;
        if (!needed) break;
      }
      if (needed)
        issues.push(
          'Materiais insuficientes para reservar ' +
            material.name +
            '. Confira o estoque e as outras reservas.',
        );
    }
  return issues;
}
