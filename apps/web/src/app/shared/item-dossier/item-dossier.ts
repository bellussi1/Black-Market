import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CatalogItem } from '@bdo/shared';

import { number } from '../formatters';
import { ItemIcon } from '../item-icon/item-icon';
import { itemDescriptionLines } from './item-description';

@Component({
  selector: 'app-item-dossier',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ItemIcon],
  templateUrl: './item-dossier.html',
  styleUrl: './item-dossier.scss',
})
export class ItemDossier {
  readonly item = input<CatalogItem | null>(null);
  readonly loading = input(false);
  readonly fallbackName = input('Item não informado');
  readonly itemId = input<number | null>(null);
  readonly iconUrl = input<string | null>(null);
  readonly enhancement = input('');
  readonly showMarketLink = input(false);
  readonly lines = computed(() => itemDescriptionLines(this.item()?.description));
  readonly weight = computed(() => {
    const value = this.item()?.weight;
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
      ? number(Number(value), 4)
      : null;
  });
}
