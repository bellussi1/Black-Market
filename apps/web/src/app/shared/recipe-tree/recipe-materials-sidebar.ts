import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogApiService } from '../../core/catalog-api.service';
import { silver } from '../formatters';
import { ItemIcon } from '../item-icon/item-icon';
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
}
