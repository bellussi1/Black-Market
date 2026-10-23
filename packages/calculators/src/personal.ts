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
export type LifeSkill = (typeof lifeSkills)[number];

export const lifeEquipmentKinds = [
  'tool',
  'costume',
  'accessory',
  'artifact',
  'lightstone',
  'huntingMusket',
  'node',
  'alchemyStone',
  'purityOrb',
  'other',
] as const;
export type LifeEquipmentKind = (typeof lifeEquipmentKinds)[number];

export const lifeEquipmentItemLimit = 50;

export const lifeEquipmentItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  catalogItemId: z.number().int().positive(),
  name: z.string().trim().min(1).max(140),
  kind: z.enum(lifeEquipmentKinds),
  slotLabel: z.string().trim().max(80).optional(),
  enhancementText: z.string().trim().max(100).nullable().default(null),
});
export type LifeEquipmentItem = z.infer<typeof lifeEquipmentItemSchema>;

const lifeEquipmentItemListSchema = z
  .array(lifeEquipmentItemSchema)
  .max(lifeEquipmentItemLimit)
  .default([]);
const lifeEquipmentBySkillShape = Object.fromEntries(
  lifeSkills.map((skill) => [skill, lifeEquipmentItemListSchema]),
) as Record<LifeSkill, typeof lifeEquipmentItemListSchema>;
const lifeEquipmentBySkillSchema = z.object(lifeEquipmentBySkillShape).prefault({});

export const lifeEquipmentSchema = z
  .object({
    sharedItems: lifeEquipmentItemListSchema,
    bySkill: lifeEquipmentBySkillSchema,
  })
  .superRefine((equipment, context) => {
    const internalIds = new Set<string>();
    const sharedCatalogIds = new Set(equipment.sharedItems.map((item) => item.catalogItemId));

    for (const [index, item] of equipment.sharedItems.entries()) {
      if (!(['accessory', 'alchemyStone', 'purityOrb'] as LifeEquipmentKind[]).includes(item.kind))
        context.addIssue({
          code: 'custom',
          message: 'Somente acessórios, pedras alquímicas e Orbes da Pureza são itens comuns.',
          path: ['sharedItems', index, 'kind'],
        });
      if (internalIds.has(item.id))
        context.addIssue({
          code: 'custom',
          message: 'IDs internos de equipamento de Vida devem ser únicos.',
          path: ['sharedItems', index, 'id'],
        });
      internalIds.add(item.id);
    }

    for (const skill of lifeSkills) {
      for (const [index, item] of equipment.bySkill[skill].entries()) {
        if (internalIds.has(item.id))
          context.addIssue({
            code: 'custom',
            message: 'IDs internos de equipamento de Vida devem ser únicos.',
            path: ['bySkill', skill, index, 'id'],
          });
        internalIds.add(item.id);
        if (sharedCatalogIds.has(item.catalogItemId))
          context.addIssue({
            code: 'custom',
            message: 'Um item não pode estar nas listas comum e de profissão ao mesmo tempo.',
            path: ['bySkill', skill, index, 'catalogItemId'],
          });
      }
    }
  });
export type LifeEquipment = z.infer<typeof lifeEquipmentSchema>;

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
  'alchemyStone',
  'tome',
] as const;
export const characterSchema = z
  .object({
    id: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(80),
    region: z.string().regex(/^[a-z0-9-]{2,12}$/),
    familyName: z.string().trim().max(80).default(''),
    className: z.string().trim().max(40).default(''),
    specialization: z.enum(['succession', 'awakening']).default('succession'),
    level: z.number().int().min(1).max(100).default(1),
    server: z.string().max(40).default(''),
    contribution: z.number().int().min(0).max(2000).default(0),
    energyMax: z.number().int().min(0).max(2000).default(0),
    inventoryCapacity: z.number().int().min(0).max(300).default(0),
    inventoryUsed: z.number().int().min(0).max(300).default(0),
    weightLimit: z.number().min(0).max(10000).default(0),
    carriedWeight: z.number().min(0).max(10000).default(0),
    crystals: z
      .array(z.object({ itemId: z.number().int().positive(), name: z.string().max(140) }))
      .max(20)
      .default([]),
    artifacts: z
      .array(z.object({ itemId: z.number().int().positive(), name: z.string().min(1).max(140) }))
      .max(2)
      .optional(),
    lightstones: z
      .array(z.object({ itemId: z.number().int().positive(), name: z.string().min(1).max(140) }))
      .max(4)
      .optional(),
    pearlOutfits: z
      .array(z.object({ itemId: z.number().int().positive(), name: z.string().min(1).max(140) }))
      .max(20)
      .optional(),
    activityPresets: z
      .array(
        z.object({
          id: z.string().min(1).max(64),
          name: z.string().min(1).max(80),
          gear: z
            .array(
              z.object({
                slot: z.enum(gearSlots),
                itemId: z.number().int().positive(),
                name: z.string().min(1).max(140),
                level: z.number().int().min(0).max(30),
                caphras: z.number().int().min(0).max(20),
              }),
            )
            .max(gearSlots.length),
          crystals: z
            .array(
              z.object({ itemId: z.number().int().positive(), name: z.string().min(1).max(140) }),
            )
            .max(20),
        }),
      )
      .max(20)
      .optional(),
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
          levelConfirmed: z.boolean().optional(),
          caphrasConfirmed: z.boolean().optional(),
        }),
      )
      .max(gearSlots.length)
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
export const familyProfileSchema = z.object({
  name: z.string().trim().max(80).default(''),
  lifeEquipment: lifeEquipmentSchema.prefault({}),
  contribution: z.number().int().min(0).max(2000).nullable().default(null),
  energyMax: z.number().int().min(0).max(2000).nullable().default(null),
  lifeSkills: z
    .partialRecord(
      z.enum(lifeSkills),
      z.object({
        tier: z.enum([
          'Iniciante',
          'Aprendiz',
          'Hábil',
          'Profissional',
          'Artesão',
          'Mestre',
          'Guru',
        ]),
        level: z.number().int().min(1).max(100),
        xpPercent: z.number().min(0).max(100),
      }),
    )
    .nullable()
    .default(null),
  pets: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        name: z.string().min(1).max(80),
        tier: z.number().int().min(1).max(5),
        level: z.number().int().min(1).max(10),
        skills: z.string().max(500).default(''),
      }),
    )
    .max(50)
    .default([]),
  mounts: z
    .array(
      z.object({
        id: z.string().min(1).max(64),
        name: z.string().min(1).max(80),
        kind: z.string().min(1).max(80),
        level: z.number().int().min(1).max(100),
        notes: z.string().max(500).default(''),
      }),
    )
    .max(100)
    .default([]),
});
export const personalPlanSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().min(1).max(140),
  region: z.string().regex(/^[a-z0-9-]{2,12}$/),
  status: z.enum(['draft', 'reserved', 'completed', 'cancelled']).default('draft'),
  createdAt: z.string().datetime(),
  sourceItemId: z.number().int().positive().optional(),
  excludedStockLocations: z.array(z.string().max(400)).max(4000).optional(),
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
