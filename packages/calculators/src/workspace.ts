import { DEFAULT_REGION, REGION_CODES } from '@bdo/shared';
import { z } from 'zod';

import {
  activitySchema,
  boxSchema,
  craftingSchema,
  defaultTax,
  enhancementSchema,
  failstackSchema,
  gearSchema,
  inventorySchema,
  investmentSchema,
  labelSchema,
  marketSchema,
  moneySchema,
  recipeSchema,
  taxShape,
  trainingSchema,
} from './models';

const regions = REGION_CODES;
import {
  characterSchema,
  familyProfileSchema,
  personalPlanSchema,
  reservationIssues,
} from './personal';
import { workerEmpireSchema } from './worker-empire';

const id = z.string().min(1).max(64);
const timestamp = z.string().refine((v) => Number.isFinite(Date.parse(v)), 'Data inválida.');
const region = z.enum(regions);
export const quoteSchema = z.object({
  id,
  name: labelSchema,
  category: labelSchema,
  region,
  price: moneySchema,
  source: z.enum(['manual', 'arsha']).default('manual'),
  nameLocale: z.string().max(16).nullable().default(null),
  itemId: z.number().int().positive().nullable().default(null),
  subId: z.number().int().nonnegative().nullable().default(null),
  stock: z.number().int().min(0).max(1e9),
  observedAt: timestamp,
  favorite: z.boolean(),
  history: z
    .array(
      z.object({
        price: moneySchema,
        stock: z.number().int().min(0).max(1e9),
        observedAt: timestamp,
        source: z.enum(['manual', 'arsha']).default('manual'),
      }),
    )
    .max(120),
});
export const buffSchema = z.object({
  id,
  name: labelSchema,
  effect: labelSchema,
  group: labelSchema,
  value: z.number().min(-100000).max(100000),
  unit: z.string().max(20),
  duration: z.number().int().min(0).max(1440),
  enabled: z.boolean(),
  startedAt: z.number().int().min(0).nullable(),
});
const presetBase = { id, name: labelSchema, region, savedAt: timestamp };
export const presetSchema = z.discriminatedUnion('tool', [
  z.object({ ...presetBase, tool: z.literal('market'), input: marketSchema }),
  z.object({ ...presetBase, tool: z.literal('crafting'), input: craftingSchema }),
  z.object({ ...presetBase, tool: z.literal('enhancement'), input: enhancementSchema }),
  z.object({ ...presetBase, tool: z.literal('failstack'), input: failstackSchema }),
  z.object({ ...presetBase, tool: z.literal('box'), input: boxSchema }),
  z.object({ ...presetBase, tool: z.literal('activity'), input: activitySchema }),
  z.object({ ...presetBase, tool: z.literal('training'), input: trainingSchema }),
  z.object({ ...presetBase, tool: z.literal('investment'), input: investmentSchema }),
  z.object({ ...presetBase, tool: z.literal('gear'), input: gearSchema }),
]);
export const workspaceSchema = z
  .object({
    schemaVersion: z.literal(1),
    activeCharacterId: id.nullable().default(null),
    familySilver: moneySchema.default('0'),
    families: z.partialRecord(region, familyProfileSchema).optional(),
    familySilverRegion: region.default('sa'),
    taxOptions: z.object(taxShape).default(() => ({ ...defaultTax })),
    demonstration: z
      .object({ version: z.literal('brazil-v1'), label: z.string().max(80) })
      .nullable()
      .default(null),
    familyLifeSkills: z
      .record(
        z.enum([
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
        ]),
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
    characters: z.array(characterSchema).max(30).default([]),
    personalPlans: z.array(personalPlanSchema).max(200).default([]),
    workerEmpires: z.array(workerEmpireSchema).max(30).default([]),
    region,
    quotes: z.array(quoteSchema).max(300),
    inventory: z
      .array(
        inventorySchema.extend({
          region: region.default('sa'),
          kind: z.enum(['storage', 'inventory']).optional(),
          characterId: id.optional(),
          updatedAt: timestamp.optional(),
          sources: z
            .array(
              z.object({
                hash: z.string().regex(/^[a-f0-9]{64}$/),
                slot: z.number().int().min(0).max(399),
                position: z.string().max(100).optional(),
                capture: z.number().int().min(1).max(8),
              }),
            )
            .max(32)
            .optional(),
        }),
      )
      .max(4000),
    screenshotImports: z
      .array(
        z.object({
          id,
          region,
          createdAt: timestamp,
          mode: z.enum(['reviewed', 'merge', 'replace', 'gear']),
          itemCount: z.number().int().min(1).max(3200),
          locations: z.array(labelSchema).max(8),
          sourceHashes: z.array(z.string().regex(/^[a-f0-9]{64}$/)).max(8),
        }),
      )
      .max(60)
      .default([]),
    recipes: z.array(recipeSchema).max(100),
    gear: z.array(z.object({ id, name: labelSchema, region, input: gearSchema })).max(100),
    sessions: z
      .array(z.object({ id, createdAt: timestamp, region, input: activitySchema }))
      .max(500),
    buffs: z.array(buffSchema).max(100),
    presets: z.array(presetSchema).max(200),
    projects: z
      .array(
        z.object({
          id,
          name: labelSchema,
          region,
          materials: z
            .array(
              z.object({
                itemId: z.number().int().positive().optional(),
                name: labelSchema,
                target: z.number().int().min(1).max(1e9),
                price: moneySchema,
              }),
            )
            .min(1)
            .max(100),
        }),
      )
      .max(100)
      .default([]),
    buffPresets: z
      .array(z.object({ id, name: labelSchema, buffIds: z.array(id).max(100) }))
      .max(100)
      .default([]),
    enhancementLog: z
      .array(
        z.object({
          id,
          createdAt: timestamp,
          region,
          name: labelSchema,
          chance: z.number().min(0).max(100),
          cost: moneySchema,
          outcome: z.enum(['success', 'failure']),
        }),
      )
      .max(1000),
  })
  .superRefine((state, context) => {
    for (const message of reservationIssues(state.personalPlans, state.inventory))
      context.addIssue({ code: 'custom', message, path: ['personalPlans'] });
    const collections = [
      'quotes',
      'inventory',
      'recipes',
      'gear',
      'sessions',
      'buffs',
      'presets',
      'enhancementLog',
      'projects',
      'buffPresets',
      'characters',
      'personalPlans',
      'workerEmpires',
    ] as const;
    for (const name of collections) {
      const seen = new Set<string>();
      for (const [index, row] of state[name].entries()) {
        if (seen.has(row.id))
          context.addIssue({
            code: 'custom',
            message: 'IDs duplicados no backup.',
            path: [name, index, 'id'],
          });
        seen.add(row.id);
      }
    }
  });
export type Workspace = z.infer<typeof workspaceSchema>;
export type Quote = z.infer<typeof quoteSchema>;
export type Buff = z.infer<typeof buffSchema>;
export type ToolPreset = z.infer<typeof presetSchema>;
export const emptyWorkspace = (): Workspace => ({
  schemaVersion: 1,
  activeCharacterId: null,
  familySilver: '0',
  familySilverRegion: 'sa',
  taxOptions: { ...defaultTax },
  demonstration: null,
  familyLifeSkills: null,
  characters: [],
  personalPlans: [],
  workerEmpires: [],
  region: DEFAULT_REGION,
  quotes: [],
  inventory: [],
  screenshotImports: [],
  recipes: [],
  gear: [],
  sessions: [],
  buffs: [],
  presets: [],
  enhancementLog: [],
  projects: [],
  buffPresets: [],
});
