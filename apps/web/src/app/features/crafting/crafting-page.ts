import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  availableInventory,
  calculateCrafting,
  calculateProduction,
  type CraftingInput,
  craftingSchema,
  defaultTax,
  type ManualRecipe,
  recipeSchema,
} from '@bdo/calculators';
import type { CatalogItem, CatalogItemDetail, CatalogRecipe } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';
import { forkJoin, type Subscription } from 'rxjs';

import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { MarketCacheService } from '../../core/market-cache.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { evaluate, validationMessage } from '../../shared/calculation-feedback';
import { CalculationProof } from '../../shared/calculation-proof';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { number, silver } from '../../shared/formatters';
import { recipeTypeLabel } from '../../shared/game-labels';
import { PresetBar } from '../../shared/preset-bar';
import {
  batchAlternatives,
  recipeFamilies,
  withVerifiedIngredientSubstitutions,
} from '../../shared/recipe-tree/recipe-equivalents';
import { RecipeTree } from '../../shared/recipe-tree/recipe-tree';
import { TaxOptionsComponent } from '../../shared/tax-options';
import { BdoSelect } from '../../ui/native-select/bdo-select';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crafting-page',
  imports: [
    HlmInput,
    HlmCard,
    HlmButton,
    BdoSelect,
    FormsModule,
    TaxOptionsComponent,
    PresetBar,
    CalculationProof,
    CatalogItemPicker,
    RecipeTree,
    RouterLink,
  ],
  templateUrl: './crafting-page.html',
  styleUrl: './crafting-page.scss',
})
export class CraftingPage implements OnDestroy {
  private readonly analytics = inject(AnalyticsService);
  private readonly catalog = inject(CatalogApiService);
  private readonly marketCache = inject(MarketCacheService);
  private recipeRequest?: Subscription;
  private workshopRequest?: Subscription;
  private lastRegion = '';
  readonly recipeProduct = signal<CatalogItem | null>(null);
  readonly catalogRecipes = signal<CatalogRecipe[]>([]);
  readonly workshopItem = signal<CatalogItemDetail | null>(null);
  readonly workshopRecipes = signal<CatalogRecipe[]>([]);
  readonly workshopRecipe = signal<CatalogRecipe | null>(null);
  readonly workshopDatasetVersion = signal('');
  readonly workshopLoading = signal(false);
  readonly workshopMessage = signal('');
  readonly recipeLoading = signal(false);
  readonly recipeMessage = signal('');
  readonly missingYield = signal(false);
  readonly missingQuantities = signal<number[]>([]);
  readonly recipeTypeLabel = recipeTypeLabel;

  constructor() {
    inject(ActivatedRoute, { optional: true })
      ?.queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const id = Number(params.get('item'));
        if (Number.isInteger(id) && id > 0 && id <= 2147483647) {
          this.recipeRequest?.unsubscribe();
          this.selectWorkshopItemById(id, params.get('recipe'));
        }
      });
    effect(() => {
      const region = this.store.data().region;
      untracked(() => {
        if (this.lastRegion && region !== this.lastRegion) {
          this.recipeRequest?.unsubscribe();
          this.catalogRecipes.set([]);
          this.recipeProduct.set(null);
          this.recipeLoading.set(false);
          this.recipeMessage.set('');
          const selectedItem = this.workshopItem();
          this.workshopRequest?.unsubscribe();
          this.workshopItem.set(null);
          this.workshopRecipes.set([]);
          this.workshopRecipe.set(null);
          this.workshopDatasetVersion.set('');
          this.workshopMessage.set('');
          if (selectedItem) this.selectWorkshopItem(selectedItem);
          this.form.update((form) => ({
            ...form,
            salePrice: '0',
            ingredients: form.ingredients.map((part) => ({ ...part, owned: 0, price: '0' })),
          }));
        }
        this.lastRegion = region;
      });
    });
  }

  chooseRecipeProduct(item: CatalogItem | null): void {
    this.selectWorkshopItem(item);
  }

  private selectWorkshopItemById(itemId: number, recipeKey: string | null): void {
    this.workshopLoading.set(true);
    this.recipeLoading.set(true);
    this.workshopMessage.set('');
    this.catalogRecipes.set([]);
    this.workshopRecipes.set([]);
    this.workshopRecipe.set(null);
    this.workshopItem.set(null);
    this.workshopRequest?.unsubscribe();
    this.workshopRequest = this.catalog.getItem(itemId).subscribe({
      next: (response) => {
        this.recipeProduct.set(response.item);
        this.recipeLoading.set(true);
        this.workshopItem.set(response.item);
        this.loadWorkshopRecipes(response.item, response.dataset.version, recipeKey);
      },
      error: () => {
        this.workshopLoading.set(false);
        this.recipeMessage.set('Não encontramos este item na região selecionada.');
        this.workshopMessage.set('Não encontramos este item na região selecionada.');
      },
    });
  }

  selectWorkshopItem(item: CatalogItem | null): void {
    this.recipeRequest?.unsubscribe();
    this.workshopRequest?.unsubscribe();
    this.recipeProduct.set(item);
    this.catalogRecipes.set([]);
    this.workshopItem.set(null);
    this.workshopRecipes.set([]);
    this.workshopRecipe.set(null);
    this.workshopDatasetVersion.set('');
    this.recipeMessage.set('');
    this.workshopMessage.set('');
    this.recipeLoading.set(Boolean(item));
    this.workshopLoading.set(Boolean(item));
    if (!item) return;

    this.workshopRequest = forkJoin({
      item: this.catalog.getItem(item.id),
      recipes: this.catalog.getItemRecipes(item.id, 'produces'),
    }).subscribe({
      next: ({ item: itemResponse, recipes }) => {
        if (recipes.dataset?.version !== itemResponse.dataset.version) {
          this.recipeLoading.set(false);
          this.workshopLoading.set(false);
          this.workshopMessage.set(
            'O catálogo mudou durante a consulta. Selecione o item novamente para carregar a mesma versão.',
          );
          return;
        }
        this.recipeProduct.set(itemResponse.item);
        this.catalogRecipes.set(recipes.recipes);
        this.workshopItem.set(itemResponse.item);
        this.workshopDatasetVersion.set(itemResponse.dataset.version);
        this.setWorkshopRecipes(recipes.recipes, null);
      },
      error: () => {
        this.recipeLoading.set(false);
        this.workshopLoading.set(false);
        this.recipeMessage.set(
          'Não foi possível carregar as receitas. Tente selecionar o item novamente.',
        );
        this.workshopMessage.set(
          'Não foi possível carregar as receitas. Tente selecionar o item novamente.',
        );
      },
    });
  }

  private loadWorkshopRecipes(
    item: CatalogItemDetail,
    datasetVersion: string,
    recipeKey: string | null,
  ): void {
    this.workshopRequest?.unsubscribe();
    this.workshopRequest = this.catalog.getItemRecipes(item.id, 'produces').subscribe({
      next: (response) => {
        if (response.dataset?.version !== datasetVersion) {
          this.recipeLoading.set(false);
          this.workshopLoading.set(false);
          this.workshopMessage.set(
            'O catálogo mudou durante a consulta. Abra o item novamente para atualizar a oficina.',
          );
          return;
        }
        this.catalogRecipes.set(response.recipes);
        this.recipeProduct.set(item);
        this.workshopDatasetVersion.set(datasetVersion);
        this.workshopItem.set(item);
        this.setWorkshopRecipes(response.recipes, recipeKey);
      },
      error: () => {
        this.recipeLoading.set(false);
        this.workshopLoading.set(false);
        this.workshopMessage.set('Não foi possível carregar as receitas deste item.');
      },
    });
  }

  private setWorkshopRecipes(recipes: CatalogRecipe[], selectedKey: string | null): void {
    const alternatives = withVerifiedIngredientSubstitutions(recipes);
    this.workshopRecipes.set(alternatives);
    const requested = selectedKey
      ? alternatives.find((recipe) => recipe.key === selectedKey)
      : null;
    if (selectedKey && selectedKey !== 'external' && !requested) {
      const item = this.workshopItem();
      const datasetVersion = this.workshopDatasetVersion();
      if (!item || !datasetVersion) {
        this.recipeLoading.set(false);
        this.workshopLoading.set(false);
        this.workshopMessage.set('Não há dados suficientes para abrir esta receita.');
        return;
      }
      this.recipeLoading.set(true);
      this.workshopLoading.set(true);
      this.workshopRequest = this.catalog.getRecipe(selectedKey).subscribe({
        next: (response) => {
          if (
            response.dataset?.version !== datasetVersion ||
            !response.recipe.outputs.some((output) => output.itemId === item.id)
          ) {
            this.recipeLoading.set(false);
            this.workshopLoading.set(false);
            this.workshopMessage.set(
              'A receita solicitada não corresponde a este produto ou a versão atual do catálogo. Escolha uma fórmula disponível.',
            );
            return;
          }
          const extended = withVerifiedIngredientSubstitutions([...alternatives, response.recipe]);
          const selected = extended.find((recipe) => recipe.key === selectedKey) ?? response.recipe;
          this.workshopRecipes.set(extended);
          this.workshopRecipe.set(selected);
          this.recipeLoading.set(false);
          this.workshopLoading.set(false);
          this.useCatalogRecipe(selected);
          this.workshopMessage.set(
            'Receita carregada do catálogo. Confira rendimento, preços, região e idade das cotações.',
          );
        },
        error: () => {
          this.recipeLoading.set(false);
          this.workshopLoading.set(false);
          this.workshopMessage.set(
            'Não foi possível abrir esta receita. Escolha uma fórmula disponível.',
          );
        },
      });
      return;
    }
    const selected =
      selectedKey === 'external' ? null : (requested ?? this.workshopMethods()[0] ?? null);
    this.workshopRecipe.set(selected);
    this.recipeLoading.set(false);
    this.workshopLoading.set(false);
    if (selected) this.useCatalogRecipe(selected);
    this.workshopMessage.set(
      alternatives.length
        ? 'Ajuste lote, maestria e recursos; a oficina compara as formas de aquisição com os preços disponíveis para a região selecionada.'
        : 'Este item não tem uma receita de produção vinculada na versão atual do catálogo. A oficina ainda pode mostrar fontes conhecidas do item.',
    );
  }

  readonly workshopFamilies = computed(() => recipeFamilies(this.workshopRecipes()));
  readonly workshopMethods = computed(() => this.workshopFamilies().map((family) => family[0]!));
  readonly workshopMethodFamily = computed(() => {
    const recipe = this.workshopRecipe();
    return (
      this.workshopFamilies().find((family) =>
        family.some((candidate) => candidate.key === recipe?.key),
      ) ?? (recipe ? [recipe] : [])
    );
  });
  readonly workshopBatchOptions = computed(() => {
    const recipe = this.workshopRecipe();
    return recipe ? batchAlternatives(recipe, this.workshopMethodFamily()) : [];
  });

  workshopMethodLabel(recipe: CatalogRecipe): string {
    const family = this.workshopFamilies().find((group) =>
      group.some((candidate) => candidate.key === recipe.key),
    );
    const representative = family?.[0];
    return (
      (recipe.byproductOfItemId ? 'Subproduto · ' : '') +
      recipeTypeLabel(recipe.type) +
      ' · método ' +
      (this.workshopMethods().findIndex((row) => row.key === representative?.key) + 1) +
      ' · ' +
      recipe.inputs.length +
      ' materiais'
    );
  }

  chooseWorkshopMethod(event: Event): void {
    const key = (event.target as HTMLSelectElement).value;
    this.setWorkshopMethod(this.workshopMethods().find((recipe) => recipe.key === key) ?? null);
  }

  chooseWorkshopBatch(event: Event): void {
    const key = (event.target as HTMLSelectElement).value;
    this.setWorkshopMethod(
      this.workshopBatchOptions().find((batch) => batch.recipe.key === key)?.recipe ?? null,
    );
  }

  setWorkshopMethod(recipe: CatalogRecipe | null): void {
    this.workshopRecipe.set(recipe);
    if (recipe) this.useCatalogRecipe(recipe);
  }

  useCatalogRecipe(recipe: CatalogRecipe): void {
    const product = this.recipeProduct();
    if (!product || !recipe.inputs.length) return;
    const output = recipe.outputs.find((part) => part.itemId === product.id);
    const savedQuote = (id: number) =>
      this.store
        .data()
        .quotes.find(
          (quote) =>
            quote.region === this.store.data().region && quote.itemId === id && !quote.subId,
        );
    this.missingQuantities.set(
      recipe.inputs
        .filter((part) => !part.quantity || Number(part.quantity) <= 0)
        .map((part) => part.itemId),
    );
    this.missingYield.set(!output?.quantity || Number(output.quantity) <= 0);
    this.form.set({
      ...this.form(),
      crafts: 1,
      yield: output?.quantity && Number(output.quantity) > 0 ? Number(output.quantity) : 1,
      salePrice: this.cachedMarketPrice(product.id) ?? savedQuote(product.id)?.price ?? '0',
      ingredients: recipe.inputs.map((part) => ({
        itemId: part.itemId,
        name: part.name,
        quantity: part.quantity && Number(part.quantity) > 0 ? Number(part.quantity) : 1,
        owned: availableInventory(this.store.data().personalPlans, this.store.data().inventory)
          .filter(
            (entry) => entry.region === this.store.data().region && entry.itemId === part.itemId,
          )
          .reduce((sum, entry) => sum + entry.quantity, 0),
        price: this.cachedMarketPrice(part.itemId) ?? savedQuote(part.itemId)?.price ?? '0',
      })),
    });
    this.recipeMessage.set(
      $localize`Materiais preenchidos. O cache local dura 5 min, mas a fonte pode informar dados mais antigos. Confira origem e horário no Mercado; cotações pessoais também podem estar desatualizadas.`,
    );
  }

  private cachedMarketPrice(itemId: number): string | null {
    const entry = this.marketCache.getCachedQuoteEntry(itemId, this.store.data().region);
    return entry && entry.expiresAt > Date.now() ? entry.quote.price : null;
  }

  ngOnDestroy(): void {
    this.recipeRequest?.unsubscribe();
    this.workshopRequest?.unsubscribe();
  }
  selectProduct(item: CatalogItem | null): void {
    this.draft = { ...this.draft, name: item?.name || '', itemId: item?.id };
  }
  selectDraftIngredient(index: number, item: CatalogItem | null): void {
    this.draft.ingredients[index] = {
      ...this.draft.ingredients[index],
      name: item?.name || '',
      itemId: item?.id,
    };
  }
  readonly store = inject(WorkspaceStore);
  readonly tab = signal<'workshop' | 'manual' | 'library'>('workshop');
  readonly form = signal<CraftingInput>({
    ...defaultTax,
    crafts: 1,
    yield: 1,
    salePrice: '0',
    extraCost: '0',
    minutes: 60,
    ingredients: [{ name: '', quantity: 1, owned: 0, price: '0' }],
  });
  readonly result = computed(() =>
    !this.form().ingredients.some((part) => part.name.trim())
      ? { value: null, error: null }
      : this.missingYield() || this.missingQuantities().length
        ? {
            value: null,
            error: $localize`Esta receita tem quantidades ou rendimento ainda não confirmados. Preencha esses campos para calcular.`,
          }
        : evaluate(() => calculateCrafting(this.form())),
  );
  readonly error = signal('');
  readonly target = signal('');
  readonly quantity = signal(1);
  readonly productionInput = computed(() => ({
    recipeId: this.target(),
    quantity: this.quantity(),
    recipes: this.store.data().recipes,
    inventory: availableInventory(
      this.store.data().personalPlans,
      this.store.data().inventory,
    ).filter((r) => r.region === this.store.data().region),
  }));
  readonly plan = computed(() => evaluate(() => calculateProduction(this.productionInput())));
  draft: ManualRecipe = this.newRecipe();
  readonly silver = silver;
  readonly number = number;
  patch(value: Partial<CraftingInput>): void {
    if (value.yield !== undefined) this.missingYield.set(false);
    this.form.update((s) => ({ ...s, ...value }));
  }
  ingredient(index: number, patch: Partial<CraftingInput['ingredients'][number]>): void {
    const id = this.form().ingredients[index]?.itemId;
    if (patch.quantity !== undefined || patch.itemId !== undefined)
      this.missingQuantities.update((ids) => ids.filter((value) => value !== id));
    this.patch({
      ingredients: this.form().ingredients.map((r, k) => (k === index ? { ...r, ...patch } : r)),
    });
  }
  addIngredient(): void {
    this.patch({
      ingredients: [
        ...this.form().ingredients,
        { name: 'Ingrediente', quantity: 1, owned: 0, price: '0' },
      ],
    });
  }
  removeIngredient(index: number): void {
    const id = this.form().ingredients[index]?.itemId;
    this.missingQuantities.update((ids) => ids.filter((value) => value !== id));
    this.patch({ ingredients: this.form().ingredients.filter((_, k) => k !== index) });
  }
  load(raw: unknown): void {
    this.form.set(craftingSchema.parse(raw));
    this.missingYield.set(false);
    this.missingQuantities.set([]);
  }
  fillStock(index: number): void {
    const row = this.form().ingredients[index];
    const name = row.name.trim().toLocaleLowerCase();
    const stock = availableInventory(
      this.store.data().personalPlans,
      this.store.data().inventory,
    ).filter(
      (r) =>
        r.region === this.store.data().region &&
        (row.itemId && r.itemId
          ? row.itemId === r.itemId
          : r.name.trim().toLocaleLowerCase() === name),
    );
    const quote = this.store
      .data()
      .quotes.find(
        (r) =>
          r.region === this.store.data().region &&
          !r.subId &&
          (row.itemId && r.itemId
            ? row.itemId === r.itemId
            : r.name.trim().toLocaleLowerCase() === name),
      );
    const marketPrice = row.itemId ? this.cachedMarketPrice(row.itemId) : null;
    this.ingredient(index, {
      owned: stock.reduce((n, r) => n + r.quantity, 0),
      price: marketPrice ?? quote?.price ?? stock[0]?.price ?? row.price,
    });
  }
  newRecipe(): ManualRecipe {
    return {
      id: crypto.randomUUID(),
      name: '',
      yield: 1,
      ingredients: [{ name: '', quantity: 1, price: '0', recipeId: null }],
    };
  }
  addDraftIngredient(): void {
    this.draft.ingredients.push({ name: '', quantity: 1, price: '0', recipeId: null });
  }
  saveToLibrary() {
    const product = this.recipeProduct();
    if (!product || this.missingYield() || this.missingQuantities().length) {
      this.recipeMessage.set('Confira rendimento e quantidades antes de preparar a receita.');
      return;
    }
    this.draft = {
      id: crypto.randomUUID(),
      itemId: product.id,
      name: product.name,
      yield: this.form().yield,
      ingredients: this.form().ingredients.map((part) => {
        const matches = this.store
          .data()
          .recipes.filter((recipe) => part.itemId && recipe.itemId === part.itemId);
        return {
          itemId: part.itemId,
          name: part.name,
          quantity: part.quantity,
          price: part.price,
          recipeId: matches.length === 1 ? matches[0].id : null,
        };
      }),
    };
    this.tab.set('library');
    this.recipeMessage.set(
      'Receita preparada para revisão. Salve-a na biblioteca para planejar a cadeia de produção.',
    );
  }
  removeDraftIngredient(index: number): void {
    this.draft.ingredients.splice(index, 1);
  }
  linkIngredient(index: number, recipeId: string | null): void {
    this.draft.ingredients[index].recipeId = recipeId || null;
    const recipe = this.store.data().recipes.find((r) => r.id === recipeId);
    if (recipe) this.draft.ingredients[index].name = recipe.name;
  }
  saveRecipe(): void {
    const parsed = recipeSchema.safeParse(this.draft);
    if (!parsed.success) {
      this.error.set(validationMessage(parsed.error));
      return;
    }
    const duplicate = this.store
      .data()
      .recipes.find(
        (r) =>
          r.id !== parsed.data.id &&
          r.name.toLocaleLowerCase() === parsed.data.name.toLocaleLowerCase(),
      );
    if (duplicate) {
      this.error.set(
        'Já há uma receita com esse produto. Edite a existente ou use um nome diferente.',
      );
      return;
    }
    if (
      this.store.update((s) => ({
        ...s,
        recipes: [...s.recipes.filter((r) => r.id !== parsed.data.id), parsed.data],
      }))
    ) {
      this.analytics.capture('journey_completed', {
        feature: 'crafting',
        action: 'save',
        status: 'success',
      });
      this.target.set(parsed.data.id);
      this.draft = this.newRecipe();
      this.error.set('');
    }
  }
  editRecipe(recipe: ManualRecipe): void {
    this.draft = structuredClone(recipe);
    this.error.set('');
  }
  removeRecipe(id: string): void {
    if (this.store.data().recipes.some((r) => r.ingredients.some((ing) => ing.recipeId === id))) {
      this.error.set(
        'Essa receita é usada numa cadeia. Desvincule os ingredientes antes de excluir.',
      );
      return;
    }
    this.store.update((s) => ({ ...s, recipes: s.recipes.filter((r) => r.id !== id) }));
    if (this.target() === id) this.target.set('');
  }
}
