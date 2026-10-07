import { Injectable, computed, signal } from '@angular/core';
export const regions = ['sa', 'na', 'eu', 'sea', 'kr', 'jp', 'tw'] as const;
export type Region = (typeof regions)[number];
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;
interface SummaryInput {
  schemaVersion: number;
  region: string;
  quotes: { region: string }[];
  inventory: { region: string }[];
  recipes: unknown[];
  presets: { region: string }[];
}
const emptySummary = {
  quotes: [] as { region: string }[],
  inventory: [] as { region: string }[],
  recipes: [] as unknown[],
  presets: [] as { region: string }[],
};
@Injectable({ providedIn: 'root' })
export class RegionPreferences {
  readonly region = signal<Region>('sa');
  readonly message = signal('');
  readonly blocked = signal(false);
  private readonly metadata = signal(emptySummary);
  private readonly listeners = new Set<(region: Region) => void>();
  readonly counts = computed(() => [
    {
      label: 'Cotações nesta região',
      value: this.metadata().quotes.filter((r) => r.region === this.region()).length,
      path: '/market',
    },
    {
      label: 'Materiais no armazém',
      value: this.metadata().inventory.filter((r) => r.region === this.region()).length,
      path: '/storage',
    },
    { label: 'Receitas manuais', value: this.metadata().recipes.length, path: '/crafting' },
    {
      label: 'Presets de cálculo',
      value: this.metadata().presets.filter((r) => r.region === this.region()).length,
      path: '/settings',
    },
  ]);
  constructor() {
    try {
      const savedRegion = localStorage.getItem('black-market.region');
      const raw = localStorage.getItem('black-market.workspace.v1');
      if (raw && raw.length <= MAX_BACKUP_BYTES) {
        const parsed: unknown = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === 'object' &&
          'schemaVersion' in parsed &&
          parsed.schemaVersion === 1
        ) {
          const summary = parsed as Partial<SummaryInput>;
          const regionRows = (value: unknown): { region: string }[] =>
            Array.isArray(value)
              ? value
                  .filter(
                    (r): r is { region: string } =>
                      Boolean(r) && typeof r === 'object' && typeof r.region === 'string',
                  )
                  .map((r) => ({ region: r.region }))
              : [];
          this.metadata.set({
            quotes: regionRows(summary.quotes),
            inventory: regionRows(summary.inventory),
            recipes: Array.isArray(summary.recipes) ? summary.recipes.map(() => null) : [],
            presets: regionRows(summary.presets),
          });
          if (summary.region && regions.includes(summary.region as Region))
            this.region.set(summary.region as Region);
        }
      }
      if (savedRegion && regions.includes(savedRegion as Region))
        this.region.set(savedRegion as Region);
    } catch {
      this.message.set(
        'Não foi possível ler o caderno local. Confira Dados e backup antes de editar.',
      );
    }
  }
  onRegionChange(listener: (region: Region) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  setRegion(value: string): void {
    if (!regions.includes(value as Region) || value === this.region() || this.blocked()) return;
    this.region.set(value as Region);
    try {
      localStorage.setItem('black-market.region', value);
    } catch {
      this.message.set('O navegador não permitiu salvar a preferência de região.');
    }
    this.listeners.forEach((listener) => listener(value as Region));
  }
  setSummary(state: SummaryInput): void {
    this.metadata.set({
      quotes: state.quotes.map((r) => ({ region: r.region })),
      inventory: state.inventory.map((r) => ({ region: r.region })),
      recipes: state.recipes.map(() => null),
      presets: state.presets.map((r) => ({ region: r.region })),
    });
  }
}
