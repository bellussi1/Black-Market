import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { RegionPreferences, regions } from './region-preferences';
import { z } from 'zod';
import {
  inventorySchema,
  recipeSchema,
  gearSchema,
  activitySchema,
  marketSchema,
  craftingSchema,
  enhancementSchema,
  failstackSchema,
  boxSchema,
  trainingSchema,
  investmentSchema,
  moneySchema,
  labelSchema,
  type CalculatorKey,
} from '@bdo/calculators';

export { regions } from './region-preferences';
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
  region: 'sa',
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
const STORAGE_KEY = 'black-market.workspace.v1';

@Injectable({ providedIn: 'root' })
export class WorkspaceStore implements OnDestroy {
  private readonly preferences = inject(RegionPreferences);
  private readonly internal = signal<Workspace>(emptyWorkspace());
  readonly data = this.internal.asReadonly();
  readonly message: RegionPreferences['message'];
  readonly blocked: RegionPreferences['blocked'];
  private readonly unsubscribe: () => void;
  private recovery = '';

  constructor() {
    const preferences = this.preferences;
    this.message = preferences.message;
    this.blocked = preferences.blocked;
    this.internal.update((state) => ({ ...state, region: preferences.region() }));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.recovery = raw;
        this.internal.set({
          ...workspaceSchema.parse(JSON.parse(raw)),
          region: preferences.region(),
        });
      }
    } catch {
      this.message.set(
        'Não foi possível ler seus dados locais. Exporte um backup antes de substituir o armazenamento.',
      );
      this.blocked.set(Boolean(this.recovery));
    }
    preferences.setSummary(this.data());
    this.unsubscribe = preferences.onRegionChange((region) => {
      if (this.data().region !== region) this.update((state) => ({ ...state, region }));
    });
  }
  update(change: (state: Workspace) => Workspace): boolean {
    if (this.blocked()) {
      this.message.set(
        'O backup local precisa ser recuperado em Dados e backup antes de salvar alterações.',
      );
      return false;
    }
    return this.replace(change(this.data()));
  }
  replace(raw: unknown): boolean {
    try {
      const value = workspaceSchema.parse(raw);
      this.internal.set(value);
      this.blocked.set(false);
      this.preferences.setSummary(value);
      this.preferences.setRegion(value.region);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        this.message.set('');
        this.recovery = '';
      } catch {
        this.message.set(
          'Alterações disponíveis nesta sessão. O navegador não permitiu salvar: exporte um backup.',
        );
      }
      return true;
    } catch (error) {
      this.message.set(validationMessage(error));
      return false;
    }
  }
  setRegion(value: string): void {
    this.preferences.setRegion(value);
  }
  ngOnDestroy(): void {
    this.unsubscribe();
  }
  savePreset(tool: CalculatorKey, name: string, input: unknown): boolean {
    const preset = presetSchema.safeParse({
      id: crypto.randomUUID(),
      name,
      input,
      tool,
      region: this.data().region,
      savedAt: new Date().toISOString(),
    });
    if (!preset.success) {
      this.message.set(validationMessage(preset.error));
      return false;
    }
    return this.update((s) => ({ ...s, presets: [...s.presets, preset.data] }));
  }
  removePreset(id: string): void {
    this.update((s) => ({ ...s, presets: s.presets.filter((r) => r.id !== id) }));
  }
  exportBackup(): void {
    download(
      'black-market-backup.json',
      this.blocked() ? this.recovery : JSON.stringify({ ...this.data() }, null, 2),
      'application/json',
    );
  }
}
export function validationMessage(error: unknown): string {
  if (error instanceof SyntaxError) return 'O arquivo não é um JSON válido.';
  if (error instanceof z.ZodError)
    return error.issues
      .slice(0, 3)
      .map((i) => {
        const labels: Record<string, string> = {
          price: 'Preço',
          quantity: 'Quantidade',
          cost: 'Custo',
          name: 'Nome',
          taxPercent: 'Imposto',
          collectionBonus: 'Bônus de coleta',
          minutes: 'Tempo',
          chance: 'Chance',
          cap: 'Teto de chance',
          pity: 'Pity',
          currentPity: 'Essência atual',
          limit: 'Tentativas',
          probability: 'Probabilidade',
          yield: 'Rendimento',
          crafts: 'Número de crafts',
          owned: 'Estoque',
          location: 'Local',
          target: 'Meta',
          region: 'Região',
        };
        const field = String(i.path[i.path.length - 1] ?? '');
        const row = i.path.find((p) => typeof p === 'number');
        let message = i.message;
        if (i.code === 'invalid_type') message = 'Preencha o campo com um valor válido.';
        if (i.code === 'too_small')
          message = 'Valor abaixo do mínimo permitido: ' + String(i.minimum) + '.';
        if (i.code === 'too_big')
          message = 'Valor acima do máximo permitido: ' + String(i.maximum) + '.';
        if (i.code === 'invalid_value') message = 'Selecione uma opção válida.';
        return (
          (labels[field]
            ? labels[field] + (row !== undefined ? ' · linha ' + (Number(row) + 1) : '') + ': '
            : '') + message
        );
      })
      .join(' · ');
  return error instanceof Error ? error.message : 'Confira os dados informados.';
}
export function evaluate<T>(calculate: () => T): { value: T | null; error: string | null } {
  try {
    return { value: calculate(), error: null };
  } catch (error) {
    return { value: null, error: validationMessage(error) };
  }
}
export function silver(value: string | bigint | null | undefined): string {
  if (value === null || value === undefined) return '—';
  try {
    return new Intl.NumberFormat('pt-BR').format(BigInt(value));
  } catch {
    return '—';
  }
}
export function number(value: number | null | undefined, digits = 2): string {
  return value === null || value === undefined
    ? '—'
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: digits }).format(value);
}
export function date(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}
export function download(name: string, content: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
