import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  type OnDestroy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  availableInventory,
  compareProductionPlans,
  planProduction,
  type ProductionChoice,
  type ProductionEstimate,
  type ProductionPlan,
  type ProductionPlannerInput,
  type ProductionQuantity,
  type ProductionRecipe,
} from '@bdo/calculators';
import type { CatalogItemDetail, CatalogRecipe, ProductionCatalogResponse } from '@bdo/shared';
import { firstValueFrom } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { ProductionApi } from '../../core/production-api';
import {
  createProductionDemoWorkspace,
  productionDemoCalibrations,
  productionDemoExplanation,
  productionDemoItemIds,
} from '../../core/production-demo';
import { WorkspaceStore } from '../../core/workspace-store';
import { silver } from '../../shared/formatters';

type Quotes = ProductionPlannerInput['quotes'];
/** Provider summaries merge enhancement variants. Only known plain materials are safe here. */
export function canRequestProductionQuote(item: CatalogItemDetail): boolean {
  const enhancement = item.sourceData['maxEnhance'];
  if (typeof enhancement === 'number' && enhancement > 0) return false;
  if (item.sourceData['marketable'] === false) return false;
  return [
    'potion',
    'food',
    'wood',
    'etc',
    'material',
    'plant',
    'crystal',
    'blackstone',
    'ore',
    'fish',
    'meat',
    'fruit',
    'seed',
    'herb',
  ].includes((item.category ?? '').toLowerCase());
}
export function productionQuantity(value: string | null): ProductionQuantity {
  if (!value) return null;
  if (/^\d+(?:\.\d+)?$/.test(value) && Number(value) > 0) return Number(value);
  const range = /^(\d+(?:\.\d+)?)\s*[-~]\s*(\d+(?:\.\d+)?)$/.exec(value);
  return range && Number(range[1]) > 0 && Number(range[2]) >= Number(range[1])
    ? { min: Number(range[1]), max: Number(range[2]) }
    : null;
}
export function productionRecipes(rows: CatalogRecipe[]): ProductionRecipe[] {
  return rows
    .filter((row) => !row.byproductOfItemId && row.inputs.length && row.outputs.length)
    .map((row) => ({
      id: row.key,
      name: row.outputs[0].name,
      method: row.type,
      output: {
        itemId: row.outputs[0].itemId,
        quantity: productionQuantity(row.outputs[0].quantity),
      },
      ingredients: row.inputs.map((part) => ({
        itemId: part.itemId,
        quantity: productionQuantity(part.quantity),
      })),
      byproducts: row.outputs
        .slice(1)
        .map((part) => ({ itemId: part.itemId, quantity: productionQuantity(part.quantity) })),
    }));
}
@Component({
  selector: 'app-recommendations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  templateUrl: './recommendations-page.html',
  styleUrl: './recommendations-page.scss',
})
export class RecommendationsPage implements OnDestroy {
  readonly store = inject(WorkspaceStore);
  readonly api = inject(ProductionApi);
  readonly catalogApi = inject(CatalogApiService);
  readonly snapshot = signal<ProductionCatalogResponse | null>(null);
  readonly selected = signal('');
  readonly message = signal('');
  readonly busy = signal(false);
  readonly quotes = signal<Quotes>({});
  readonly plans = signal<{ ranked: ProductionPlan[]; incomplete: ProductionPlan[] } | null>(null);
  readonly progress = signal({ done: 0, total: 0 });
  readonly page = signal(1);
  readonly pricePage = signal(1);
  readonly priceSearch = signal('');
  readonly focus = signal<string | null>(null);
  readonly search = signal('');
  readonly method = signal('');
  readonly silver = silver;
  readonly demoExplanation = productionDemoExplanation;
  readonly scenarioNames = {
    'buy-all': 'Comprar ingredientes',
    'produce-all': 'Produzir ingredientes',
    custom: 'Personalizado',
  };
  readonly profiles = computed(() =>
    this.store.data().characters.filter((row) => row.region === this.store.data().region),
  );
  readonly profile = computed(
    () => this.profiles().find((row) => row.id === this.selected()) ?? this.store.activeCharacter(),
  );
  readonly recipes = computed(() => productionRecipes(this.snapshot()?.recipes ?? []));
  readonly methods = computed(() => [...new Set(this.recipes().map((row) => row.method))].sort());
  readonly candidates = computed(() =>
    this.recipes().filter(
      (row) =>
        (!this.method() || row.method === this.method()) &&
        (!this.search() ||
          row.name
            .toLocaleLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .includes(
              this.search()
                .toLocaleLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, ''),
            )),
    ),
  );
  readonly focused = computed(() => this.recipes().find((row) => row.id === this.focus()));
  readonly visiblePlans = computed(
    () => this.plans()?.ranked.slice((this.page() - 1) * 20, this.page() * 20) ?? [],
  );
  readonly materialItems = computed(() => {
    const ids = new Set(
      this.recipes().flatMap((row) => [
        row.output.itemId,
        ...row.ingredients.map((part) => part.itemId),
      ]),
    );
    return (this.snapshot()?.items ?? []).filter((item) => ids.has(item.id));
  });
  readonly filteredPrices = computed(() =>
    this.materialItems().filter((item) =>
      item.name
        .toLocaleLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .includes(
          this.priceSearch()
            .toLocaleLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, ''),
        ),
    ),
  );
  readonly visiblePrices = computed(() =>
    this.filteredPrices().slice((this.pricePage() - 1) * 20, this.pricePage() * 20),
  );
  readonly pricePages = computed(() => Math.max(1, Math.ceil(this.filteredPrices().length / 20)));
  readonly resultPages = computed(() =>
    Math.max(1, Math.ceil((this.plans()?.ranked.length ?? 0) / 20)),
  );
  calibration: Record<string, { seconds: number | null; yield: number | null }> = {};
  recipeCalibration: Record<string, { seconds: number | null; yield: number | null }> = {};
  choices: Record<number, ProductionChoice> = {};
  customRecipes: Record<number, string> = {};
  useOwned = true;
  valuePack = false;
  private quoteQueue: number[] = [];
  private loadedRegion = '';
  private comparisonRun = 0;

  constructor() {
    let previousContext = '';
    let previousDemo = this.store.demoActive();
    effect(() => {
      const currentDemo = this.store.demoActive();
      if (previousDemo && !currentDemo) {
        this.quotes.set({});
        this.plans.set(null);
        this.calibration = Object.fromEntries(
          this.methods().map((method) => [method, { seconds: null, yield: null }]),
        );
        this.choices = {};
        this.customRecipes = {};
        this.recipeCalibration = {};
        this.selected.set('');
      }
      previousDemo = currentDemo;
      const context = JSON.stringify({
        region: this.store.data().region,
        player: this.profile(),
        inventory: this.store.data().inventory,
        reservations: this.store.data().personalPlans,
      });
      if (previousContext && previousContext !== context) {
        this.plans.set(null);
        this.message.set(
          'O personagem ou o estoque mudou. Confira os tempos e rendimentos e compare novamente.',
        );
      }
      previousContext = context;
    });
  }

  async load() {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('Carregando todas as receitas de Life Skill…');
    try {
      const region = this.store.data().region;
      const result = await firstValueFrom(this.api.catalog(region));
      if (this.store.data().region !== region) {
        this.message.set('A região mudou durante a consulta. Carregue o catálogo novamente.');
        return;
      }
      this.snapshot.set(result);
      this.loadedRegion = region;
      this.plans.set(null);
      this.quotes.set({});
      this.quoteQueue = [];
      this.recipeCalibration = {};
      this.calibration = Object.fromEntries(
        this.methods().map((method) => [method, { seconds: null, yield: null }]),
      );
      this.message.set(
        `${this.recipes().length} receitas carregadas. Informe tempo e rendimento para comparar.`,
      );
    } catch {
      this.message.set('Não foi possível carregar as receitas. Tente novamente.');
    } finally {
      this.busy.set(false);
    }
  }
  async startDemo() {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      const data = await firstValueFrom(
        this.catalogApi.getItems({ ids: productionDemoItemIds, page: 1, pageSize: 100 }),
      );
      if (
        !this.store.startDemo(createProductionDemoWorkspace(data.items, this.store.data().region))
      )
        throw new Error('Falha ao iniciar teste.');
      this.selected.set('production-demo-main');
    } catch {
      this.message.set('Não foi possível preparar o personagem de teste. Confira o catálogo.');
      this.busy.set(false);
      return;
    }
    this.busy.set(false);
    await this.load();
    // A global exit control can restore the real workspace while the catalogue loads.
    if (!this.store.demoActive()) return;
    for (const method of this.methods()) {
      const demo =
        method === 'ALCHEMY'
          ? productionDemoCalibrations.alchemy
          : method === 'COOK'
            ? productionDemoCalibrations.cooking
            : productionDemoCalibrations.processing;
      this.calibration[method] = {
        seconds: demo.seconds,
        yield: 'expectedYield' in demo ? demo.expectedYield : null,
      };
    }
    this.search.set('Edania');
    this.message.set(
      productionDemoExplanation + ' Tempos e rendimentos preenchidos são exemplos ajustáveis.',
    );
  }
  async refreshQuotes(resume = false) {
    if (this.busy() || !this.snapshot()) return;
    if (this.loadedRegion !== this.store.data().region) {
      this.message.set('A região mudou. Recarregue o catálogo.');
      return;
    }
    if (!resume || !this.quoteQueue.length) {
      this.quoteQueue = this.materialItems()
        .filter(canRequestProductionQuote)
        .map((item) => item.id);
      this.progress.set({ done: 0, total: this.quoteQueue.length });
    }
    this.busy.set(true);
    try {
      while (this.quoteQueue.length) {
        const batch = this.quoteQueue.slice(0, 100);
        const result = await firstValueFrom(this.api.quotes(this.loadedRegion, batch));
        if (this.store.data().region !== this.loadedRegion)
          throw new Error('A região mudou durante a consulta.');
        if (result.cacheStatus === 'stale')
          throw new Error('A fonte retornou dados indisponíveis ou antigos.');
        this.quotes.update((previous) => {
          const next = { ...previous };
          for (const id of batch) if (next[id]?.source === 'market') delete next[id];
          for (const quote of result.items)
            if (quote.price && quote.price !== '0' && batch.includes(quote.itemId))
              next[quote.itemId] = {
                unitPrice: quote.price,
                available: quote.stock,
                source: 'market',
                observedAt: result.fetchedAt,
              };
          return next;
        });
        this.quoteQueue.splice(0, batch.length);
        this.progress.update((row) => ({ ...row, done: row.done + batch.length }));
      }
      this.message.set(
        `Consulta concluída: ${Object.keys(this.quotes()).length} preços disponíveis. Itens sem oferta ficam pendentes.`,
      );
    } catch {
      this.message.set(
        'Consulta pausada: mercado indisponível ou limite atingido. Retome depois ou informe preços manuais.',
      );
    } finally {
      this.busy.set(false);
      this.plans.set(null);
    }
  }
  get resumable() {
    return this.quoteQueue.length > 0;
  }
  manualPrice(itemId: number, value: string) {
    this.quotes.update((previous) => {
      const next = { ...previous };
      if (/^\d{1,24}$/.test(value) && BigInt(value) > 0n)
        next[itemId] = {
          unitPrice: value,
          available: null,
          source: 'manual',
          observedAt: new Date().toISOString(),
        };
      else delete next[itemId];
      return next;
    });
    this.plans.set(null);
  }
  applyMockPrices() {
    if (this.busy() || !this.store.demoActive()) return;
    const prices: Record<number, string> = {
      1399: '2000000',
      1407: '6000000',
      1409: '190000',
      1410: '450000',
      702: '100000',
      703: '300000',
      4986: '10000',
      820936: '1000000',
      821372: '10000000',
      6354: '50000',
      5960: '20000',
      5008: '5000',
      5301: '10000',
      5025: '5000',
      9001: '20',
      5401: '2000',
      6656: '5000',
      5439: '1000',
    };
    for (const [id, price] of Object.entries(prices)) this.manualPrice(Number(id), price);
    this.message.set(
      'Preços fictícios aplicados apenas neste teste; não são cotações atuais. Edite os valores ou consulte o mercado.',
    );
  }
  async compare() {
    if (this.busy()) return;
    const player = this.profile();
    if (!player || !this.snapshot() || this.loadedRegion !== this.store.data().region) {
      this.message.set('Selecione um personagem e carregue o catálogo da região atual.');
      return;
    }
    const recipes = this.recipes().map((row) => ({ ...row, output: { ...row.output } }));
    const estimates: Record<string, ProductionEstimate> = {};
    for (const recipe of recipes) {
      const config = this.calibration[recipe.method];
      const specific = this.recipeCalibration[recipe.id];
      const variable = recipe.method === 'ALCHEMY' || recipe.method === 'COOK';
      estimates[recipe.id] = {
        source: 'informed',
        craftSeconds: specific?.seconds ?? config?.seconds ?? undefined,
        expectedYield: specific?.yield ?? (variable ? (config?.yield ?? undefined) : undefined),
      };
      if (variable) recipe.output.quantity = null;
    }
    const weights: Record<number, number> = {};
    for (const item of this.snapshot()!.items)
      if (item.weight !== null && Number.isFinite(Number(item.weight)))
        weights[item.id] = Number(item.weight);
    const candidates = this.candidates().map((row) => ({ recipeId: row.id }));
    const context = this.comparisonContext();
    const run = ++this.comparisonRun;
    const input: ProductionPlannerInput = {
      recipes,
      quotes: this.quotes(),
      estimates,
      inventory: availableInventory(this.store.data().personalPlans, this.store.data().inventory)
        .filter((row) => row.region === player.region && row.itemId)
        .map((row) => ({ itemId: row.itemId!, quantity: row.quantity })),
      candidates: [],
      profile: {
        budget: player.silver,
        activeMinutes: player.activeMinutes,
        maxWeight: player.weightLimit,
        currentWeight: player.carriedWeight,
      },
      itemWeights: weights,
      customChoices: { ...this.choices },
      customRecipes: { ...this.customRecipes },
      useOwnedInProduction: this.useOwned,
      tax: { ...this.store.data().taxOptions, valuePack: this.valuePack },
      now: new Date().toISOString(),
      maxCrafts: 10000,
    };
    const result = { ranked: [] as ProductionPlan[], incomplete: [] as ProductionPlan[] };
    this.busy.set(true);
    this.plans.set(null);
    try {
      for (let offset = 0; offset < candidates.length; offset += 5) {
        this.message.set(`Comparando ${offset} / ${candidates.length} receitas…`);
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        if (run !== this.comparisonRun || context !== this.comparisonContext()) {
          if (run === this.comparisonRun)
            this.message.set(
              'Os dados mudaram durante a comparação. Confira as condições e compare novamente.',
            );
          return;
        }
        const batch = planProduction({
          ...input,
          candidates: candidates.slice(offset, offset + 5),
        });
        result.ranked.push(...batch.ranked);
        result.incomplete.push(...batch.incomplete);
      }
      result.ranked.sort(compareProductionPlans);
      this.plans.set(result);
      this.page.set(1);
      this.message.set(
        `${candidates.length} receitas comparadas. ${result.ranked.length} cenários completos; ${result.incomplete.length} pendentes. Ranking limitado à busca e ao catálogo carregado, com até 10.000 operações por cenário.`,
      );
    } catch {
      this.message.set(
        'Não foi possível concluir a comparação. Confira os dados e tente novamente.',
      );
    } finally {
      if (run === this.comparisonRun) this.busy.set(false);
    }
  }
  private comparisonContext() {
    return JSON.stringify({
      workspace: this.store.data(),
      player: this.profile(),
      demo: this.store.demoActive(),
      quotes: this.quotes(),
      calibration: this.calibration,
      recipeCalibration: this.recipeCalibration,
      choices: this.choices,
      customRecipes: this.customRecipes,
      useOwned: this.useOwned,
      valuePack: this.valuePack,
      search: this.search(),
      method: this.method(),
      dataset: this.snapshot()?.dataset,
    });
  }
  ngOnDestroy() {
    this.comparisonRun++;
  }
  name(itemId: number) {
    return this.snapshot()?.items.find((item) => item.id === itemId)?.name ?? `Item ${itemId}`;
  }
  icon(itemId: number) {
    const item = this.snapshot()?.items.find((row) => row.id === itemId);
    return item ? this.catalogApi.resolveIconUrl(item) : null;
  }
  producers(itemId: number) {
    return this.recipes().filter((row) => row.output.itemId === itemId);
  }
  producersName(recipeId: string) {
    return this.recipes().find((row) => row.id === recipeId)?.output.itemId ?? 0;
  }
  choose(itemId: number, choice: ProductionChoice) {
    this.choices[itemId] = choice;
    this.plans.set(null);
  }
  methodChanged() {
    this.page.set(1);
    this.plans.set(null);
  }
  rounded(value: number | null) {
    return value === null ? '—' : value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }
  focusRecipe(id: string | null) {
    this.focus.set(id);
    if (id && !this.recipeCalibration[id])
      this.recipeCalibration[id] = { seconds: null, yield: null };
  }
  methodLabel(method: string) {
    const labels: Record<string, string> = {
      ALCHEMY: 'Alquimia',
      COOK: 'Culinária',
      SIMPLE_ALCHEMY: 'Alquimia simples',
      SIMPLE_COOK: 'Culinária simples',
      HEAT: 'Aquecimento',
      GRIND: 'Moagem',
      DRY: 'Secagem',
      FIREWOOD: 'Corte de madeira',
      SHAKE: 'Mistura',
      THINNING: 'Filtragem',
      ROYALGIFT_COOK: 'Entrega imperial de culinária',
      ROYALGIFT_ALCHEMY: 'Entrega imperial de alquimia',
    };
    return labels[method] ?? method;
  }
}
