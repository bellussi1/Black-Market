import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  calculateCrafting,
  calculateProduction,
  craftingSchema,
  recipeSchema,
  defaultTax,
  type CraftingInput,
  type ManualRecipe,
} from '@bdo/calculators';
import {
  WorkspaceStore,
  evaluate,
  silver,
  number,
  validationMessage,
} from '../../core/workspace-store';
import { TaxOptionsComponent } from '../../shared/tax-options';
import { PresetBar } from '../../shared/preset-bar';
import { CalculationProof } from '../../shared/calculation-proof';
@Component({
  selector: 'app-crafting-page',
  imports: [FormsModule, TaxOptionsComponent, PresetBar, CalculationProof],
  templateUrl: './crafting-page.html',
})
export class CraftingPage {
  readonly store = inject(WorkspaceStore);
  readonly tab = signal('profit');
  readonly form = signal<CraftingInput>({
    ...defaultTax,
    crafts: 1,
    yield: 1,
    salePrice: '0',
    extraCost: '0',
    minutes: 60,
    ingredients: [{ name: 'Ingrediente', quantity: 1, owned: 0, price: '0' }],
  });
  readonly result = computed(() => evaluate(() => calculateCrafting(this.form())));
  readonly error = signal('');
  readonly target = signal('');
  readonly quantity = signal(1);
  readonly productionInput = computed(() => ({
    recipeId: this.target(),
    quantity: this.quantity(),
    recipes: this.store.data().recipes,
    inventory: this.store.data().inventory.filter((r) => r.region === this.store.data().region),
  }));
  readonly plan = computed(() => evaluate(() => calculateProduction(this.productionInput())));
  draft: ManualRecipe = this.newRecipe();
  readonly silver = silver;
  readonly number = number;
  patch(value: Partial<CraftingInput>): void {
    this.form.update((s) => ({ ...s, ...value }));
  }
  ingredient(index: number, patch: Partial<CraftingInput['ingredients'][number]>): void {
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
    this.patch({ ingredients: this.form().ingredients.filter((_, k) => k !== index) });
  }
  load(raw: unknown): void {
    this.form.set(craftingSchema.parse(raw));
  }
  fillStock(index: number): void {
    const row = this.form().ingredients[index];
    const name = row.name.trim().toLocaleLowerCase();
    const stock = this.store
      .data()
      .inventory.filter(
        (r) => r.region === this.store.data().region && r.name.trim().toLocaleLowerCase() === name,
      );
    const quote = this.store
      .data()
      .quotes.find(
        (r) => r.region === this.store.data().region && r.name.trim().toLocaleLowerCase() === name,
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
