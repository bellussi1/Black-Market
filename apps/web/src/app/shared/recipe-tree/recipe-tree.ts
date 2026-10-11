import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  availableInventory,
  type lifeSkills,
  personalPlanSchema,
  planProduction,
  type ProductionChoice,
  type ProductionEstimate,
  type ProductionPlan,
  type TaxOptions,
} from '@bdo/calculators';
import type {
  CatalogItemDetail,
  CatalogRecipe,
  CatalogRecipePart,
  MarketItemQuote,
} from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import type { Subscription } from 'rxjs';
import {
  catchError,
  debounceTime,
  EMPTY,
  firstValueFrom,
  forkJoin,
  type Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
  timeout,
} from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { DEFAULT_MARKET_CACHE_TTL_MS, MarketCacheService } from '../../core/market-cache.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { MarketApi, type MarketHistoryPoint } from '../../features/market/market-api';
import { date, silver } from '../formatters';
import { recipeTypeLabel } from '../game-labels';
import { ItemIcon } from '../item-icon/item-icon';
import { TaxOptionsComponent } from '../tax-options';
import { type BranchAction, RecipeBranch } from './recipe-branch';
import { recipeFamilies } from './recipe-equivalents';
import { fixedRecipeYield } from './recipe-fixed-yields';
import { RecipeGraph } from './recipe-graph';
import { type ItemSources, RecipeKnowledge } from './recipe-knowledge';
import {
  buildRecipeProductionInput,
  defaultRecipeMethodSeconds,
} from './recipe-production-adapter';
import {
  type RecipeProductionGraph,
  resolveRecipeProductionGraph,
} from './recipe-production-graph';
import { RecipeSessions } from './recipe-session';
import {
  nodeFor,
  patchNode,
  planRecipeTree,
  type RecipeNode,
  stockLocationKey,
  withRecipe,
} from './recipe-tree-model';
import { lifeSkillForRecipe, resolveDefaultYield } from './recipe-yield';

export type AcquisitionStrategy = 'buy_all' | 'gather_all' | 'custom' | 'optimized';

@Component({
  selector: 'app-recipe-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    RouterLink,
    RecipeBranch,
    RecipeGraph,
    ItemIcon,
    TaxOptionsComponent,
    HlmButton,
  ],
  templateUrl: './recipe-tree.html',
  styleUrl: './recipe-tree.scss',
})
export class RecipeTree {
  readonly planMessage = signal('');
  saveShoppingList() {
    const result = this.currentProductionPlan(),
      root = this.root();
    if (!result || !root) return;
    const state = this.store.data();
    const existing = state.personalPlans.find(
      (plan) =>
        plan.region === state.region &&
        plan.sourceItemId === root.part.itemId &&
        plan.status === 'draft',
    );
    const parsed = personalPlanSchema.safeParse({
      id: existing?.id ?? crypto.randomUUID(),
      name: this.craftCount().toLocaleString('pt-BR') + ' receitas de ' + root.part.name,
      region: state.region,
      createdAt: new Date().toISOString(),
      sourceItemId: root.part.itemId,
      excludedStockLocations: this.excludedLocations(),
      materials: result.materials
        .filter((row) => row.bought > 0)
        .map((row) => ({
          itemId: row.itemId,
          name: this.productionMaterialName(row.itemId),
          quantity: Math.ceil(row.bought),
        })),
    });
    if (!parsed.success) {
      this.planMessage.set(
        'A lista excede os limites de planejamento. Reduza a quantidade ou a árvore.',
      );
      return;
    }
    if (
      this.store.update((workspace) => ({
        ...workspace,
        personalPlans: [
          ...workspace.personalPlans.filter((plan) => plan.id !== parsed.data.id),
          parsed.data,
        ],
      }))
    )
      this.planMessage.set('Lista salva. O estoque será recalculado ao abrir o planejamento.');
  }
  readonly recipe = input<CatalogRecipe | null>(null);
  readonly recipes = input<CatalogRecipe[]>([]);
  readonly selectedItem = input<CatalogItemDetail | null>(null);
  readonly datasetVersion = input('');
  readonly rootMethod = output<CatalogRecipe | null>();
  readonly advancedChanged = output<boolean>();
  readonly advanced = signal(false);
  readonly detailsOpen = signal(false);
  readonly store = inject(WorkspaceStore);
  readonly catalog = inject(CatalogApiService);
  private readonly knowledge = inject(RecipeKnowledge);
  private readonly sessions = inject(RecipeSessions);
  private sessionKey = '';
  private readonly market = inject(MarketApi);
  private readonly marketCache = inject(MarketCacheService);
  private readonly destroyRef = inject(DestroyRef);
  readonly region = computed(() => this.store.data().region);
  readonly root = signal<RecipeNode | null>(null);
  readonly bulkRunning = signal(false);
  readonly bulkMessage = signal('');
  private bulkStop: Subject<void> | null = null;
  private bulkLoadingPath: string | null = null;
  readonly target = signal(100);
  readonly craftCount = signal(100);
  readonly acquisitionStrategy = signal<AcquisitionStrategy>('buy_all');
  readonly optimizationMessage = signal('');
  readonly customMaterialSource = signal(new Map<number, ProductionChoice>());
  readonly customItemPrices = signal(new Map<number, string>());
  readonly marketQuotes = signal(new Map<number, MarketItemQuote>());
  readonly quoteObservedAt = signal(new Map<number, string>());
  readonly methodTimes = signal(new Map<string, number>());
  readonly gatherEstimates = signal(new Map<number, ProductionEstimate>());
  readonly gatherEstimateDrafts = signal(
    new Map<number, { expectedYield: number | null; craftSeconds: number | null }>(),
  );
  readonly masteryOverride = signal<number | null>(null);
  readonly masteryInput = signal<number | null>(null);
  private readonly masteryChanges$ = new Subject<number | null>();
  readonly displayedMastery = computed(
    () => this.masteryInput() ?? this.userMasteryForCurrentRecipe(),
  );
  private readonly autoMarket$ = new Subject<void>();
  readonly treeMarketLoading = signal(false);
  readonly treeMarketMessage = signal('');
  private quoteSubscription?: Subscription;
  private quoteRefreshTimer?: ReturnType<typeof setInterval>;
  readonly recipeGraph = signal<RecipeProductionGraph | null>(null);
  private recipeGraphIdentity = '';
  private quoteRevision = 0;
  private lastConsultTime = 0;
  private detailsReturnFocus: HTMLElement | null = null;

  readonly userMasteryForCurrentRecipe = computed(() => {
    const root = this.root();
    if (!root?.recipe) return 0;
    const skill = lifeSkillForRecipe(root.recipe.type);
    if (!skill) return 0;
    const activeChar = this.store.activeCharacter();
    if (!activeChar) return 0;
    const val = activeChar?.mastery?.[skill as (typeof lifeSkills)[number]];
    return typeof val === 'number' && Number.isFinite(val) ? val : 0;
  });

  readonly canAdjustRootYield = computed(() => {
    const root = this.root();
    if (!root?.recipe) return false;
    return (
      fixedRecipeYield(root.recipe, root.part.itemId) === null &&
      !(
        Number(root.recipe.outputs.find((output) => output.itemId === root.part.itemId)?.quantity) >
        0
      )
    );
  });

  readonly effectiveYield = computed(() => {
    const root = this.root();
    if (!root) return 1;
    const fixed = root.recipe
      ? (fixedRecipeYield(root.recipe, root.part.itemId) ??
        (Number(
          root.recipe.outputs.find((output) => output.itemId === root.part.itemId)?.quantity,
        ) ||
          null))
      : null;
    if (fixed !== null) return fixed;
    if (root.yield !== null && root.yield > 0) return root.yield;
    if (!root.recipe) return 1;
    return resolveDefaultYield(
      root.recipe,
      root.part.itemId,
      this.masteryOverride() ?? this.userMasteryForCurrentRecipe(),
    );
  });

  readonly yieldDescription = computed(() => {
    const root = this.root();
    if (!root?.recipe) return 'Item sem receita direta';
    const fixed = fixedRecipeYield(root.recipe, root.part.itemId);
    if (fixed !== null) return `Rendimento fixo verificado: ${fixed} un / receita`;
    const catalogQuantity = Number(
      root.recipe.outputs.find((output) => output.itemId === root.part.itemId)?.quantity,
    );
    if (catalogQuantity > 0)
      return `Saída do catálogo: ${catalogQuantity} un / receita; proc adicional não modelado`;
    if (root.yield !== null && root.yield > 0) {
      return `Rendimento ajustado: ${root.yield} un / receita`;
    }
    const mastery = this.masteryOverride() ?? this.userMasteryForCurrentRecipe();
    const skill = lifeSkillForRecipe(root.recipe.type);
    if (mastery > 0 && skill) {
      return `Média estimada: ${this.effectiveYield().toFixed(2)} un / receita (${skill} maestria: ${mastery})`;
    }
    return `Média padrão: ${this.effectiveYield().toFixed(2)} un / receita`;
  });

  setCraftCount(value: number | null) {
    const count = Math.max(1, Math.min(1_000_000, Math.floor(Number(value) || 1)));
    this.craftCount.set(count);
    const y = this.effectiveYield();
    this.target.set(Math.max(1, Math.floor(count * y)));
  }

  setAcquisitionStrategy(strategy: AcquisitionStrategy) {
    if (strategy === 'optimized') {
      this.optimizeAcquisition();
      return;
    }
    const sources = new Map<number, ProductionChoice>();
    const ids = this.materialItemIds();
    for (const itemId of ids)
      sources.set(itemId, strategy === 'buy_all' ? 'buy' : this.makeChoice(itemId));
    this.customMaterialSource.set(sources);
    this.acquisitionStrategy.set(strategy);
    this.optimizationMessage.set('');
  }

  toggleMaterialSource(itemId: number) {
    const effectiveCurrent = this.materialSource(itemId);
    const nextChoice = effectiveCurrent === 'buy' ? this.makeChoice(itemId) : 'buy';
    const updated = new Map(this.customMaterialSource());
    updated.set(itemId, nextChoice);
    this.customMaterialSource.set(updated);
    this.acquisitionStrategy.set('custom');
    this.optimizationMessage.set('');
  }

  setMaterialSource(itemId: number, choice: ProductionChoice): void {
    const updated = new Map(this.customMaterialSource());
    updated.set(itemId, choice);
    this.customMaterialSource.set(updated);
    this.acquisitionStrategy.set('custom');
    this.optimizationMessage.set('');
  }

  materialSource(itemId: number): ProductionChoice {
    return this.customMaterialSource().get(itemId) ?? 'buy';
  }

  setCustomPrice(itemId: number, price: string | number | null): void {
    const str = price === null || price === '' ? null : String(price).replace(/\D/g, '');
    const updated = new Map(this.customItemPrices());
    if (str && /^\d+$/.test(str) && BigInt(str) > 0n) {
      updated.set(itemId, str);
      const live = new Map(this.livePrices());
      live.set(itemId, str);
      this.livePrices.set(live);
      const observed = new Map(this.quoteObservedAt());
      observed.set(itemId, new Date().toISOString());
      this.quoteObservedAt.set(observed);
    } else {
      updated.delete(itemId);
      const live = new Map(this.livePrices());
      live.delete(itemId);
      this.livePrices.set(live);
    }
    this.customItemPrices.set(updated);
  }

  customPrice(itemId: number): string {
    return this.customItemPrices().get(itemId) ?? '';
  }

  readonly materialDecisions = computed(() => {
    const itemIds = this.materialItemIds();
    const plannerRows = this.plannerMaterials();
    const quotes = this.marketQuotes();
    const partsMap = this.parts();
    const pendingQuantityIds = new Set(
      this.currentProductionPlan()
        ?.issues.filter((issue) => issue.code === 'missing-quantity' && issue.itemId !== undefined)
        .map((issue) => issue.itemId!) ?? [],
    );

    return itemIds
      .map((itemId) => {
        const plannerRow = plannerRows.find((r) => r.itemId === itemId);
        const name = this.productionMaterialName(itemId);
        const part = partsMap.get(itemId);
        const iconUrl = this.catalog.resolveIconUrl(part ?? { iconUrl: null });
        const canProduce = this.makeChoice(itemId) !== 'buy';
        const source = this.materialSource(itemId);
        const sourceLabel = this.materialSourceLabel(itemId);
        const required = plannerRow?.required ?? 0;
        const quantityPending = pendingQuantityIds.has(itemId);
        const bought = plannerRow?.bought ?? (source === 'buy' ? required : 0);
        const produced = plannerRow?.produced ?? (source !== 'buy' ? required : 0);
        const fromStock = plannerRow?.owned ?? 0;
        const unitPrice = this.price(itemId);
        const totalMarketCost = this.materialPurchaseValue(itemId, required);
        const liveQuote = quotes.get(itemId);
        const stock = liveQuote?.stock ?? null;
        const totalTrades = liveQuote?.totalTrades ?? null;

        return {
          itemId,
          name,
          iconUrl,
          required,
          quantityPending,
          bought,
          produced,
          fromStock,
          source,
          sourceLabel,
          canProduce,
          unitPrice,
          totalMarketCost,
          stock,
          totalTrades,
        };
      })
      .filter((item) => item.required > 0 || item.quantityPending);
  });

  private materialItemIds(): number[] {
    const graph = this.recipeGraph();
    const rootItemId = this.root()?.part.itemId;
    if (graph) return graph.itemIds.filter((itemId) => itemId !== rootItemId);
    const ids = new Set<number>();
    const visit = (node: RecipeNode) => {
      node.children.forEach((child) => {
        ids.add(child.part.itemId);
        visit(child);
      });
    };
    const root = this.root();
    if (root) visit(root);
    return [...ids].sort((left, right) => left - right);
  }

  makeChoice(itemId: number): ProductionChoice {
    const producer = this.recipeGraph()?.producerRecipes.some((recipe) =>
      recipe.outputs.some((output) => output.itemId === itemId),
    );
    if (producer) return 'produce';
    return 'gather';
  }

  productionMaterialName(itemId: number): string {
    const existing = this.parts().get(itemId)?.name;
    if (existing) return existing;
    const graph = this.recipeGraph();
    for (const recipe of [graph?.rootRecipe, ...(graph?.producerRecipes ?? [])]) {
      const part = recipe?.inputs.find((input) => input.itemId === itemId);
      if (part) return part.name;
    }
    return `Item ${itemId}`;
  }

  materialSourceLabel(itemId: number): string {
    const choice = this.materialSource(itemId);
    return choice === 'buy' ? 'Comprar' : choice === 'gather' ? 'Coletar' : 'Fazer';
  }

  materialPurchaseValue(itemId: number, quantity: number): string {
    if (quantity <= 0) return '—';
    const price = this.price(itemId);
    if (price === null || !/^\d{1,24}$/.test(price)) return 'Sem cotação';
    const amount = BigInt(Math.ceil(quantity));
    return this.silver(String(BigInt(price) * amount));
  }

  optimizeAcquisition(): void {
    this.applyDefaultMethodTimes();
    const result = this.productionResult();
    const best = result?.ranked.find((plan) => plan.scenario === 'optimized');
    if (best && !best.issues.length && best.sourceChoices) {
      const sources = new Map<number, ProductionChoice>();
      for (const itemId of this.materialItemIds())
        sources.set(itemId, best.sourceChoices[itemId] ?? 'buy');
      this.customMaterialSource.set(sources);
      this.acquisitionStrategy.set('optimized');
      this.optimizationMessage.set('Melhor combinação por lucro aplicada com sucesso.');
      return;
    }
    this.optimizationMessage.set(
      `Não há combinação conclusiva: ${result?.incomplete.find((plan) => plan.scenario === 'optimized')?.issues.length ?? 1} dados da cadeia precisam ser confirmados.`,
    );
  }

  selectMaterial(itemId: number): void {
    const path = this.allocationPath(itemId);
    this.action({ path, action: 'source' });
    this.graph()?.center(path);
  }

  closeDetails(): void {
    const itemId = this.selectedNode()?.part.itemId;
    this.detailsOpen.set(false);
    const trigger = this.detailsReturnFocus;
    this.detailsReturnFocus = null;
    setTimeout(() => {
      const fallback =
        itemId === undefined
          ? null
          : document.querySelector<HTMLElement>(
              `.sidebar-material-row[data-item-id="${itemId}"] .sidebar-material-details`,
            );
      const target =
        trigger?.isConnected && !trigger.closest('.bottom-details-tray')
          ? trigger
          : (fallback ?? document.querySelector<HTMLElement>('.craft-count-input'));
      target?.focus({ preventScroll: true });
    }, 0);
  }

  setMasteryOverride(value: number | string | null): void {
    if (value === null || value === '') {
      this.masteryInput.set(null);
      this.masteryChanges$.next(null);
      return;
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 5000) return;
    this.masteryInput.set(parsed);
    this.masteryChanges$.next(parsed);
  }

  setMethodTime(method: string, value: number | string | null): void {
    const seconds = value === null || value === '' ? null : Number(value);
    if (seconds !== null && (!Number.isFinite(seconds) || seconds <= 0 || seconds > 1_000_000))
      return;
    if (this.sessionKey) this.sessions.setMethodTime(this.sessionKey, method, seconds);
    const times = new Map(this.methodTimes());
    if (seconds === null) times.delete(method);
    else times.set(method, seconds);
    this.methodTimes.set(times);
    this.optimizationMessage.set('');
  }

  setGatherEstimate(
    itemId: number,
    expectedYield: number | null,
    craftSeconds: number | null,
  ): void {
    if (this.sessionKey)
      this.sessions.setGatherEstimate(this.sessionKey, itemId, expectedYield, craftSeconds);
    const estimates = new Map(this.gatherEstimates());
    if (expectedYield === null && craftSeconds === null) estimates.delete(itemId);
    else if (
      expectedYield !== null &&
      craftSeconds !== null &&
      Number.isFinite(expectedYield) &&
      expectedYield > 0 &&
      Number.isFinite(craftSeconds) &&
      craftSeconds > 0
    )
      estimates.set(itemId, { expectedYield, craftSeconds, source: 'calibrated' });
    else return;
    this.gatherEstimates.set(estimates);
    this.gatherEstimateDrafts.update((drafts) => {
      const next = new Map(drafts);
      if (expectedYield === null && craftSeconds === null) next.delete(itemId);
      else next.set(itemId, { expectedYield, craftSeconds });
      return next;
    });
    this.optimizationMessage.set('');
  }

  setGatherEstimateInput(
    itemId: number,
    field: 'expectedYield' | 'craftSeconds',
    value: number | string | null,
  ): void {
    const parsed = value === null || value === '' ? null : Number(value);
    if (parsed !== null && (!Number.isFinite(parsed) || parsed <= 0)) return;
    const current = this.gatherEstimateDrafts().get(itemId) ?? {
      expectedYield: this.gatherEstimates().get(itemId)?.expectedYield ?? null,
      craftSeconds: this.gatherEstimates().get(itemId)?.craftSeconds ?? null,
    };
    const next = { ...current, [field]: parsed };
    this.gatherEstimateDrafts.update((drafts) => new Map(drafts).set(itemId, next));
    if (next.expectedYield === null && next.craftSeconds === null)
      this.setGatherEstimate(itemId, null, null);
    else if (next.expectedYield !== null && next.craftSeconds !== null)
      this.setGatherEstimate(itemId, next.expectedYield, next.craftSeconds);
    else {
      this.gatherEstimates.update((estimates) => {
        const updated = new Map(estimates);
        updated.delete(itemId);
        return updated;
      });
      if (this.sessionKey) this.sessions.setGatherEstimate(this.sessionKey, itemId, null, null);
      this.optimizationMessage.set('');
    }
  }

  readonly ingredientPreview = computed(() => {
    const root = this.root();
    const operations = this.requestedOperations();
    const y = this.effectiveYield();
    if (!root?.recipe || !Number.isSafeInteger(operations) || operations <= 0) return null;
    return {
      operations,
      produced: operations * y,
      ingredients: root.children.map((child) => ({
        ...child.part,
        total:
          child.part.quantity !== null && Number(child.part.quantity) > 0
            ? Number(child.part.quantity) * operations
            : null,
      })),
    };
  });
  readonly view = signal<'graph' | 'tree' | 'list'>('graph');
  readonly selectedPath = signal('root');
  readonly graph = viewChild(RecipeGraph);
  readonly excludedLocations = signal<string[]>([]);
  readonly livePrices = signal(new Map<number, string>());
  readonly history = signal<MarketHistoryPoint[]>([]);
  readonly historyMessage = signal('');
  readonly context = signal<{
    node: RecipeNode;
    item: CatalogItemDetail | null;
    origins: ItemSources;
    recipes: CatalogRecipe[];
    uses: CatalogRecipe[];
    incomplete: boolean;
  } | null>(null);
  readonly contextLoading = signal(false);
  readonly contextMessage = signal('');
  readonly selectedLocation = signal<ItemSources['nodes'][number] | null>(null);
  readonly origins = signal(new Map<number, ItemSources['nodes']>());
  readonly typeLabel = recipeTypeLabel;
  readonly silver = silver;
  readonly date = (value: string | null | undefined) =>
    value && Number.isFinite(Date.parse(value)) ? date(value) : 'Não informada';
  private revision = 0;
  private contextRevision = 0;
  private selectionIdentity = '';
  private readonly expansions = new Map<string, symbol>();
  readonly locations = computed(() => {
    const groups = new Map<string, { key: string; name: string; count: number; old: number }>();
    for (const row of this.store.data().inventory.filter((r) => r.region === this.region())) {
      const key = stockLocationKey(row),
        owner = this.store.data().characters.find((c) => c.id === row.characterId);
      const group = groups.get(key) ?? {
        key,
        name:
          row.kind === 'inventory'
            ? 'Inventário · ' + (owner?.name ?? row.location)
            : 'Armazém · ' + row.location,
        count: 0,
        old: 0,
      };
      group.count++;
      if (!row.updatedAt || Date.now() - Date.parse(row.updatedAt) > 30 * 86400000) group.old++;
      groups.set(key, group);
    }
    return [...groups.values()];
  });
  readonly plan = computed(() => {
    const root = this.root();
    return root
      ? planRecipeTree(
          this.withEstimatedYields(root),
          Math.max(1, Math.floor(this.requestedOperations() * this.effectiveYield())),
          this.store.data(),
          {
            rootCrafts: this.requestedOperations(),
            excludedLocations: this.excludedLocations(),
            prices: this.livePrices(),
          },
        )
      : null;
  });
  readonly parts = computed(() => {
    const parts = new Map<number, CatalogRecipePart>();
    const visit = (node: RecipeNode) => {
      parts.set(node.part.itemId, node.part);
      node.children.forEach(visit);
    };
    if (this.root()) visit(this.root()!);
    return parts;
  });
  readonly requestedOperations = computed(() =>
    Math.max(1, Math.min(1_000_000, Math.floor(this.craftCount() || 1))),
  );
  readonly productionResult = computed(() => {
    const graph = this.recipeGraph();
    if (!graph) return null;
    const root = this.root();
    const yieldOverrides = new Map<number, number>();
    if (root?.yield !== null && root?.yield !== undefined && root.yield > 0)
      yieldOverrides.set(root.part.itemId, root.yield);
    return planProduction(
      buildRecipeProductionInput(
        graph,
        this.requestedOperations(),
        this.store.data(),
        this.marketQuotes(),
        this.effectiveMethodTimes(),
        this.gatherEstimates(),
        this.customMaterialSource(),
        new Date(),
        {
          quoteObservedAt: this.quoteObservedAt(),
          masteryOverride: this.masteryOverride(),
          yieldOverrides,
          excludedLocations: this.excludedLocations(),
        },
      ),
    );
  });
  readonly currentProductionPlan = computed<ProductionPlan | null>(() => {
    const result = this.productionResult();
    if (!result) return null;
    const scenario =
      this.acquisitionStrategy() === 'buy_all'
        ? 'buy-all'
        : this.acquisitionStrategy() === 'optimized'
          ? 'optimized'
          : 'custom';
    return (
      result.ranked.find((plan) => plan.scenario === scenario) ??
      result.incomplete.find((plan) => plan.scenario === scenario) ??
      null
    );
  });
  readonly bestProductionPlan = computed(
    () => this.productionResult()?.ranked.find((plan) => plan.scenario === 'optimized') ?? null,
  );
  readonly bestCombinationSummary = computed(() => {
    const choices = this.bestProductionPlan()?.sourceChoices;
    if (!choices) return null;
    const values = Object.values(choices);
    const made = values.filter((choice) => choice === 'produce' || choice === 'gather').length;
    return `${made} fazer/coletar · ${values.length - made} comprar`;
  });
  readonly methodCalibrationRows = computed(() => {
    const graph = this.recipeGraph();
    if (!graph) return [];
    const recipes = [graph.rootRecipe, ...graph.producerRecipes];
    const methods = [...new Set(recipes.map((recipe) => recipe.type))].sort();
    return methods.map((method) => ({
      method,
      label: this.typeLabel(method),
      seconds: this.methodTimes().get(method) ?? null,
    }));
  });
  readonly gatheringCalibrationRows = computed(() => {
    const graph = this.recipeGraph();
    if (!graph) return [];
    const rootId = graph.rootRecipe.outputs[0]?.itemId;
    const producedIds = new Set(
      [graph.rootRecipe, ...graph.producerRecipes].flatMap((recipe) =>
        recipe.outputs.map((output) => output.itemId),
      ),
    );
    const parts = new Map<number, CatalogRecipePart>();
    for (const recipe of [graph.rootRecipe, ...graph.producerRecipes])
      for (const part of recipe.inputs) parts.set(part.itemId, part);
    return graph.itemIds
      .filter((itemId) => itemId !== rootId && !producedIds.has(itemId))
      .map((itemId) => {
        const part = parts.get(itemId);
        const estimate = this.gatherEstimates().get(itemId);
        const draft = this.gatherEstimateDrafts().get(itemId);
        return {
          itemId,
          name: part?.name ?? `Item ${itemId}`,
          expectedYield: draft?.expectedYield ?? estimate?.expectedYield ?? null,
          craftSeconds: draft?.craftSeconds ?? estimate?.craftSeconds ?? null,
        };
      });
  });
  readonly plannerMaterials = computed(() => this.currentProductionPlan()?.materials ?? []);
  readonly points = computed(() => {
    const nodes = this.contextSources().filter((n) => n.position?.length === 3);
    if (!nodes.length) return [];
    const xs = nodes.map((n) => n.position![0]),
      zs = nodes.map((n) => n.position![2]),
      minX = Math.min(...xs),
      minZ = Math.min(...zs);
    const spanX = Math.max(...xs) - minX,
      spanZ = Math.max(...zs) - minZ;
    const scale = Math.min(310 / Math.max(spanX, 1), 150 / Math.max(spanZ, 1));
    return nodes.map((node, index) => ({
      node,
      index,
      x: (360 - spanX * scale) / 2 + (node.position![0] - minX) * scale,
      y: (200 - spanZ * scale) / 2 + (node.position![2] - minZ) * scale,
    }));
  });
  readonly operationsCount = computed(() => {
    return this.currentProductionPlan()?.crafts ?? this.requestedOperations();
  });

  readonly producedQuantity = computed(() => {
    const ops = this.operationsCount();
    const y = this.effectiveYield();
    return ops * y;
  });

  readonly formattedProducedQuantity = computed(() => {
    return Math.floor(this.producedQuantity()).toLocaleString('pt-BR');
  });

  readonly effectiveMaterialCost = computed(() => {
    const plan = this.currentProductionPlan();
    return plan && plan.issues.length === 0 ? plan.economicCost : null;
  });

  readonly productPrice = computed(() => {
    const root = this.root();
    return root ? this.price(root.part.itemId) : null;
  });

  readonly grossRevenue = computed(() => {
    return this.currentProductionPlan()?.grossRevenue ?? null;
  });

  readonly netRevenue = computed(() => {
    return this.currentProductionPlan()?.netRevenue ?? null;
  });

  readonly profit = computed(() => {
    const plan = this.currentProductionPlan();
    return plan && plan.issues.length === 0 ? plan.profit : null;
  });

  readonly isPositiveProfit = computed(() => {
    const p = this.profit();
    return p !== null && !p.startsWith('-') && p !== '0';
  });

  readonly isNegativeProfit = computed(() => {
    const p = this.profit();
    return p !== null && p.startsWith('-');
  });

  readonly profitMargin = computed(() => {
    const p = this.profit();
    const economicCost = this.effectiveMaterialCost();
    if (p === null || economicCost === null || economicCost === '0') return null;
    try {
      const costNum = Number(economicCost);
      const profitNum = Number(p);
      if (costNum <= 0 || !Number.isFinite(profitNum)) return 100.0;
      return (profitNum / costNum) * 100;
    } catch {
      return null;
    }
  });

  readonly primaryMethod = computed(() => this.root()?.recipe?.type ?? '');
  readonly masteryApplies = computed(() => {
    const graph = this.recipeGraph();
    const root = this.root();
    const rootSkill = root?.recipe ? lifeSkillForRecipe(root.recipe.type) : null;
    if ((rootSkill !== 'cooking' && rootSkill !== 'alchemy') || !root?.recipe) return false;
    const activeRecipes = new Set(this.currentProductionPlan()?.steps.map((step) => step.recipeId));
    const recipes = graph ? [graph.rootRecipe, ...graph.producerRecipes] : [root.recipe];
    return recipes.some((recipe) => {
      if (graph && !activeRecipes.has(recipe.key)) return false;
      if (lifeSkillForRecipe(recipe.type) !== rootSkill) return false;
      const output = recipe.outputs[0];
      if (!output || fixedRecipeYield(recipe, output.itemId) !== null) return false;
      if (Number(output.quantity) > 0) return false;
      return recipe.key !== root.recipe?.key || !(root.yield !== null && root.yield > 0);
    });
  });

  readonly primarySkillLabel = computed(() => {
    const root = this.root();
    if (!root?.recipe) return 'Profissão';
    const skill = lifeSkillForRecipe(root.recipe.type);
    if (skill === 'cooking') return 'Culinária';
    if (skill === 'alchemy') return 'Alquimia';
    if (skill === 'processing') return 'Processamento';
    return this.typeLabel(root.recipe.type);
  });

  readonly primaryMethodSeconds = computed(() => {
    const method = this.primaryMethod();
    if (!method) return 1.2;
    return this.methodTimes().get(method) ?? defaultRecipeMethodSeconds(method);
  });

  readonly effectiveMethodTimes = computed(() => {
    const custom = this.methodTimes();
    const graph = this.recipeGraph();
    const rootRecipe = this.root()?.recipe;
    const recipes = graph
      ? [graph.rootRecipe, ...graph.producerRecipes]
      : rootRecipe
        ? [rootRecipe]
        : [];
    const map = new Map<string, number>(custom);
    for (const r of recipes) {
      if (!map.has(r.type)) {
        map.set(r.type, defaultRecipeMethodSeconds(r.type));
      }
    }
    return map;
  });

  readonly totalCraftTimeSeconds = computed(() => {
    const fromPlan = this.currentProductionPlan()?.seconds;
    if (fromPlan !== null && fromPlan !== undefined && fromPlan > 0) return fromPlan;
    if (this.productPrice() === null) return null;
    const count = this.requestedOperations();
    const sec = this.primaryMethodSeconds();
    return count > 0 && sec > 0 ? count * sec : null;
  });

  applyDefaultMethodTimes(): void {
    const graph = this.recipeGraph();
    const rootRecipe = this.root()?.recipe;
    const recipes = graph
      ? [graph.rootRecipe, ...graph.producerRecipes]
      : rootRecipe
        ? [rootRecipe]
        : [];
    if (!recipes.length) return;
    const updated = new Map(this.methodTimes());
    for (const r of recipes) {
      if (!updated.has(r.type)) {
        updated.set(r.type, defaultRecipeMethodSeconds(r.type));
      }
    }
    this.methodTimes.set(updated);
  }

  readonly formattedCraftTime = computed(() => {
    const seconds = this.totalCraftTimeSeconds();
    if (seconds === null || !Number.isFinite(seconds) || seconds <= 0) return '—';
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const remainingSecs = Math.round(seconds % 60);
    if (seconds < 3600) {
      return remainingSecs > 0 ? `${mins}m ${remainingSecs}s` : `${mins}m`;
    }
    const hours = Math.floor(seconds / 3600);
    const remainingMins = Math.floor((seconds % 3600) / 60);
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  });

  readonly profitPerHour = computed(() => {
    const plan = this.currentProductionPlan();
    return plan && plan.issues.length === 0 ? plan.profitPerHour : null;
  });

  consultAllTreePrices() {
    const now = Date.now();
    if (now - this.lastConsultTime < 500) return;
    this.lastConsultTime = now;
    if (this.treeMarketLoading() && this.quoteSubscription && !this.quoteSubscription.closed)
      return;
    const region = this.region();
    const root = this.root();
    if (!root) return;
    this.startRecipeQuoteRefresh();
    const selectedMethods = this.selectedRecipeMethods(root);
    const selectedMethodIdentity = [...selectedMethods]
      .sort(([left], [right]) => left - right)
      .map(([itemId, key]) => `${itemId}:${key}`);
    const graphIdentity = [
      region,
      this.datasetVersion(),
      root.part.itemId,
      root.recipe?.key ?? 'external',
      ...selectedMethodIdentity,
    ].join('/');
    if (graphIdentity !== this.recipeGraphIdentity) this.recipeGraph.set(null);
    this.recipeGraphIdentity = graphIdentity;
    const cachedGraph = this.recipeGraph();
    const graph$: Observable<RecipeProductionGraph | null> = cachedGraph
      ? of(cachedGraph)
      : root.recipe
        ? resolveRecipeProductionGraph(
            root.recipe,
            this.catalog,
            selectedMethods,
            this.datasetVersion(),
          )
        : of(null);
    const revision = ++this.quoteRevision;
    this.quoteSubscription?.unsubscribe();
    this.treeMarketLoading.set(true);
    this.treeMarketMessage.set('Atualizando cotações da receita...');
    this.quoteSubscription = graph$
      .pipe(
        switchMap((graph) => {
          if (revision !== this.quoteRevision) return EMPTY;
          if (graph) {
            if (graph.issues.some((issue) => issue.code === 'dataset-mismatch'))
              throw new Error('O catálogo mudou durante a consulta da receita.');
            this.recipeGraph.set(graph);
            this.quoteObservedAt.update((current) => {
              const next = new Map(current);
              for (const itemId of graph.itemIds) {
                const entry = this.marketCache.getCachedQuoteEntry(itemId, region);
                if (entry) next.set(itemId, new Date(entry.fetchedAt).toISOString());
              }
              return next;
            });
            return (
              this.marketCache.resolveProductionQuotes ?? this.marketCache.resolveQuotesBatch
            ).call(this.marketCache, graph.itemIds, region);
          }
          const itemIds = [...new Set([root.part.itemId, ...this.parts().keys()])].sort(
            (left, right) => left - right,
          );
          return (
            this.marketCache.resolveProductionQuotes ?? this.marketCache.resolveQuotesBatch
          ).call(this.marketCache, itemIds, region);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (quotesMap) => {
          if (revision !== this.quoteRevision) return;
          const newPrices = new Map(this.livePrices());
          const newQuotes = new Map(this.marketQuotes());
          const observed = new Map(this.quoteObservedAt());
          for (const [id, quote] of quotesMap) {
            if (quote) {
              newQuotes.set(id, quote);
              if (quote.price !== null && quote.price !== undefined) {
                newPrices.set(id, quote.price);
              }
              const entry = this.marketCache.getCachedQuoteEntry(id, region);
              if (entry) observed.set(id, new Date(entry.fetchedAt).toISOString());
            }
          }
          this.livePrices.set(newPrices);
          this.marketQuotes.set(newQuotes);
          this.quoteObservedAt.set(observed);
        },
        error: () => {
          if (revision !== this.quoteRevision) return;
          this.treeMarketLoading.set(false);
          this.treeMarketMessage.set('Não foi possível atualizar as cotações da receita.');
        },
        complete: () => {
          if (revision !== this.quoteRevision) return;
          this.treeMarketLoading.set(false);
          const count = this.marketQuotes().size;
          this.treeMarketMessage.set(
            count > 0
              ? `${count} ${count === 1 ? 'cotação disponível' : 'cotações disponíveis'} no cache do Mercado Central.`
              : 'Nenhuma cotação encontrada para os itens desta receita.',
          );
        },
      });
  }

  private selectedRecipeMethods(root: RecipeNode): ReadonlyMap<number, string> {
    const methods = new Map<number, string>();
    const visit = (node: RecipeNode) => {
      if (node.recipe) methods.set(node.part.itemId, node.recipe.key);
      node.children.forEach(visit);
    };
    visit(root);
    return methods;
  }

  private startRecipeQuoteRefresh(): void {
    if (this.quoteRefreshTimer) return;
    this.quoteRefreshTimer = setInterval(
      () => this.consultAllTreePrices(),
      DEFAULT_MARKET_CACHE_TTL_MS,
    );
  }

  private stopRecipeQuoteRefresh(): void {
    if (this.quoteRefreshTimer) clearInterval(this.quoteRefreshTimer);
    this.quoteRefreshTimer = undefined;
    this.quoteSubscription?.unsubscribe();
    this.quoteSubscription = undefined;
    this.quoteRevision++;
    this.recipeGraph.set(null);
    this.recipeGraphIdentity = '';
    this.treeMarketLoading.set(false);
  }

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopExpansion();
      this.stopRecipeQuoteRefresh();
    });
    this.autoMarket$.pipe(debounceTime(350), takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.consultAllTreePrices();
    });
    this.masteryChanges$
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.masteryOverride.set(value));

    effect(() => {
      const recipe = this.recipe(),
        item = this.selectedItem();
      this.knowledge.useVersion(this.datasetVersion());
      const identity =
        this.region() +
        '/' +
        this.datasetVersion() +
        '/' +
        (item?.id ?? recipe?.outputs[0]?.itemId ?? '');
      // A root-method output is echoed by the page. Keep the already updated tree and context.
      if (identity === this.selectionIdentity && untracked(this.root)?.recipe?.key === recipe?.key)
        return;
      this.stopRecipeQuoteRefresh();
      this.revision++;
      this.stopExpansion();
      this.bulkMessage.set('');
      this.expansions.clear();
      this.contextRevision++;
      this.context.set(null);
      this.detailsOpen.set(false);
      this.contextMessage.set('');
      this.contextLoading.set(false);
      this.history.set([]);
      this.historyMessage.set('');
      if (identity !== this.selectionIdentity) {
        this.livePrices.set(new Map());
        this.marketQuotes.set(new Map());
        this.quoteObservedAt.set(new Map());
        this.customMaterialSource.set(new Map());
        this.acquisitionStrategy.set('buy_all');
        this.optimizationMessage.set('');
        this.origins.set(new Map());
        this.selectionIdentity = identity;
        this.lastConsultTime = 0;
      }
      const nextSessionKey = identity + '/' + (recipe?.key ?? 'external');
      if (nextSessionKey !== this.sessionKey) {
        this.masteryInput.set(null);
        this.masteryOverride.set(null);
      }
      this.sessionKey = nextSessionKey;
      this.selectedPath.set('root');
      this.selectedLocation.set(null);
      const output = item
        ? { itemId: item.id, name: item.name, quantity: null, iconUrl: item.iconUrl }
        : recipe?.outputs[0];
      const rawNode = output
        ? recipe
          ? withRecipe({ ...nodeFor(output, 'root'), options: this.recipes() }, recipe)
          : nodeFor(output, 'root')
        : null;
      this.root.set(rawNode);
      if (item?.categories[0])
        this.patch('root', (node) => ({ ...node, category: item.categories[0].name }));
      const session = this.sessions.get(this.sessionKey);
      if (session) {
        this.root.set(session.root);
        this.setCraftCount(
          session.craftCount ?? Math.max(1, Math.ceil(session.target / this.effectiveYield())),
        );
        this.view.set(session.view);
        this.excludedLocations.set(session.excludedLocations);
        this.methodTimes.set(new Map(Object.entries(session.methodTimes ?? {})));
        const gatherEstimates = new Map(
          Object.entries(session.gatherEstimates ?? {}).map(([id, estimate]) => [
            Number(id),
            estimate,
          ]),
        );
        this.gatherEstimates.set(gatherEstimates);
        this.gatherEstimateDrafts.set(
          new Map(
            [...gatherEstimates].map(([id, estimate]) => [
              id,
              {
                expectedYield: estimate.expectedYield ?? null,
                craftSeconds: estimate.craftSeconds ?? null,
              },
            ]),
          ),
        );
        this.customMaterialSource.set(
          new Map(
            Object.entries(session.sourceOverrides ?? {}).map(([id, choice]) => [
              Number(id),
              choice,
            ]),
          ),
        );
        this.masteryInput.set(session.masteryOverride ?? null);
        this.masteryOverride.set(session.masteryOverride ?? null);
        if (session.sourceOverrides && Object.keys(session.sourceOverrides).length)
          this.acquisitionStrategy.set('custom');
      }
      this.autoMarket$.next();
    });
    effect(() => {
      const root = this.root(),
        target = this.target(),
        craftCount = this.craftCount(),
        view = this.view(),
        excludedLocations = this.excludedLocations(),
        methodTimes = this.methodTimes(),
        gatherEstimates = this.gatherEstimates(),
        sourceOverrides = this.customMaterialSource(),
        masteryOverride = this.masteryOverride();
      if (root && this.sessionKey)
        this.sessions.save(this.sessionKey, {
          root,
          target,
          craftCount,
          view,
          excludedLocations,
          methodTimes: Object.fromEntries(methodTimes),
          gatherEstimates: Object.fromEntries(gatherEstimates),
          sourceOverrides: Object.fromEntries(sourceOverrides),
          ...(masteryOverride === null ? {} : { masteryOverride }),
        });
    });
  }
  toggleLocation(key: string, included: boolean) {
    this.excludedLocations.update((rows) =>
      included ? rows.filter((row) => row !== key) : [...new Set([...rows, key])],
    );
  }
  toggleAdvanced() {
    this.advanced.update((value) => !value);
    this.advancedChanged.emit(this.advanced());
  }
  methodLabel(method: CatalogRecipe, index: number) {
    return (
      (method.byproductOfItemId ? 'Subproduto · ' : '') +
      this.typeLabel(method.type) +
      ' · método ' +
      (index + 1) +
      ' · ' +
      method.inputs.length +
      ' materiais'
    );
  }
  productionMethods(recipes: CatalogRecipe[]) {
    return recipeFamilies(recipes).map((family) => family[0]);
  }
  methodKey(node: RecipeNode, recipes: CatalogRecipe[]) {
    return (
      recipeFamilies(recipes).find((family) =>
        family.some((recipe) => recipe.key === node.recipe?.key),
      )?.[0]?.key ?? ''
    );
  }
  setRootYield(value: number | null) {
    if (!this.canAdjustRootYield()) return;
    this.patch('root', (node) => ({ ...node, yield: value }));
    this.setCraftCount(this.craftCount());
  }
  private withEstimatedYields(node: RecipeNode): RecipeNode {
    const recipe = node.recipe;
    const skill = recipe ? lifeSkillForRecipe(recipe.type) : null;
    const rootRecipe = this.root()?.recipe;
    const rootSkill = rootRecipe ? lifeSkillForRecipe(rootRecipe.type) : null;
    const variableYield =
      recipe !== null &&
      fixedRecipeYield(recipe, node.part.itemId) === null &&
      !(Number(recipe.outputs.find((output) => output.itemId === node.part.itemId)?.quantity) > 0);
    const profileMastery = skill
      ? (this.store.activeCharacter()?.mastery?.[skill as (typeof lifeSkills)[number]] ?? 0)
      : 0;
    const mastery =
      skill && variableYield && skill === rootSkill
        ? (this.masteryOverride() ?? profileMastery)
        : profileMastery;
    const fixed = recipe
      ? (fixedRecipeYield(recipe, node.part.itemId) ??
        (Number(recipe.outputs.find((output) => output.itemId === node.part.itemId)?.quantity) ||
          null))
      : null;
    return {
      ...node,
      yield:
        fixed ??
        node.yield ??
        (recipe ? resolveDefaultYield(recipe, node.part.itemId, mastery) : node.yield),
      children: node.children.map((child) => this.withEstimatedYields(child)),
    };
  }
  setTax(value: TaxOptions) {
    this.store.update((state) => ({ ...state, taxOptions: value }));
  }
  allocationPath(id: number | undefined) {
    return this.plan()?.value?.allocations.find((row) => row.itemId === id)?.path ?? 'root';
  }
  patch(path: string, change: (node: RecipeNode) => RecipeNode) {
    this.root.update((root) => (root ? patchNode(root, path, change) : null));
  }
  find(path: string, node = this.root()): RecipeNode | null {
    if (!node) return null;
    if (node.path === path) return node;
    for (const child of node.children) {
      const found = this.find(path, child);
      if (found) return found;
    }
    return null;
  }
  stopExpansion() {
    if (this.bulkLoadingPath)
      this.patch(this.bulkLoadingPath, (node) => ({ ...node, loading: false }));
    this.bulkLoadingPath = null;
    this.bulkStop?.next();
    this.bulkStop?.complete();
    this.bulkStop = null;
    if (this.bulkRunning())
      this.bulkMessage.set('Expansão interrompida. Os itens abertos foram mantidos.');
    this.bulkRunning.set(false);
  }
  collapseAll() {
    this.stopExpansion();
    this.expansions.clear();
    this.contextRevision++;
    this.contextLoading.set(false);
    if (this.historyMessage() === 'Consultando histórico…') this.historyMessage.set('');
    const collapse = (node: RecipeNode): RecipeNode => ({
      ...node,
      expanded: false,
      loading: false,
      children: node.children.map(collapse),
    });
    this.root.update((root) => (root ? collapse(root) : null));
  }
  async expandAll() {
    if (!this.root() || this.bulkRunning()) return;
    const stop = new Subject<void>();
    this.bulkStop = stop;
    this.bulkRunning.set(true);
    const revision = this.revision;
    const queue = ['root'];
    let visited = 0,
      choices = 0,
      failures = 0,
      limited = false;
    const active = () => this.bulkStop === stop && revision === this.revision;
    try {
      while (queue.length && visited < 200 && active()) {
        const path = queue.shift()!;
        let node = this.find(path);
        if (!node) continue;
        visited++;
        this.bulkMessage.set(`Explorando ${visited} itens · ${node.part.name}`);
        if (this.ancestors(path).includes(node.part.itemId) || path.split('/').length > 12) {
          this.patch(path, (n) => ({
            ...n,
            message: 'Ciclo ou limite de profundidade: explore outra origem.',
          }));
          continue;
        }
        if (!node.recipe && !node.loading) {
          this.bulkLoadingPath = path;
          this.patch(path, (n) => ({ ...n, loading: true }));
          try {
            const response = await firstValueFrom(
              this.knowledge.produces(node.part.itemId).pipe(timeout(15000), takeUntil(stop)),
            );
            if (!active()) break;
            if (this.datasetVersion() && response.dataset?.version !== this.datasetVersion())
              throw new Error('Catalog version changed');
            const recipes = response.recipes.filter((r) =>
              r.outputs.some((part) => part.itemId === node!.part.itemId),
            );
            this.patch(path, (n) => ({ ...n, options: recipes, loading: false }));
            const families = recipeFamilies(recipes);
            const preferred = families[0]?.[0];
            if (
              families.length === 1 &&
              preferred &&
              (response.total ?? response.recipes.length) <= response.recipes.length &&
              this.count() + preferred.inputs.length <= 200 &&
              this.canChoose(node, preferred)
            ) {
              this.patch(path, (n) => withRecipe(n, preferred));
              if (path === 'root') this.rootMethod.emit(preferred);
            } else if (families.length > 1 || response.total > response.recipes.length) {
              choices++;
              this.patch(path, (n) => ({
                ...n,
                message:
                  'Escolha o método de produção. Ingredientes substituíveis ficam na mesma receita.',
              }));
            } else if (recipes.length === 1) limited = true;
            else {
              const origins = await firstValueFrom(
                this.knowledge.sources(node.part.itemId).pipe(timeout(15000), takeUntil(stop)),
              );
              if (!active()) break;
              if (this.datasetVersion() && origins.dataset?.version !== this.datasetVersion())
                throw new Error('Catalog version changed');
              const sources = [...origins.nodes, ...(origins.spots ?? [])];
              this.origins.update((all) => new Map(all).set(node!.part.itemId, sources));
              this.patch(path, (n) => ({
                ...n,
                expanded: true,
                message: sources.length ? '' : 'Sem receita ou origem vinculada no catálogo.',
              }));
            }
          } catch {
            if (!active()) break;
            failures++;
            this.patch(path, (n) => ({
              ...n,
              message: 'Não foi possível explorar este item. Tente abrir individualmente.',
            }));
          } finally {
            if (active()) {
              this.patch(path, (n) => ({ ...n, loading: false }));
              this.bulkLoadingPath = null;
            }
          }
        }
        node = this.find(path);
        if (node?.recipe) {
          this.patch(path, (n) => ({ ...n, expanded: true }));
          queue.push(...node.children.map((child) => child.path));
        }
      }
      if (active())
        this.bulkMessage.set(
          `${visited} ${visited === 1 ? 'item explorado' : 'itens explorados'}.${choices ? ` ${choices} ${choices === 1 ? 'item aguarda' : 'itens aguardam'} escolha de variante.` : ''}${failures ? ` ${failures} ${failures === 1 ? 'item precisa' : 'itens precisam'} de nova tentativa.` : ''}${limited || queue.length ? ' Limite de 200 itens atingido; continue por ramificação.' : ''}`,
        );
    } finally {
      if (this.bulkStop === stop) {
        this.bulkStop = null;
        this.bulkRunning.set(false);
      }
      stop.complete();
    }
  }
  action(event: BranchAction) {
    if (event.action !== 'source') this.stopExpansion();
    const node = this.find(event.path);
    if (!node) return;
    if (event.action === 'source') {
      this.selectedPath.set(node.path);
      this.showContext(node);
      setTimeout(() => {
        const row = document.querySelector(
          `.sidebar-material-row[data-item-id="${node.part.itemId}"]`,
        );
        row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        document
          .querySelector<HTMLElement>('.bottom-details-tray .context-close')
          ?.focus({ preventScroll: true });
      }, 50);
      return;
    }
    if (event.action === 'collapse') {
      this.patch(node.path, (n) => ({ ...n, expanded: false }));
      return;
    }
    if (event.action === 'buy') {
      this.cancelExpansions(node.path);
      if (node.path === 'root') this.rootMethod.emit(null);
      this.patch(node.path, (n) => ({
        ...n,
        recipe: null,
        children: [],
        expanded: false,
        yield: null,
        loading: false,
        acquisition: { kind: 'external', label: 'Obter pronto' },
      }));
      return;
    }
    if (event.action === 'yield') {
      this.patch(node.path, (n) => ({
        ...n,
        yield: event.value === null ? null : Number(event.value),
      }));
      return;
    }
    if (event.action === 'quantity') {
      this.patch(node.path, (n) => ({
        ...n,
        part: { ...n.part, quantity: event.value === null ? null : String(event.value) },
      }));
      return;
    }
    if (event.action === 'choose') {
      const recipe = [
        ...node.options,
        ...(this.context()?.node.path === node.path ? this.context()!.recipes : []),
      ].find((r) => r.key === event.value);
      if (recipe) {
        if (this.ancestors(node.path).includes(node.part.itemId)) {
          this.patch(node.path, (n) => ({
            ...n,
            message: 'Ciclo detectado. Escolha outra origem.',
          }));
          return;
        }
        if (!this.canChoose(node, recipe)) return;
        this.cancelExpansions(node.path);
        this.patch(node.path, (n) => withRecipe({ ...n, loading: false }, recipe));
        if (node.path === 'root') this.rootMethod.emit(recipe);
      }
      return;
    }
    if (node.recipe) {
      this.patch(node.path, (n) => ({ ...n, expanded: true }));
      return;
    }
    if (this.origins().get(node.part.itemId)?.length) {
      this.patch(node.path, (n) => ({ ...n, expanded: true }));
      this.selectedPath.set(node.path);
      this.showContext(this.find(node.path)!);
      return;
    }
    if (node.loading) return;
    if (
      this.ancestors(node.path).includes(node.part.itemId) ||
      node.path.split('/').length > 12 ||
      this.count() >= 470
    ) {
      this.patch(node.path, (n) => ({
        ...n,
        message:
          'Esta expansão repetiria um item ou excederia o limite da árvore. Explore outra ramificação.',
      }));
      return;
    }
    const revision = this.revision;
    const request = Symbol();
    this.expansions.set(node.path, request);
    this.patch(node.path, (n) => ({ ...n, loading: true, message: '' }));
    this.knowledge
      .produces(node.part.itemId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          if (revision !== this.revision || this.expansions.get(node.path) !== request) return;
          this.expansions.delete(node.path);
          if (this.datasetVersion() && response.dataset?.version !== this.datasetVersion()) {
            this.patch(node.path, (n) => ({
              ...n,
              loading: false,
              message: 'O catálogo mudou. Reabra o produto para usar a mesma versão dos dados.',
            }));
            return;
          }
          const families = recipeFamilies(response.recipes);
          const preferred = families[0]?.[0];
          if (
            families.length === 1 &&
            preferred &&
            !this.canChoose(this.find(node.path)!, preferred)
          ) {
            this.patch(node.path, (n) => ({ ...n, loading: false }));
            return;
          }
          this.patch(node.path, (n) => {
            const ready = {
              ...n,
              options: response.recipes,
              loading: false,
              message: response.recipes.length
                ? ''
                : 'Sem receita vinculada. Consulte as fontes conhecidas em Onde obter.',
            };
            return families.length === 1 && preferred ? withRecipe(ready, preferred) : ready;
          });
          this.selectedPath.set(node.path);
          if (this.view() !== 'tree' || !this.find(node.path)?.recipe)
            this.showContext(this.find(node.path)!);
        },
        error: () => {
          if (revision === this.revision && this.expansions.get(node.path) === request) {
            this.expansions.delete(node.path);
            this.patch(node.path, (n) => ({
              ...n,
              loading: false,
              message: 'Não foi possível carregar as receitas. Tente novamente.',
            }));
          }
        },
      });
  }
  private cancelExpansions(path: string) {
    for (const key of this.expansions.keys())
      if (key === path || key.startsWith(path + '/')) this.expansions.delete(key);
    if (this.selectedPath().startsWith(path + '/')) {
      this.contextRevision++;
      this.context.set(null);
      this.detailsOpen.set(false);
      this.contextLoading.set(false);
      this.selectedLocation.set(null);
      this.selectedPath.set(path);
    }
  }
  private canChoose(node: RecipeNode, recipe: CatalogRecipe) {
    if (
      !recipe.outputs.some((part) => part.itemId === node.part.itemId) ||
      node.path.split('/').length > 12 ||
      this.count() - this.count(node) + 1 + recipe.inputs.length > 500
    ) {
      this.patch(node.path, (n) => ({
        ...n,
        message: 'Receita incompatível ou limite da árvore excedido. Explore outra origem.',
      }));
      return false;
    }
    return true;
  }
  private ancestors(path: string) {
    const parts = path.split('/'),
      ids: number[] = [];
    let node = this.root();
    for (let i = 1; i < parts.length; i++)
      if (node) {
        ids.push(node.part.itemId);
        node = node.children[Number(parts[i])];
      }
    return ids;
  }
  private count(node = this.root()): number {
    return node ? 1 + node.children.reduce((n, c) => n + this.count(c), 0) : 0;
  }
  showContext(node: RecipeNode, locationId?: string) {
    if (!this.detailsOpen()) {
      this.detailsReturnFocus =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    this.detailsOpen.set(true);
    this.selectedPath.set(node.path);
    const revision = ++this.contextRevision,
      region = this.region();
    this.contextLoading.set(true);
    this.contextMessage.set('');
    this.context.set(null);
    this.selectedLocation.set(null);
    this.history.set([]);
    this.historyMessage.set('');
    forkJoin({
      item: this.knowledge.item(node.part.itemId).pipe(catchError(() => of(null))),
      origins: this.knowledge.sources(node.part.itemId).pipe(catchError(() => of(null))),
      recipes: this.knowledge.produces(node.part.itemId).pipe(catchError(() => of(null))),
      uses: this.knowledge.uses(node.part.itemId).pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (revision !== this.contextRevision || region !== this.region()) return;
        const versions = [
          result.item?.dataset?.version,
          result.origins?.dataset?.version,
          result.recipes?.dataset?.version,
          result.uses?.dataset?.version,
        ].filter(Boolean);
        if (
          this.datasetVersion() &&
          versions.some((version) => version !== this.datasetVersion())
        ) {
          this.contextLoading.set(false);
          this.contextMessage.set(
            'O catálogo foi atualizado. Reabra este item para consultar receitas e origens da mesma versão.',
          );
          return;
        }
        this.context.set({
          node,
          item: result.item?.item ?? null,
          origins: result.origins ?? { nodes: [], updatedAt: null },
          recipes: result.recipes?.recipes ?? [],
          uses: result.uses?.recipes ?? [],
          incomplete: Object.values(result).some((v) => v === null),
        });
        if (result.item?.item.categories[0])
          this.patch(node.path, (n) => ({ ...n, category: result.item!.item.categories[0].name }));
        if (result.origins) {
          const sources = [...result.origins.nodes, ...(result.origins.spots ?? [])];
          this.origins.update((known) => new Map(known).set(node.part.itemId, sources));
          if (sources.length && !this.find(node.path)?.recipe)
            this.patch(node.path, (n) => ({ ...n, expanded: true }));
          if (locationId)
            this.selectedLocation.set(sources.find((source) => source.id === locationId) ?? null);
        }
        this.contextLoading.set(false);
      });
  }
  openLocation(event: { path: string; source: ItemSources['nodes'][number] }) {
    const node = this.find(event.path);
    if (!node) return;
    this.detailsOpen.set(true);
    if (this.context()?.node.path === node.path) {
      this.selectedPath.set(node.path);
      this.selectedLocation.set(
        this.contextSources().find((source) => source.id === event.source.id) ?? null,
      );
    } else this.showContext(node, event.source.id);
  }
  consultHistory() {
    const node = this.context()?.node;
    if (!node) return;
    const revision = this.contextRevision,
      region = this.region();
    this.historyMessage.set('Consultando histórico…');
    this.market
      .history(node.part.itemId, region)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (revision === this.contextRevision && region === this.region()) {
            this.history.set(result.points);
            this.historyMessage.set(
              result.points.length
                ? 'Observações registradas pelo Black Market.'
                : 'Ainda não há histórico observado deste item.',
            );
          }
        },
        error: () => {
          if (revision === this.contextRevision)
            this.historyMessage.set('Não foi possível consultar o histórico.');
        },
      });
  }
  price(id: number) {
    return this.marketQuotes().get(id)?.price ?? null;
  }
  quote(id: number) {
    return (
      this.store
        .data()
        .quotes.filter((q) => q.region === this.region() && q.itemId === id && !q.subId)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null
    );
  }
  quoteFreshness(id: number): { label: string; stale: boolean } {
    const entry = this.marketCache.getCachedQuoteEntry(id, this.region());
    if (!entry) return { label: 'Cotação pendente', stale: false };

    const now = Date.now();
    const elapsedMs = Math.max(0, now - entry.fetchedAt);
    const minutes = Math.floor(elapsedMs / 60_000);
    const age =
      minutes < 1
        ? 'há menos de 1 min'
        : minutes < 60
          ? `há ${minutes} min`
          : minutes < 1440
            ? `há ${Math.floor(minutes / 60)} h`
            : `há ${Math.floor(minutes / 1440)} dias`;
    const stale = now >= entry.expiresAt;
    return {
      label: stale ? `Cotação antiga · ${age}` : `Atualizada ${age}`,
      stale,
    };
  }
  holdings(id: number) {
    return availableInventory(
      this.store.data().personalPlans,
      this.store
        .data()
        .inventory.filter(
          (r) =>
            r.region === this.region() &&
            r.itemId === id &&
            !this.excludedLocations().includes(stockLocationKey(r)),
        ),
    );
  }
  plain(text: string | null) {
    return (
      text
        ?.replace(/<[^>]*>/g, '')
        .replace(/\{TextBind:USING_CLICK_RMB\}/g, 'Use o botão direito')
        .replace(/\{KeyBind:Manufacture\}/g, 'menu de Processamento')
        .replace(/\{(?:TextBind|KeyBind):[^}]+\}/g, '') ?? ''
    );
  }
  selectedNode() {
    return this.find(this.selectedPath());
  }
  selectedAllocation() {
    return this.plan()?.value?.allocations.find((row) => row.path === this.selectedPath());
  }
  contextSources() {
    const origins = this.context()?.origins;
    return origins ? [...origins.nodes, ...(origins.spots ?? [])] : [];
  }
  chooseSource(source: ItemSources['nodes'][number]) {
    const node = this.selectedNode();
    if (
      !node ||
      node.recipe ||
      !this.contextSources().some((candidate) => candidate.id === source.id)
    )
      return;
    this.patch(node.path, (n) => ({
      ...n,
      acquisition: {
        kind: source.activity === 'grinding' ? 'grinding' : 'workers',
        label:
          source.activity === 'grinding' ? source.name : (source.managerNodeName ?? source.name),
        sourceId: source.id,
      },
    }));
  }
  methods(id: number | undefined) {
    const labels = new Set<string>();
    const visit = (node: RecipeNode) => {
      if (node.part.itemId === id)
        labels.add(
          node.recipe
            ? this.typeLabel(node.recipe.type)
            : node.acquisition?.kind === 'workers'
              ? 'Trabalhadores · ' + node.acquisition.label
              : node.acquisition?.kind === 'grinding'
                ? 'Combate · ' + node.acquisition.label
                : 'Obter fora / consultar fontes',
        );
      for (const child of node.children) visit(child);
    };
    if (this.root()) visit(this.root()!);
    return [...labels].join(' / ');
  }
}
