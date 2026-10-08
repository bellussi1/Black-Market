import { DEFAULT_REGION, REGION_CODES } from '@bdo/shared';
import { z } from 'zod';

import {
  activitySchema,
  boxSchema,
  craftingSchema,
  enhancementSchema,
  failstackSchema,
  gearSchema,
  inventorySchema,
  investmentSchema,
  labelSchema,
  marketSchema,
  moneySchema,
  recipeSchema,
  trainingSchema,
} from './models';

const regions = REGION_CODES;
import { characterSchema, personalPlanSchema, reservationIssues } from './personal';
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
    characters: z.array(characterSchema).max(30).default([]),
    personalPlans: z.array(personalPlanSchema).max(200).default([]),
    workerEmpires: z.array(workerEmpireSchema).max(30).default([]),
    region,
    quotes: z.array(quoteSchema).max(300),
    inventory: z.array(inventorySchema.extend({ region: region.default('sa') })).max(1000),
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
  characters: [],
  personalPlans: [],
  workerEmpires: [],
  region: DEFAULT_REGION,
  quotes: [],
  inventory: [],
  recipes: [],
  gear: [],
  sessions: [],
  buffs: [],
  presets: [],
  enhancementLog: [],
  projects: [],
  buffPresets: [],
});
