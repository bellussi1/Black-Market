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
  calculateMarket,
  personalPlanSchema,
  type TaxOptions,
} from '@bdo/calculators';
import type {
  CatalogItemDetail,
  CatalogRecipe,
  CatalogRecipePart,
  MarketLookupResponse,
} from '@bdo/shared';
import { catchError, firstValueFrom, forkJoin, of, Subject, takeUntil, timeout } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { MarketApi, type MarketHistoryPoint } from '../../features/market/market-api';
import { date, silver } from '../formatters';
import { recipeTypeLabel } from '../game-labels';
import { ItemIcon } from '../item-icon/item-icon';
import { TaxOptionsComponent } from '../tax-options';
import { type BranchAction, RecipeBranch } from './recipe-branch';
import { recipeFamilies } from './recipe-equivalents';
import { RecipeGraph } from './recipe-graph';
import { type ItemSources, RecipeKnowledge } from './recipe-knowledge';
import { RecipeSessions } from './recipe-session';
import {
  nodeFor,
  patchNode,
  planRecipeTree,
  type RecipeNode,
  stockLocationKey,
  withRecipe,
} from './recipe-tree-model';
@Component({
  selector: 'app-recipe-tree',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, RecipeBranch, RecipeGraph, ItemIcon, TaxOptionsComponent],
  templateUrl: './recipe-tree.html',
  styleUrl: './recipe-tree.scss',
})
export class RecipeTree {
  readonly planMessage = signal('');
  saveShoppingList() {
    const result = this.plan()?.value,
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
      name: this.target().toLocaleString('pt-BR') + ' × ' + root.part.name,
      region: state.region,
      createdAt: new Date().toISOString(),
      sourceItemId: root.part.itemId,
      excludedStockLocations: this.excludedLocations(),
      materials: result.rows
        .filter((row) => row.purchased + row.fromStock > 0)
        .map((row) => ({
          itemId: row.itemId,
          name: row.name,
          quantity: row.purchased + row.fromStock,
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
  private readonly destroyRef = inject(DestroyRef);
  readonly region = computed(() => this.store.data().region);
  readonly root = signal<RecipeNode | null>(null);
  readonly bulkRunning = signal(false);
  readonly bulkMessage = signal('');
  private bulkStop: Subject<void> | null = null;
  private bulkLoadingPath: string | null = null;
  readonly target = signal(100);
  readonly ingredientPreview = computed(() => {
    const root = this.root();
    const target = this.target();
    if (
      !root?.recipe ||
      !root.yield ||
      !Number.isFinite(root.yield) ||
      root.yield <= 0 ||
      !Number.isSafeInteger(target) ||
      target <= 0 ||
      target > 1_000_000
    )
      return null;
    const operations = Math.ceil(target / root.yield);
    return {
      operations,
      produced: operations * root.yield,
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
  readonly marketResult = signal<MarketLookupResponse | null>(null);
  readonly marketLoading = signal(false);
  readonly marketMessage = signal('');
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
  private marketRevision = 0;
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
  readonly plan = computed(() =>
    this.root()
      ? planRecipeTree(this.root()!, this.target(), this.store.data(), {
          excludedLocations: this.excludedLocations(),
          prices: this.livePrices(),
        })
      : null,
  );
  readonly parts = computed(() => {
    const parts = new Map<number, CatalogRecipePart>();
    const visit = (node: RecipeNode) => {
      parts.set(node.part.itemId, node.part);
      node.children.forEach(visit);
    };
    if (this.root()) visit(this.root()!);
    return parts;
  });
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
  readonly buyCost = computed(() => {
    const root = this.root(),
      plan = this.plan()?.value;
    if (!root || !plan) return null;
    const price = this.price(root.part.itemId),
      missing = plan.allocations[0]?.missing ?? this.target();
    return price === null ? null : String(BigInt(price) * BigInt(missing));
  });
  readonly sale = computed(() => {
    const root = this.root(),
      plan = this.plan(),
      price = root ? this.price(root.part.itemId) : null;
    if (!plan?.value || plan.warnings.length || price === null) return null;
    try {
      return calculateMarket({
        ...this.store.data().taxOptions,
        price,
        quantity: this.target(),
        cost: plan.value.cost,
      });
    } catch {
      return null;
    }
  });
  constructor() {
    this.destroyRef.onDestroy(() => this.stopExpansion());
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
      this.revision++;
      this.stopExpansion();
      this.bulkMessage.set('');
      this.expansions.clear();
      this.contextRevision++;
      this.marketRevision++;
      this.context.set(null);
      this.detailsOpen.set(false);
      this.contextMessage.set('');
      this.contextLoading.set(false);
      this.marketResult.set(null);
      this.marketLoading.set(false);
      this.history.set([]);
      this.historyMessage.set('');
      if (identity !== this.selectionIdentity) {
        this.livePrices.set(new Map());
        this.origins.set(new Map());
        this.selectionIdentity = identity;
      }
      this.sessionKey = identity + '/' + (recipe?.key ?? 'external');
      this.selectedPath.set('root');
      this.selectedLocation.set(null);
      const output = item
        ? { itemId: item.id, name: item.name, quantity: null, iconUrl: item.iconUrl }
        : recipe?.outputs[0];
      this.root.set(
        output
          ? recipe
            ? withRecipe({ ...nodeFor(output, 'root'), options: this.recipes() }, recipe)
            : nodeFor(output, 'root')
          : null,
      );
      if (item?.categories[0])
        this.patch('root', (node) => ({ ...node, category: item.categories[0].name }));
      const session = this.sessions.get(this.sessionKey);
      if (session) {
        this.root.set(session.root);
        this.target.set(session.target);
        this.view.set(session.view);
        this.excludedLocations.set(session.excludedLocations);
      }
    });
    effect(() => {
      const root = this.root(),
        target = this.target(),
        view = this.view(),
        excludedLocations = this.excludedLocations();
      if (root && this.sessionKey)
        this.sessions.save(this.sessionKey, { root, target, view, excludedLocations });
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
    this.patch('root', (node) => ({ ...node, yield: value }));
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
    this.marketRevision++;
    this.marketLoading.set(false);
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
      this.marketRevision++;
      this.context.set(null);
      this.detailsOpen.set(false);
      this.contextLoading.set(false);
      this.marketResult.set(null);
      this.marketLoading.set(false);
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
    this.detailsOpen.set(true);
    this.selectedPath.set(node.path);
    const revision = ++this.contextRevision,
      region = this.region();
    this.contextLoading.set(true);
    this.contextMessage.set('');
    this.context.set(null);
    this.selectedLocation.set(null);
    this.marketResult.set(null);
    this.marketLoading.set(false);
    this.marketMessage.set('');
    this.history.set([]);
    this.historyMessage.set('');
    this.marketRevision++;
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
  consultMarket() {
    const node = this.context()?.node;
    if (!node || this.marketLoading()) return;
    const revision = ++this.marketRevision,
      region = this.region(),
      contextRevision = this.contextRevision;
    this.marketLoading.set(true);
    this.marketMessage.set('');
    this.market
      .getItem(String(node.part.itemId), region)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          if (
            revision !== this.marketRevision ||
            region !== this.region() ||
            contextRevision !== this.contextRevision
          )
            return;
          this.marketResult.set(result);
          this.marketLoading.set(false);
          const base = result.items.find((item) => item.subId === 0);
          if (
            base?.price !== null &&
            base?.price !== undefined &&
            result.cacheStatus !== 'stale' &&
            result.region === region
          )
            this.livePrices.update((prices) => new Map(prices).set(node.part.itemId, base.price!));
          if (!base) this.marketMessage.set('Não há cotação da variante base para este item.');
        },
        error: () => {
          if (revision === this.marketRevision) {
            this.marketLoading.set(false);
            this.marketMessage.set('Não foi possível consultar o mercado. Tente novamente.');
          }
        },
      });
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
    return (
      this.livePrices().get(id) ??
      this.quote(id)?.price ??
      this.store
        .data()
        .inventory.find(
          (row) => row.region === this.region() && row.itemId === id && row.price !== '0',
        )?.price ??
      null
    );
  }
  quote(id: number) {
    return (
      this.store
        .data()
        .quotes.filter((q) => q.region === this.region() && q.itemId === id && !q.subId)
        .sort((a, b) => b.observedAt.localeCompare(a.observedAt))[0] ?? null
    );
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
