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
import { ActivatedRoute } from '@angular/router';
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
import type { CatalogItem, CatalogRecipe } from '@bdo/shared';
import type { Subscription } from 'rxjs';

import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { evaluate, validationMessage } from '../../shared/calculation-feedback';
import { CalculationProof } from '../../shared/calculation-proof';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { number, silver } from '../../shared/formatters';
import { recipeTypeLabel } from '../../shared/game-labels';
import { PresetBar } from '../../shared/preset-bar';
import { TaxOptionsComponent } from '../../shared/tax-options';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-crafting-page',
  imports: [FormsModule, TaxOptionsComponent, PresetBar, CalculationProof, CatalogItemPicker],
  templateUrl: './crafting-page.html',
})
export class CraftingPage implements OnDestroy {
  private readonly analytics = inject(AnalyticsService);
  private readonly catalog = inject(CatalogApiService);
  private recipeRequest?: Subscription;
  private lastRegion = '';
  readonly recipeProduct = signal<CatalogItem | null>(null);
  readonly catalogRecipes = signal<CatalogRecipe[]>([]);
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
          this.recipeRequest = this.catalog.getItem(id).subscribe({
            next: (response) => {
              this.chooseRecipeProduct(response.item);
              const key = params.get('recipe');
              if (key) {
                this.recipeRequest?.unsubscribe();
                this.recipeRequest = this.catalog.getRecipe(key).subscribe({
                  next: (result) => this.useCatalogRecipe(result.recipe),
                  error: () =>
                    this.recipeMessage.set(
                      'Não foi possível abrir esta receita. Escolha uma receita disponível.',
                    ),
                });
              }
            },
            error: () => this.recipeMessage.set('Não encontramos este item na região selecionada.'),
          });
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
    this.recipeRequest?.unsubscribe();
    this.recipeProduct.set(item);
    this.catalogRecipes.set([]);
    this.recipeMessage.set('');
    this.recipeLoading.set(Boolean(item));
    if (!item) return;
    this.recipeRequest = this.catalog.getItemRecipes(item.id, 'produces').subscribe({
      next: (response) => {
        this.catalogRecipes.set(response.recipes);
        this.recipeLoading.set(false);
        if (!response.recipes.length)
          this.recipeMessage.set(
            $localize`Ainda não temos uma receita de produção para este item. Você pode montar seu cenário abaixo.`,
          );
        else if (response.recipes.length === 1) this.useCatalogRecipe(response.recipes[0]);
      },
      error: () => {
        this.recipeLoading.set(false);
        this.recipeMessage.set(
          $localize`Não foi possível carregar as receitas. Tente selecionar o item novamente.`,
        );
      },
    });
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
      salePrice: savedQuote(product.id)?.price ?? '0',
      ingredients: recipe.inputs.map((part) => ({
        itemId: part.itemId,
        name: part.name,
        quantity: part.quantity && Number(part.quantity) > 0 ? Number(part.quantity) : 1,
        owned: availableInventory(this.store.data().personalPlans, this.store.data().inventory)
          .filter(
            (entry) => entry.region === this.store.data().region && entry.itemId === part.itemId,
          )
          .reduce((sum, entry) => sum + entry.quantity, 0),
        price: savedQuote(part.itemId)?.price ?? '0',
      })),
    });
    this.recipeMessage.set(
      $localize`Materiais preenchidos. Confira rendimento, tempo e preços antes de usar o resultado. Cotações salvas podem estar desatualizadas.`,
    );
  }

  ngOnDestroy(): void {
    this.recipeRequest?.unsubscribe();
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
  readonly tab = signal('profit');
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
    this.ingredient(index, {
      owned: stock.reduce((n, r) => n + r.quantity, 0),
      price: quote?.price ?? stock[0]?.price ?? row.price,
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
    this.tab.set('chain');
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
