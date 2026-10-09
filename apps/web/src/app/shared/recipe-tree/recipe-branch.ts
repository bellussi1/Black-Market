import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { calculateProduction } from '@bdo/calculators';

import { CatalogApiService } from '../../core/catalog-api.service';
import { recipeTypeLabel } from '../game-labels';
import { ItemIcon } from '../item-icon/item-icon';
import type { RecipeNode } from './recipe-tree-model';
export interface BranchAction {
  path: string;
  action: 'expand' | 'collapse' | 'buy' | 'choose' | 'yield' | 'quantity' | 'source';
  value?: string | number | null;
}
@Component({
  selector: 'app-recipe-branch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ItemIcon],
  templateUrl: './recipe-branch.html',
  styleUrl: './recipe-branch.scss',
})
export class RecipeBranch {
  readonly catalog = inject(CatalogApiService);
  readonly node = input.required<RecipeNode>();
  readonly allocations = input<ReturnType<typeof calculateProduction>['allocations']>([]);
  readonly action = output<BranchAction>();
  readonly typeLabel = recipeTypeLabel;
  readonly allocation = computed(() => this.allocations().find((a) => a.path === this.node().path));
  emit(action: BranchAction['action'], value?: BranchAction['value']) {
    this.action.emit({ path: this.node().path, action, value });
  }
}
