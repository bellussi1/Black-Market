import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { calculateProduction } from '@bdo/calculators';

import { CatalogApiService } from '../../core/catalog-api.service';
import { recipeTypeLabel } from '../game-labels';
import { ItemIcon } from '../item-icon/item-icon';
import { recipeBonusProducts } from './recipe-bonus-products';
import { batchAlternatives, recipeFamilies } from './recipe-equivalents';
import { fixedRecipeYield } from './recipe-fixed-yields';
import { RecipeIngredientAlternatives } from './recipe-ingredient-alternatives';
import type { RecipeNode } from './recipe-tree-model';
export interface BranchAction {
  path: string;
  action:
    | 'expand'
    | 'collapse'
    | 'buy'
    | 'choose'
    | 'yield'
    | 'quantity'
    | 'source'
    | 'info'
    | 'rare-procs';
  value?: string | number | boolean | null;
}
@Component({
  selector: 'app-recipe-branch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ItemIcon, RecipeIngredientAlternatives],
  templateUrl: './recipe-branch.html',
  styleUrl: './recipe-branch.scss',
})
export class RecipeBranch {
  readonly catalog = inject(CatalogApiService);
  readonly node = input.required<RecipeNode>();
  readonly allocations = input<ReturnType<typeof calculateProduction>['allocations']>([]);
  readonly action = output<BranchAction>();
  readonly typeLabel = recipeTypeLabel;
  readonly supportsRareProcs = computed(() => {
    const node = this.node();
    return node.path !== 'root' && !!node.recipe && recipeBonusProducts(node.recipe).length > 0;
  });
  readonly methods = computed(() => recipeFamilies(this.node().options).map((family) => family[0]));
  readonly methodKey = computed(
    () =>
      recipeFamilies(this.node().options).find((family) =>
        family.some((recipe) => recipe.key === this.node().recipe?.key),
      )?.[0]?.key ?? '',
  );
  readonly batches = computed(() =>
    this.node().recipe ? batchAlternatives(this.node().recipe!, this.node().options) : [],
  );
  readonly batchSize = computed(() => {
    const node = this.node(),
      output = node.recipe?.outputs.find((part) => part.itemId === node.part.itemId);
    return output?.quantity && Number(output.quantity) > 0
      ? Number(output.quantity)
      : node.recipe
        ? fixedRecipeYield(node.recipe, node.part.itemId)
        : null;
  });
  readonly substitutionKey = computed(
    () =>
      this.node().substitutions?.find(
        (choice) =>
          choice.part.itemId === this.node().part.itemId &&
          choice.part.quantity === this.node().part.quantity,
      )?.recipeKey ?? '',
  );
  substitute(value: string) {
    const path = this.node().path;
    this.action.emit({ path: path.slice(0, path.lastIndexOf('/')), action: 'choose', value });
  }
  chooseBatch(quantity: number) {
    const batch = this.batches().find((entry) => entry.quantity === Number(quantity));
    if (batch) this.emit('choose', batch.recipe.key);
  }
  readonly allocation = computed(() => this.allocations().find((a) => a.path === this.node().path));
  readonly stepActionKind = computed<'produce' | 'acquire' | 'choose'>(() => {
    const node = this.node();
    if (node.recipe) return 'produce';
    if (this.methods().length > 1) return 'choose';
    return 'acquire';
  });
  readonly stepActionLabel = computed(() => {
    const node = this.node();
    if (node.recipe) return this.typeLabel(node.recipe.type);
    if (this.methods().length > 1) return 'Escolher método';
    if (node.acquisition?.label) return node.acquisition.label;
    return 'Comprar ou estoque';
  });
  emit(action: BranchAction['action'], value?: BranchAction['value']) {
    this.action.emit({ path: this.node().path, action, value });
  }
}
