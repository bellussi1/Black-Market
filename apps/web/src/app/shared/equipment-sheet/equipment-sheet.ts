import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CharacterProfile } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideBookOpen,
  lucideCircle,
  lucideCrown,
  lucideDroplet,
  lucideFootprints,
  lucideGem,
  lucideHand,
  lucidePickaxe,
  lucideShield,
  lucideShirt,
  lucideSword,
} from '@ng-icons/lucide';

import { CatalogApiService } from '../../core/catalog-api.service';
import { ItemDossier } from '../item-dossier/item-dossier';
import { ItemIcon } from '../item-icon/item-icon';
import { equipmentLabels, equipmentOrbit, type EquipmentPosition } from './equipment-positions';

type SheetPart = {
  slot: string;
  itemId: number;
  name: string;
  level?: number;
  levelConfirmed?: boolean;
  caphras?: number;
  caphrasConfirmed?: boolean;
};
@Component({
  selector: 'app-equipment-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemIcon, ItemDossier, RouterLink, NgIcon],
  providers: [
    provideIcons({
      lucideBookOpen,
      lucideCircle,
      lucideCrown,
      lucideDroplet,
      lucideFootprints,
      lucideGem,
      lucideHand,
      lucidePickaxe,
      lucideShield,
      lucideShirt,
      lucideSword,
    }),
  ],
  templateUrl: './equipment-sheet.html',
  styleUrl: './equipment-sheet.scss',
})
export class EquipmentSheet {
  readonly profile = input.required<CharacterProfile>();
  readonly showStatistics = input(true);
  readonly activeSlot = input<EquipmentPosition | null>(null);
  readonly slotSelected = output<EquipmentPosition>();
  private readonly localSelection = signal<EquipmentPosition>('clothes');
  readonly selection = computed(() => this.activeSlot() ?? this.localSelection());
  readonly catalog = inject(CatalogApiService);
  readonly items = signal(new Map<number, CatalogItem>());
  readonly message = signal('');
  readonly loading = signal(false);
  private readonly catalogAttempt = signal(0);
  retryCatalog(): void {
    this.catalogAttempt.update((attempt) => attempt + 1);
  }
  readonly labels = equipmentLabels;
  readonly orbit = equipmentOrbit;
  readonly professionPositions = [
    { slot: 'tool' as const, icon: 'lucidePickaxe' },
    { slot: 'clothes' as const, icon: 'lucideShirt' },
  ];
  readonly parts = computed(() => {
    const rows = new Map<EquipmentPosition, SheetPart>(
      this.profile().gear.map((part) => [part.slot, part]),
    );
    this.profile().artifacts?.forEach((part, index) =>
      rows.set(index === 0 ? 'artifact1' : 'artifact2', {
        ...part,
        slot: index === 0 ? 'artifact1' : 'artifact2',
      }),
    );
    return rows;
  });
  readonly selectedPart = computed(() => this.parts().get(this.selection()) ?? null);
  constructor() {
    effect((onCleanup) => {
      this.catalogAttempt();
      const ids = [
        ...new Set(
          [
            ...this.profile().gear,
            ...(this.profile().artifacts ?? []),
            ...this.profile().crystals,
          ].map((part) => part.itemId),
        ),
      ];
      this.items.set(new Map());
      this.message.set('');
      this.loading.set(false);
      if (!ids.length) return;
      this.loading.set(true);
      const sub = this.catalog.getItems({ ids, page: 1, pageSize: 100 }).subscribe({
        next: (response) => {
          this.items.set(new Map(response.items.map((item) => [item.id, item])));
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.message.set(
            'Não foi possível carregar os dados do catálogo. Os nomes informados continuam disponíveis.',
          );
        },
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
  selectSlot(position: EquipmentPosition): void {
    this.localSelection.set(position);
    this.slotSelected.emit(position);
  }
  slotLabel(position: EquipmentPosition): string {
    const part = this.parts().get(position);
    return (
      this.labels[position] +
      ' · ' +
      (part
        ? part.name + (this.levelText(part) ? ' · ' + this.levelText(part) : '')
        : 'Não informado')
    );
  }
  levelText(part: SheetPart): string {
    if (part.level === undefined || ['alchemyStone', 'tome'].includes(part.slot)) return '';
    const level =
      part.levelConfirmed === false ? 'Nível a confirmar' : this.enhancement(part.slot, part.level);
    return (
      level +
      (part.caphras
        ? part.caphrasConfirmed === false
          ? ' · Caphras a confirmar'
          : ' · Caphras ' + part.caphras
        : '')
    );
  }
  levelBadge(part: SheetPart): string {
    if (part.level === undefined || ['alchemyStone', 'tome'].includes(part.slot)) return '';
    if (part.levelConfirmed === false) return '?';
    const rank = /^(ring|earring|necklace|belt)/.test(part.slot)
      ? part.level
      : part.level > 15
        ? part.level - 15
        : 0;
    return rank > 0 && rank <= 10
      ? ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][rank]
      : part.level
        ? '+' + part.level
        : '';
  }
  enhancement(slot: string, level: number): string {
    const rank = /^(ring|earring|necklace|belt)/.test(slot) ? level : level > 15 ? level - 15 : 0;
    return rank > 0 && rank <= 10
      ? [
          '',
          'PRI (I)',
          'DUO (II)',
          'TRI (III)',
          'TET (IV)',
          'PEN (V)',
          'VI',
          'VII',
          'VIII',
          'IX',
          'X',
        ][rank]
      : level
        ? '+' + level
        : 'Base';
  }
}
