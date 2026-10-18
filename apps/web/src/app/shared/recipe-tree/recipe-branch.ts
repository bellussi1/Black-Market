import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { inject } from '@angular/core';
import type { calculateProduction } from '@bdo/calculators';

import { CatalogApiService } from '../../core/catalog-api.service';
import { recipeTypeLabel } from '../game-labels';
import { ItemIcon } from '../item-icon/item-icon';
import { recipeFamilies } from './recipe-equivalents';
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
  imports: [ItemIcon],
  templateUrl: './recipe-branch.html',
  styleUrl: './recipe-branch.scss',
})
export class RecipeBranch {
  readonly catalog = inject(CatalogApiService);
  readonly node = input.required<RecipeNode>();
  readonly allocations = input<ReturnType<typeof calculateProduction>['allocations']>([]);
  readonly action = output<BranchAction>();
  readonly typeLabel = recipeTypeLabel;
  readonly methods = computed(() => recipeFamilies(this.node().options).map((family) => family[0]));
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
