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
  type CharacterProfile,
  compareProductionPlans,
  planProduction,
  type ProductionChoice,
  type ProductionEstimate,
  type ProductionIssue,
  type ProductionPlan,
  type ProductionPlannerInput,
  type ProductionQuantity,
  type ProductionRecipe,
} from '@bdo/calculators';
import type {
  CatalogItemDetail,
  CatalogRecipe,
  MarketItemQuote,
  NpcPurchasePrice,
  ProductionCatalogResponse,
} from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmInput } from '@bdo/ui/input';
import { firstValueFrom, takeLast } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { MarketCacheService } from '../../core/market-cache.service';
import { ProductionApi } from '../../core/production-api';
import type { Region } from '../../core/region-preferences';
import { WorkspaceStore } from '../../core/workspace-store';
import { silver } from '../../shared/formatters';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { fixedRecipeYield } from '../../shared/recipe-tree/recipe-fixed-yields';
import { recipeMarketPrice } from '../../shared/recipe-tree/recipe-market-price';
import {
  cookingMassProduceRate,
  DEFAULT_RECIPE_MASTERY,
  processingBatchCount,
} from '../../shared/recipe-tree/recipe-mastery';
import { defaultRecipeMethodSeconds } from '../../shared/recipe-tree/recipe-production-adapter';
import {
  lifeSkillForRecipe,
  recipeMasteryCanChangeOutput,
  resolveDefaultYield,
} from '../../shared/recipe-tree/recipe-yield';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { BdoSelect } from '../../ui/native-select/bdo-select';

type RecommendationQuote = ProductionPlannerInput['quotes'][number] & {
  basis?: 'market' | 'maximum' | 'manual' | 'npc';
  totalTrades?: string | null;
  lastSoldAt?: string | null;
};
type Quotes = Record<number, RecommendationQuote>;
interface PendingCoachAction {
  key: string;
  name: string;
  focusedRecipe: boolean;
  itemId?: number;
  issues: ProductionIssue[];
  affectedRecipes: number;
  affectedScenarios: number;
}
export function hasNpcPurchaseEvidence(item: Pick<CatalogItemDetail, 'sourceData'>): boolean {
  const rawPrice = item.sourceData['buyPrice'];
  const validPrice =
    (typeof rawPrice === 'number' && Number.isSafeInteger(rawPrice) && rawPrice > 0) ||
    (typeof rawPrice === 'string' && /^\d{1,24}$/.test(rawPrice) && BigInt(rawPrice) > 0n);
  const vendors = item.sourceData['vendors'];
  const urns =
    vendors && typeof vendors === 'object' && 'urns' in vendors
      ? (vendors as { urns?: unknown }).urns
      : null;
  return validPrice && Array.isArray(urns) && urns.length > 0;
}
/** Provider summaries merge enhancement variants. Only known plain materials are safe here. */
export function canRequestProductionQuote(item: CatalogItemDetail): boolean {
  const enhancement = item.sourceData['maxEnhance'];
  if (typeof enhancement === 'number' && enhancement > 0) return false;
  if (item.sourceData['marketable'] === false) return false;
  return [
    'potion',
    'food',
    'cook',
    'wood',
    'etc',
    'material',
    'plant',
    'crystal',
    'blackstone',
    'ore',
    'mine',
    'leather',
    'vehicle',
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
function scaleProductionQuantity(quantity: ProductionQuantity, scale: number): ProductionQuantity {
  if (typeof quantity === 'number') return quantity * scale;
  if (quantity) return { min: quantity.min * scale, max: quantity.max * scale };
  return null;
}
export function productionMastery(
  recipeType: string,
  mastery?: Partial<CharacterProfile['mastery']>,
): number {
  const skill = lifeSkillForRecipe(recipeType);
  if (skill === 'cooking' || skill === 'alchemy' || skill === 'processing')
    return mastery?.[skill] ?? DEFAULT_RECIPE_MASTERY;
  return 0;
}
export function productionCraftSeconds(
  recipeType: string,
  baseSeconds: number | null | undefined,
  mastery?: Partial<CharacterProfile['mastery']>,
): number | undefined {
  if (baseSeconds === null || baseSeconds === undefined || !Number.isFinite(baseSeconds))
    return undefined;
  const rate =
    lifeSkillForRecipe(recipeType) === 'cooking'
      ? cookingMassProduceRate(productionMastery(recipeType, mastery))
      : 1;
  return baseSeconds / rate;
}
export function recommendationMarketQuote(
  quote: MarketItemQuote,
  observedAt: string | null,
): RecommendationQuote | null {
  const effective = recipeMarketPrice(quote);
  if (!effective || !observedAt || !Number.isFinite(Date.parse(observedAt))) return null;
  return {
    unitPrice: effective.price,
    available: quote.stock,
    observedAt,
    source: 'market',
    basis: effective.source,
    totalTrades: quote.totalTrades ?? null,
    lastSoldAt: quote.lastSoldAt ?? null,
  };
}
export function activitySkillForRecipe(recipeType: string): string | null {
  if (recipeType === 'SIMPLE_COOK') return 'cooking';
  if (recipeType === 'SIMPLE_ALCHEMY') return 'alchemy';
  return lifeSkillForRecipe(recipeType);
}
export function isEligibleLifeSkillRecipe(
  row: CatalogRecipe,
  itemsById?: ReadonlyMap<number, CatalogItemDetail>,
): boolean {
  if (row.byproductOfItemId || !row.inputs.length || !row.outputs.length) return false;
  if (row.type === 'ROYALGIFT_COOK' || row.type === 'ROYALGIFT_ALCHEMY') return false;
  if (!itemsById || !itemsById.size) return true;
  const outItem = itemsById.get(row.outputs[0].itemId);
  if (!outItem) return true;
  if (outItem.sourceData?.['marketable'] === false) return false;
  const maxEnhance = outItem.sourceData?.['maxEnhance'];
  if (typeof maxEnhance === 'number' && maxEnhance > 0) return false;
  const blockedCategories = new Set([
    'mainweapon',
    'subweapon',
    'awakenweapon',
    'armor',
    'accessory',
    'jewel',
    'pearl',
    'costume',
    'housing',
    'specialgoods',
    'blackstone',
  ]);
  const outCategory = (outItem.category ?? '').toLowerCase();
  if (blockedCategories.has(outCategory)) return false;
  const nonLifeSkillName =
    /\[Evento\]|\[Guilda\]|\[Mansão\]|Traje|Armadura|Vestimenta|Elmo|Luvas|Sapatos|Coração do Khan|Coração de Vell|Coração de Garmoth|Pedra de Origem/i;
  if (nonLifeSkillName.test(outItem.name ?? '')) return false;
  return row.inputs.every((input) => {
    const inItem = itemsById.get(input.itemId);
    if (!inItem) return true;
    const inEnh = inItem.sourceData?.['maxEnhance'];
    if (typeof inEnh === 'number' && inEnh > 0) return false;
    const inCat = (inItem.category ?? '').toLowerCase();
    if (
      inCat === 'mainweapon' ||
      inCat === 'subweapon' ||
      inCat === 'awakenweapon' ||
      inCat === 'armor' ||
      inCat === 'accessory' ||
      inCat === 'costume' ||
      inCat === 'housing'
    )
      return false;
    return !nonLifeSkillName.test(inItem.name ?? '');
  });
}
export function productionRecipes(
  rows: CatalogRecipe[],
  mastery?: Partial<CharacterProfile['mastery']>,
  itemsById?: ReadonlyMap<number, CatalogItemDetail>,
): ProductionRecipe[] {
  return rows
    .filter((row) => isEligibleLifeSkillRecipe(row, itemsById))
    .map((row) => {
      const primary = row.outputs[0];
      const skill = lifeSkillForRecipe(row.type);
      const level = productionMastery(row.type, mastery);
      const knownProcessingInputs = row.inputs.every((part) => {
        const quantity = productionQuantity(part.quantity);
        return typeof quantity === 'number' && quantity > 0;
      });
      const batch =
        skill === 'processing' && knownProcessingInputs ? processingBatchCount(level) : 1;
      const fixedYield = fixedRecipeYield(row, primary.itemId);
      const hasFixedYield = fixedYield !== null;
      const masteryYield =
        !hasFixedYield && recipeMasteryCanChangeOutput(row, primary.itemId)
          ? resolveDefaultYield(row, primary.itemId, level)
          : null;
      const baseOutput = productionQuantity(primary.quantity);

      return {
        id: row.key,
        name: primary.name,
        method: row.type,
        output: {
          itemId: primary.itemId,
          quantity:
            fixedYield ??
            masteryYield ??
            scaleProductionQuantity(baseOutput, hasFixedYield ? 1 : batch),
        },
        ingredients: row.inputs.map((part) => ({
          itemId: part.itemId,
          quantity: scaleProductionQuantity(productionQuantity(part.quantity), batch),
        })),
        byproducts: row.outputs.slice(1).map((part) => ({
          itemId: part.itemId,
          quantity: scaleProductionQuantity(productionQuantity(part.quantity), batch),
        })),
      };
    });
}
@Component({
  selector: 'app-recommendations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TutorialSurfaceDirective,
    HlmInput,
    HlmButton,
    BdoSelect,
    FormsModule,
    RouterLink,
    ItemIcon,
  ],
  templateUrl: './recommendations-page.html',
  styleUrl: './recommendations-page.scss',
})
export class RecommendationsPage implements OnDestroy {
  readonly store = inject(WorkspaceStore);
  readonly api = inject(ProductionApi);
  readonly catalogApi = inject(CatalogApiService);
  private readonly marketCache = inject(MarketCacheService);
  readonly snapshot = signal<ProductionCatalogResponse | null>(null);
  private readonly itemsById = computed(() => {
    const items = new Map<number, CatalogItemDetail>();
    for (const item of this.snapshot()?.items ?? []) {
      // Match Array.find: the first occurrence wins if a catalogue repeats an ID.
      if (!items.has(item.id)) items.set(item.id, item);
    }
    return items;
  });
  readonly selected = signal('');
  readonly message = signal('');
  readonly busy = signal(false);
  readonly quotes = signal<Quotes>({});
  readonly npcPrices = signal(new Map<number, NpcPurchasePrice>());
  readonly plans = signal<{ ranked: ProductionPlan[]; incomplete: ProductionPlan[] } | null>(null);
  readonly progress = signal({ done: 0, total: 0 });
  readonly page = signal(1);
  readonly pendingPage = signal(1);
  readonly pendingPageSize = 30;
  readonly pricePage = signal(1);
  readonly priceSearch = signal('');
  readonly focus = signal<string | null>(null);
  readonly search = signal('');
  readonly method = signal('');
  readonly silver = silver;
  readonly activityOptions = [
    { id: 'cooking', label: 'Culinária' },
    { id: 'alchemy', label: 'Alquimia' },
    { id: 'processing', label: 'Processamento' },
  ] as const;
  readonly preferredSkills = computed(() => this.store.data().activityCoach.preferredSkills);
  readonly scenarioNames = {
    'buy-all': 'Comprar ingredientes',
    'produce-all': 'Produzir ingredientes',
    custom: 'Personalizado',
    optimized: 'Combinação automática',
  };
  readonly profiles = computed(() =>
    this.store.data().characters.filter((row) => row.region === this.store.data().region),
  );
  readonly profile = computed(
    () => this.profiles().find((row) => row.id === this.selected()) ?? this.store.activeCharacter(),
  );
  readonly viewTab = signal<'all' | 'storage' | 'missing'>('all');
  readonly requireLiquidity = signal(true);
  readonly minTradeVolume = signal(100);
  readonly recipes = computed(() =>
    productionRecipes(
      this.snapshot()?.recipes ?? [],
      this.profile()?.mastery,
      this.itemsById(),
    ).filter((row) => {
      const skill = activitySkillForRecipe(row.method);
      return this.preferredSkills().includes(skill as (typeof this.activityOptions)[number]['id']);
    }),
  );
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
  readonly deduplicatedPlans = computed(() => {
    const seen = new Set<string>();
    return (this.plans()?.ranked ?? []).filter((row) => {
      if (seen.has(row.recipeId)) return false;
      seen.add(row.recipeId);
      return true;
    });
  });
  readonly liquidPlans = computed(() =>
    this.deduplicatedPlans().filter((row) =>
      this.requireLiquidity() ? this.hasLiquidity(row) : true,
    ),
  );
  readonly topPlans = computed(() => {
    const base = this.liquidPlans();
    const tab = this.viewTab();
    if (tab === 'storage') {
      return base
        .filter((row) => row.materials.some((material) => material.owned > 0))
        .slice(0, 12);
    }
    if (tab === 'missing') {
      return base
        .filter((row) =>
          row.materials.some((material) => material.bought > 0 || material.produced > 0),
        )
        .slice(0, 12);
    }
    return base.slice(0, 12);
  });
  readonly storageReadyCount = computed(
    () =>
      this.liquidPlans().filter((row) => row.materials.some((material) => material.owned > 0))
        .length,
  );
  readonly pendingActions = computed(() => {
    const recipesById = new Map(this.recipes().map((recipe) => [recipe.id, recipe]));
    const grouped = new Map<
      string,
      {
        name: string;
        itemId?: number;
        focusedRecipe: boolean;
        issues: Map<string, ProductionIssue>;
        recipeIds: Set<string>;
        scenarioIds: Set<string>;
      }
    >();

    for (const plan of this.plans()?.incomplete ?? []) {
      for (const issue of plan.issues) {
        const issueRecipeId = issue.recipeId ?? plan.recipeId;
        const recipe = recipesById.get(issueRecipeId);
        const key =
          issue.itemId !== undefined
            ? `item:${issue.itemId}`
            : issue.code === 'missing-time'
              ? `missing-time:method:${recipe?.method ?? 'unknown'}`
              : `${issue.code}:recipe:${issueRecipeId}`;
        const group = grouped.get(key) ?? {
          name:
            issue.itemId !== undefined
              ? this.name(issue.itemId)
              : issue.code === 'missing-time' && recipe
                ? this.methodLabel(recipe.method)
                : plan.name,
          ...(issue.itemId !== undefined ? { itemId: issue.itemId } : {}),
          focusedRecipe: false,
          issues: new Map<string, ProductionIssue>(),
          recipeIds: new Set<string>(),
          scenarioIds: new Set<string>(),
        };
        group.issues.set(issue.code, issue);
        group.focusedRecipe ||= plan.recipeId === this.focus() || issueRecipeId === this.focus();
        group.recipeIds.add(plan.recipeId);
        group.scenarioIds.add(`${plan.recipeId}:${plan.scenario}`);
        grouped.set(key, group);
      }
    }

    return [...grouped.entries()]
      .map(
        ([key, group]): PendingCoachAction => ({
          key,
          name: group.name,
          focusedRecipe: group.focusedRecipe,
          ...(group.itemId !== undefined ? { itemId: group.itemId } : {}),
          issues: [...group.issues.values()],
          affectedRecipes: group.recipeIds.size,
          affectedScenarios: group.scenarioIds.size,
        }),
      )
      .sort((left, right) => {
        const priority = (action: PendingCoachAction) =>
          action.focusedRecipe
            ? 0
            : action.itemId !== undefined
              ? 1
              : action.key.startsWith('missing-time:')
                ? 2
                : 3;
        return priority(left) - priority(right) || left.name.localeCompare(right.name, 'pt-BR');
      });
  });
  readonly pendingPages = computed(() =>
    Math.max(1, Math.ceil(this.pendingActions().length / this.pendingPageSize)),
  );
  readonly visibleIncomplete = computed(() => {
    const start = (this.pendingPage() - 1) * this.pendingPageSize;
    return this.pendingActions().slice(start, start + this.pendingPageSize);
  });
  readonly materialItems = computed(() => {
    const ids = new Set(
      this.recipes().flatMap((row) => [
        row.output.itemId,
        ...row.ingredients.map((part) => part.itemId),
        ...(row.byproducts ?? []).map((part) => part.itemId),
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
  calibration: Record<string, { seconds: number | null }> = {};
  recipeCalibration: Record<string, { seconds: number | null; yield: number | null }> = {};
  choices: Record<number, ProductionChoice> = {};
  customRecipes: Record<number, string> = {};
  useOwned = true;
  optimizationCrafts = 1;
  private quoteQueue: number[] = [];
  private loadInFlight: Promise<void> | null = null;
  private manualPriceTimer: ReturnType<typeof setTimeout> | null = null;
  private loadedRegion = '';
  private loadedNpcContext = '';
  private marketDataInFlight: Promise<void> | null = null;
  private comparisonRun = 0;

  constructor() {
    let previousContext = '';
    let previousProfileId = this.profile()?.id ?? '';
    let previousDemo = this.store.demoActive();
    effect(() => {
      const currentDemo = this.store.demoActive();
      if (previousDemo && !currentDemo) {
        this.quotes.set({});
        this.plans.set(null);
        this.calibration = Object.fromEntries(
          this.methods().map((method) => [method, { seconds: null }]),
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
      const currentProfileId = this.profile()?.id ?? '';
      const profileBecameAvailable = !previousProfileId && !!currentProfileId;
      if (previousContext && previousContext !== context) {
        this.plans.set(null);
        this.message.set(
          'O personagem ou o estoque mudou. Atualizando as oportunidades com esses dados.',
        );
        queueMicrotask(() => {
          if (this.snapshot() && this.profile() && !profileBecameAvailable) void this.compare();
        });
      }
      if (profileBecameAvailable && this.snapshot() && !this.busy())
        queueMicrotask(() => void this.loadMarketInputs());
      previousProfileId = currentProfileId;
      previousContext = context;
    });
    void this.load();
  }

  async load() {
    if (this.loadInFlight) {
      await this.loadInFlight;
      if (this.profile() && this.snapshot()) await this.loadMarketInputs();
      return;
    }
    const task = this.loadCatalogAndRecommend();
    this.loadInFlight = task;
    try {
      await task;
    } finally {
      if (this.loadInFlight === task) this.loadInFlight = null;
    }
  }

  private async loadCatalogAndRecommend() {
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
      this.pendingPage.set(1);
      this.quotes.set({});
      this.npcPrices.set(new Map());
      this.quoteQueue = [];
      this.recipeCalibration = {};
      this.calibration = Object.fromEntries(
        this.methods().map((method) => [method, { seconds: null }]),
      );
      this.restoreCalibrations();
      this.message.set(`${this.recipes().length} receitas das atividades selecionadas carregadas.`);
    } catch {
      this.message.set('Não foi possível carregar as receitas. Tente novamente.');
    } finally {
      this.busy.set(false);
    }
    if (this.snapshot() && this.loadedRegion === this.store.data().region && this.profile())
      await this.loadMarketInputs();
  }
  private async loadMarketInputs() {
    if (this.marketDataInFlight) return this.marketDataInFlight;
    const region = this.store.data().region;
    const snapshot = this.snapshot();
    if (!this.profile() || !snapshot || this.loadedRegion !== region) return;

    const task = (async () => {
      const datasetVersion = snapshot.dataset?.version;
      const npcContext = datasetVersion ? `${region}:${datasetVersion}` : '';
      if (npcContext && this.loadedNpcContext !== npcContext) {
        const itemIds = this.materialItems()
          .filter(hasNpcPurchaseEvidence)
          .map((item) => item.id);
        if (!itemIds.length) {
          this.loadedNpcContext = npcContext;
        } else {
          try {
            const prices = await firstValueFrom(
              this.catalogApi.getNpcPurchasePrices(itemIds, datasetVersion!, region),
            );
            if (this.store.data().region !== region || this.snapshot() !== snapshot) return;
            this.npcPrices.set(prices);
            this.loadedNpcContext = npcContext;
          } catch {
            // Keep the market and manual quote paths available when NPC data cannot be verified.
          }
        }
      }
      if (this.profile() && this.store.data().region === region) await this.refreshQuotes();
    })();
    this.marketDataInFlight = task;
    try {
      await task;
    } finally {
      if (this.marketDataInFlight === task) this.marketDataInFlight = null;
    }
  }
  async refreshQuotes(resume = false) {
    if (this.busy() || !this.snapshot()) return;
    if (!this.profile()) {
      this.quoteQueue = [];
      this.progress.set({ done: 0, total: 0 });
      return;
    }
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
    let quoteFailureMessage = '';
    try {
      while (this.quoteQueue.length) {
        const batch = this.quoteQueue.slice(0, 100);
        const result = await firstValueFrom(
          this.marketCache
            .resolveProductionQuotes(batch, this.loadedRegion as Region)
            .pipe(takeLast(1)),
        );
        if (this.store.data().region !== this.loadedRegion)
          throw new Error('A região mudou durante a consulta.');
        this.quotes.update((previous) => {
          const next = { ...previous };
          for (const id of batch) if (next[id]?.source === 'market') delete next[id];
          for (const [id, quote] of result) {
            if (!batch.includes(id) || next[id]?.source === 'manual') continue;
            const entry = this.marketCache.getCachedQuoteEntry(id, this.loadedRegion as Region);
            const observedAt = entry ? new Date(entry.fetchedAt).toISOString() : null;
            const mapped = recommendationMarketQuote(quote, observedAt);
            if (mapped) next[id] = mapped;
          }
          return next;
        });
        this.quoteQueue.splice(0, batch.length);
        this.progress.update((row) => ({ ...row, done: row.done + batch.length }));
      }
      this.message.set(
        `Consulta concluída: ${Object.keys(this.quotes()).length} preços de mercado disponíveis. O cache foi reutilizado; itens sem cotação, máxima ou preço NPC permanecem pendentes.`,
      );
    } catch {
      quoteFailureMessage =
        'Parte das cotações não está disponível agora. O cache e as premissas manuais continuam identificados; itens sem preço ficam pendentes.';
      this.message.set(quoteFailureMessage);
    } finally {
      this.busy.set(false);
      this.plans.set(null);
    }
    if (this.profile()) await this.compare();
    if (quoteFailureMessage) this.message.set(quoteFailureMessage);
  }
  get resumable() {
    return this.quoteQueue.length > 0;
  }
  toggleSkill(skill: (typeof this.activityOptions)[number]['id'], enabled: boolean) {
    const preferred = new Set(this.preferredSkills());
    if (enabled) preferred.add(skill);
    else preferred.delete(skill);
    this.store.update((state) => ({
      ...state,
      activityCoach: { ...state.activityCoach, preferredSkills: [...preferred] },
    }));
    this.restoreCalibrations();
    this.plans.set(null);
    if (this.profile()) void this.refreshQuotes();
  }
  selectProfile(id: string) {
    if (!this.profiles().some((row) => row.id === id)) return;
    this.store.update((state) => ({ ...state, activeCharacterId: id }));
    this.selected.set(id);
    this.restoreCalibrations();
    this.plans.set(null);
    void this.compare();
  }
  updateMastery(skill: 'cooking' | 'alchemy' | 'processing', raw: number | string) {
    const player = this.profile();
    if (!player) return;
    const parsed = Math.min(3000, Math.max(0, Math.round(Number(raw) || 0)));
    if (player.mastery[skill] === parsed) return;
    this.store.update((state) => ({
      ...state,
      characters: state.characters.map((row) =>
        row.id === player.id ? { ...row, mastery: { ...row.mastery, [skill]: parsed } } : row,
      ),
    }));
  }
  updateSessionMinutes(raw: number | string) {
    const player = this.profile();
    if (!player) return;
    const parsed = Math.min(1440, Math.max(1, Math.round(Number(raw) || 60)));
    if (player.activeMinutes === parsed) return;
    this.store.update((state) => ({
      ...state,
      characters: state.characters.map((row) =>
        row.id === player.id ? { ...row, activeMinutes: parsed } : row,
      ),
    }));
  }
  updateSessionSilver(raw: string) {
    const player = this.profile();
    if (!player) return;
    const cleaned = String(raw ?? '').replace(/\D+/g, '') || '0';
    if (player.silver === cleaned) return;
    this.store.update((state) => ({
      ...state,
      characters: state.characters.map((row) =>
        row.id === player.id ? { ...row, silver: cleaned } : row,
      ),
    }));
  }
  defaultSecondsFor(method: string): number {
    return defaultRecipeMethodSeconds(method);
  }
  saveCalibration(method: string) {
    const player = this.profile();
    if (!player) return;
    const seconds = this.calibration[method]?.seconds;
    const isValid = typeof seconds === 'number' && Number.isFinite(seconds) && seconds > 0;
    const updatedAt = new Date().toISOString();
    this.store.update((state) => {
      const calibrations = state.activityCoach.calibrations.filter(
        (row) => row.characterId !== player.id || row.method !== method,
      );
      if (isValid)
        calibrations.push({ characterId: player.id, method, seconds: seconds!, updatedAt });
      return { ...state, activityCoach: { ...state.activityCoach, calibrations } };
    });
    this.plans.set(null);
    void this.compare();
  }
  setCalibrationDraft(method: string, value: number | null) {
    this.calibration[method] = {
      seconds: value !== null && Number.isFinite(value) && value > 0 ? value : null,
    };
  }
  private restoreCalibrations() {
    const player = this.profile();
    if (!player) return;
    this.calibration = Object.fromEntries(
      this.methods().map((method) => {
        const stored = this.store
          .data()
          .activityCoach.calibrations.find(
            (row) => row.characterId === player.id && row.method === method,
          );
        return [method, { seconds: stored?.seconds ?? null }];
      }),
    );
  }
  manualPrice(itemId: number, value: string) {
    this.quotes.update((previous) => {
      const next = { ...previous };
      if (/^\d{1,24}$/.test(value) && BigInt(value) > 0n)
        next[itemId] = {
          unitPrice: value,
          available: null,
          source: 'manual',
          basis: 'manual',
          observedAt: new Date().toISOString(),
        };
      else delete next[itemId];
      return next;
    });
    if (this.manualPriceTimer) clearTimeout(this.manualPriceTimer);
    this.manualPriceTimer = setTimeout(() => {
      this.manualPriceTimer = null;
      this.plans.set(null);
      void this.compare();
    }, 400);
  }
  async compare() {
    if (this.busy()) return;
    const player = this.profile();
    if (!player || !this.snapshot() || this.loadedRegion !== this.store.data().region) {
      this.message.set('Selecione um personagem para calcular as atividades desta região.');
      return;
    }
    const recipes = this.recipes().map((row) => ({ ...row, output: { ...row.output } }));
    const estimates: Record<string, ProductionEstimate> = {};
    for (const recipe of recipes) {
      const config = this.calibration[recipe.method];
      const specific = this.recipeCalibration[recipe.id];
      const explicitSeconds = specific?.seconds ?? config?.seconds ?? undefined;
      const baseSeconds = explicitSeconds ?? defaultRecipeMethodSeconds(recipe.method);
      estimates[recipe.id] = {
        source: 'informed',
        timeSource: 'informed',
        craftSeconds: productionCraftSeconds(recipe.method, baseSeconds, player.mastery),
        expectedYield: specific?.yield ?? undefined,
      };
    }
    const weights: Record<number, number> = {};
    for (const item of this.snapshot()!.items)
      if (item.weight !== null && Number.isFinite(Number(item.weight)))
        weights[item.id] = Number(item.weight);
    const focusedId = this.focus();
    const candidates = this.candidates().map((row) => ({
      recipeId: row.id,
      ...(row.id === focusedId ? { optimizeCrafts: this.optimizationCrafts } : {}),
    }));
    const context = this.comparisonContext();
    const workspaceContext = this.workspaceComparisonContext();
    const run = ++this.comparisonRun;
    const input: ProductionPlannerInput = {
      recipes,
      quotes: this.comparisonQuotes(),
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
      tax: this.store.data().taxOptions,
      now: new Date().toISOString(),
      maxCrafts: 10000,
      enforceMarketAvailability: false,
    };
    const result = { ranked: [] as ProductionPlan[], incomplete: [] as ProductionPlan[] };
    const batchSize = 250;
    this.busy.set(true);
    this.plans.set(null);
    try {
      for (let offset = 0; offset < candidates.length; offset += batchSize) {
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
          candidates: candidates.slice(offset, offset + batchSize),
        });
        result.ranked.push(...batch.ranked);
        result.incomplete.push(...batch.incomplete);
      }
      result.ranked.sort(compareProductionPlans);
      this.plans.set(result);
      this.page.set(1);
      this.pendingPage.set(1);
      this.message.set(
        `${candidates.length} receitas comparadas. ${result.ranked.length} cenários completos; ${result.incomplete.length} pendentes. Ranking limitado à busca e ao catálogo carregado, com até 10.000 operações por cenário.`,
      );
    } catch {
      this.message.set(
        'Não foi possível concluir a comparação. Confira os dados e tente novamente.',
      );
    } finally {
      if (run === this.comparisonRun) this.busy.set(false);
      if (
        run === this.comparisonRun &&
        workspaceContext !== this.workspaceComparisonContext() &&
        this.profile() &&
        this.snapshot()
      )
        queueMicrotask(() => void this.compare());
    }
  }
  setPendingPage(page: number) {
    this.pendingPage.set(Math.min(Math.max(1, page), this.pendingPages()));
  }
  hasLiquidity(plan: ProductionPlan): boolean {
    const outId = this.producersName(plan.recipeId);
    if (!outId) return true;
    const quote = this.quotes()[outId];
    if (!quote || quote.source === 'manual' || quote.source === 'npc') return true;
    const rawTrades = quote.totalTrades;
    if (rawTrades === undefined || rawTrades === null) return true;
    const trades = Number(rawTrades);
    if (!Number.isFinite(trades)) return true;
    if (trades === 0) return false;
    if (trades > 0 && trades < this.minTradeVolume() && quote.lastSoldAt === null) return false;
    return true;
  }
  tradeVolumeLabel(recipeId: string): string {
    const outId = this.producersName(recipeId);
    const quote = outId ? this.quotes()[outId] : undefined;
    if (!quote) return 'Cotação manual / NPC';
    const stock =
      quote.available === null || quote.available === undefined
        ? 'Estoque não informado'
        : `${quote.available.toLocaleString('pt-BR')} em estoque`;
    const trades = quote.totalTrades;
    if (trades !== null && trades !== undefined && /^\d+$/.test(trades)) {
      return `${BigInt(trades).toLocaleString('pt-BR')} negociações acumuladas · ${stock}`;
    }
    return `Atividade não informada · ${stock}`;
  }

  ownedMaterials(row: ProductionPlan) {
    return row.materials.filter((part) => part.owned > 0);
  }
  missingMaterials(row: ProductionPlan) {
    return row.materials.filter((part) => part.bought > 0 || part.produced > 0);
  }
  quoteFor(itemId: number): RecommendationQuote | undefined {
    const quote = this.quotes()[itemId];
    if (quote) return quote;
    const npc = this.npcPrices().get(itemId);
    return npc
      ? {
          unitPrice: npc.unitPrice,
          available: null,
          observedAt: npc.verifiedAt,
          source: 'npc',
          basis: 'npc',
        }
      : undefined;
  }
  quoteOrigin(itemId: number): string {
    const quote = this.quoteFor(itemId);
    if (!quote) return 'Pendente';
    if (quote.source === 'npc') return 'NPC · preço do catálogo';
    if (quote.source === 'manual') return 'Premissa manual';
    if (quote.basis === 'maximum') return 'Máxima do mercado · sem estoque';
    return `Mercado · ${quote.available ?? 'estoque não informado'}`;
  }
  quoteDetails(itemId: number): string {
    const quote = this.quoteFor(itemId);
    if (!quote) return 'Sem cotação disponível';
    const date = Number.isFinite(Date.parse(quote.observedAt))
      ? new Date(quote.observedAt).toLocaleString('pt-BR')
      : 'horário desconhecido';
    return `${this.quoteOrigin(itemId)} · observado em ${date}`;
  }
  recommendationReason(row: ProductionPlan): string {
    const recipe = this.recipes().find((candidate) => candidate.id === row.recipeId);
    if (!recipe) return 'Receita disponível no catálogo selecionado.';
    const skill = lifeSkillForRecipe(recipe.method);
    const label = this.activityOptions.find((option) => option.id === skill)?.label ?? skill;
    const mastery = productionMastery(recipe.method, this.profile()?.mastery);
    const owned = row.materials.filter((material) => material.owned > 0).length;
    const materialSummary = owned
      ? `${owned} materiais podem sair do armazém`
      : 'insumos calculados com preços disponíveis';
    return `${label} · maestria ${mastery} · ${materialSummary}.`;
  }
  private comparisonQuotes(): Quotes {
    const quotes = { ...this.quotes() };
    for (const [itemId, quote] of this.npcPrices()) {
      if (quotes[itemId]) continue;
      quotes[itemId] = {
        unitPrice: quote.unitPrice,
        available: null,
        observedAt: quote.verifiedAt,
        source: 'npc',
        basis: 'npc',
      };
    }
    return quotes;
  }
  private comparisonContext() {
    return JSON.stringify({
      workspace: this.store.data(),
      player: this.profile(),
      demo: this.store.demoActive(),
      quotes: this.quotes(),
      npcPrices: [...this.npcPrices()],
      calibration: this.calibration,
      recipeCalibration: this.recipeCalibration,
      choices: this.choices,
      customRecipes: this.customRecipes,
      useOwned: this.useOwned,
      optimizationCrafts: this.optimizationCrafts,
      focus: this.focus(),
      search: this.search(),
      method: this.method(),
      dataset: this.snapshot()?.dataset,
    });
  }
  private workspaceComparisonContext() {
    return JSON.stringify({
      workspace: this.store.data(),
      player: this.profile(),
      demo: this.store.demoActive(),
    });
  }
  ngOnDestroy() {
    this.comparisonRun++;
    if (this.manualPriceTimer) clearTimeout(this.manualPriceTimer);
  }
  name(itemId: number) {
    return this.itemsById().get(itemId)?.name ?? `Item ${itemId}`;
  }
  icon(itemId: number) {
    const item = this.itemsById().get(itemId);
    return item ? this.catalogApi.resolveIconUrl(item) : null;
  }
  grade(itemId: number) {
    return this.itemsById().get(itemId)?.grade ?? null;
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
    this.plans.set(null);
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
