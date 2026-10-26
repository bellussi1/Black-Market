import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ProductionQuantity } from '@bdo/calculators';

import { CatalogApiService } from '../../core/catalog-api.service';
import { silver } from '../formatters';
import { ItemIcon } from '../item-icon/item-icon';
import type { RecipePlanNode, RecipePlanProduct } from './recipe-plan-hierarchy';
import type { RecipeTree } from './recipe-tree';

type MaterialRow = ReturnType<RecipeTree['materialDecisions']>[number];
type ReturnRow = ReturnType<RecipeTree['returnedProductRows']>[number];

@Component({
  selector: 'app-recipe-materials-sidebar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemIcon, NgTemplateOutlet, RouterLink],
  templateUrl: './recipe-materials-sidebar.html',
  styleUrl: './recipe-materials-sidebar.scss',
})
export class RecipeMaterialsSidebar {
  readonly materials = input<readonly MaterialRow[]>([]);
  readonly product = input<RecipePlanProduct | null>(null);
  readonly hierarchy = input<readonly RecipePlanNode<MaterialRow>[]>([]);
  readonly expandedPaths = signal<ReadonlySet<string>>(new Set());
  private readonly document = inject(DOCUMENT);
  readonly materialsById = computed(
    () => new Map<number, MaterialRow>(this.materials().map((row) => [row.itemId, row])),
  );

  togglePath(path: string): void {
    this.expandedPaths.update((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });
  }

  showCanonicalMaterial(itemId: number, path: string): void {
    const pathParts = path.split('/');
    this.expandedPaths.update((current) => {
      const next = new Set(current);
      for (let length = 2; length < pathParts.length; length++)
        next.add(pathParts.slice(0, length).join('/'));
      return next;
    });
    this.selectMaterial.emit(itemId);

    const view = this.document.defaultView;
    const scrollToRow = () =>
      this.document
        .querySelector<HTMLElement>(`.sidebar-material-row[data-item-id="${itemId}"]`)
        ?.scrollIntoView?.({ block: 'nearest' });
    if (view?.requestAnimationFrame) view.requestAnimationFrame(scrollToRow);
    else queueMicrotask(scrollToRow);
  }

  readonly returns = input<readonly ReturnRow[]>([]);
  readonly selectedItemId = input<number | null>(null);
  readonly expanded = input(false);
  readonly authenticated = input(false);
  readonly planMessage = input('');

  readonly toggleSource = output<number>();
  readonly selectMaterial = output<number>();
  readonly returnSaleChanged = output<{ itemId: number; sell: boolean }>();
  readonly toggleReturns = output<void>();
  readonly saveShoppingList = output<void>();

  readonly visibleReturns = computed(() =>
    this.expanded() ? this.returns() : this.returns().slice(0, 2),
  );
  readonly catalog = inject(CatalogApiService);
  readonly silver = silver;

  quantityLabel(value: number): string {
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  productionQuantityLabel(value: ProductionQuantity): string {
    if (value === null) return 'a confirmar';
    const label = (quantity: number) =>
      quantity.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
    if (typeof value === 'number') return label(value);
    return value.min === value.max ? label(value.min) : `${label(value.min)}–${label(value.max)}`;
  }
}
