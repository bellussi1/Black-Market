import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { inject } from '@angular/core';
import type { calculateProduction, ProductionChoice } from '@bdo/calculators';

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
  readonly sourceChoices = input<ReadonlyMap<number, ProductionChoice>>(new Map());
  private readonly plannedSource = computed(() =>
    this.node().path === 'root' ? undefined : this.sourceChoices().get(this.node().part.itemId),
  );
  readonly action = output<BranchAction>();
  readonly typeLabel = recipeTypeLabel;
  readonly methods = computed(() => recipeFamilies(this.node().options).map((family) => family[0]));
  readonly allocation = computed(() => this.allocations().find((a) => a.path === this.node().path));
  readonly stepActionKind = computed<'produce' | 'acquire' | 'choose'>(() => {
    const source = this.plannedSource();
    if (source) return source === 'produce' || source === 'gather' ? 'produce' : 'acquire';
    const node = this.node();
    if (node.recipe) return 'produce';
    if (this.methods().length > 1) return 'choose';
    return 'acquire';
  });
  readonly stepActionLabel = computed(() => {
    const source = this.plannedSource();
    if (source)
      return { buy: 'Comprar', produce: 'Produzir', gather: 'Coletar', stock: 'Usar estoque' }[
        source
      ];
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
