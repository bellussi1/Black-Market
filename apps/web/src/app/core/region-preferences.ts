import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  computed,
  inject,
  Injectable,
  makeStateKey,
  PLATFORM_ID,
  REQUEST,
  signal,
  TransferState,
} from '@angular/core';
import { DEFAULT_REGION, REGION_CODES } from '@bdo/shared/markets';
export const regions = REGION_CODES;
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
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly region = signal<Region>(DEFAULT_REGION);
  readonly message = signal('');
  readonly blocked = signal(false);
  private readonly metadata = signal(emptySummary);
  private readonly listeners = new Set<(region: Region) => void>();
  readonly counts = computed(() => [
    {
      label: $localize`Cotações nesta região`,
      value: this.metadata().quotes.filter((r) => r.region === this.region()).length,
      path: '/market',
    },
    {
      label: $localize`Materiais no armazém`,
      value: this.metadata().inventory.filter((r) => r.region === this.region()).length,
      path: '/storage',
    },
    {
      label: $localize`Receitas manuais`,
      value: this.metadata().recipes.length,
      path: '/crafting',
    },
    {
      label: $localize`Presets de cálculo`,
      value: this.metadata().presets.filter((r) => r.region === this.region()).length,
      path: '/market',
    },
  ]);
  constructor() {
    const state = inject(TransferState);
    const regionKey = makeStateKey<Region>('black-market-region');
    const browser = this.browser;
    const request = inject(REQUEST, { optional: true });
    const cookie = browser ? (this.document.cookie ?? '') : (request?.headers.get('cookie') ?? '');
    const selected = /(?:^|;\s*)black-market-region=([a-z]+)/.exec(cookie)?.[1];
    if (selected && regions.includes(selected as Region)) this.region.set(selected as Region);
    if (!browser) {
      state.set(regionKey, this.region());
      return;
    }
    if (state.hasKey(regionKey)) {
      this.region.set(state.get(regionKey, DEFAULT_REGION));
      state.remove(regionKey);
      afterNextRender(() => this.restore());
    } else this.restore();
  }
  private restore() {
    try {
      let selected = this.region();
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
            selected = summary.region as Region;
        }
      }
      if (savedRegion && regions.includes(savedRegion as Region)) selected = savedRegion as Region;
      this.setRegion(selected);
    } catch {
      this.message.set(
        'Não foi possível ler os dados locais. Confira Dados e backup antes de editar.',
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
    if (!this.browser) {
      this.listeners.forEach((listener) => listener(value as Region));
      return;
    }
    try {
      localStorage.setItem('black-market.region', value);
      this.document.cookie = `black-market-region=${value}; Path=/; Max-Age=31536000; SameSite=Lax${this.document.location?.protocol === 'https:' ? '; Secure' : ''}`;
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
