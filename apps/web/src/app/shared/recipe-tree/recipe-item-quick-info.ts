import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { CatalogItemDetail } from '@bdo/shared';

import { number } from '../formatters';
import { itemDescriptionLines } from '../item-dossier/item-description';
import { ItemIcon } from '../item-icon/item-icon';

export interface RecipeItemQuickInfoState {
  path: string;
  item: CatalogItemDetail | null;
  loading: boolean;
}

@Component({
  selector: 'app-recipe-item-quick-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemIcon],
  templateUrl: './recipe-item-quick-info.html',
  styleUrl: './recipe-item-quick-info.scss',
})
export class RecipeItemQuickInfo {
  scrollDetails(event: WheelEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const panel = event.currentTarget as HTMLElement;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? panel.clientHeight : 1;
    panel.scrollTop += event.deltaY * unit;
    panel.scrollLeft += event.deltaX * unit;
  }
  readonly item = input<CatalogItemDetail | null>(null);
  readonly fallbackName = input('Item não informado');
  readonly fallbackCategory = input('Item');
  readonly iconUrl = input<string | null>(null);
  readonly loading = input(false);
  readonly dismiss = output<void>();
  readonly expanded = signal(false);
  readonly lines = computed(() => itemDescriptionLines(this.item()?.description));
  readonly visibleLines = computed(() =>
    this.expanded() ? this.lines() : this.lines().slice(0, 3),
  );
  readonly hasMore = computed(() => this.lines().length > 3);
  readonly category = computed(
    () =>
      this.item()?.categories[0]?.name ||
      this.item()?.category ||
      this.fallbackCategory() ||
      'Item',
  );
  readonly weight = computed(() => {
    const value = this.item()?.weight;
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
      ? number(Number(value), 4)
      : null;
  });
}
