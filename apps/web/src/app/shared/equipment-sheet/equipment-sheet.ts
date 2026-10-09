import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { type CharacterProfile, gearSlots } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';

import { CatalogApiService } from '../../core/catalog-api.service';
import { ItemIcon } from '../item-icon/item-icon';
const labels: Record<string, string> = {
  mainhand: 'Arma principal',
  offhand: 'Arma secundária',
  awakening: 'Arma de despertar',
  helmet: 'Elmo',
  armor: 'Armadura',
  gloves: 'Luvas',
  shoes: 'Sapatos',
  necklace: 'Colar',
  belt: 'Cinto',
  ring1: 'Anel esquerdo',
  ring2: 'Anel direito',
  earring1: 'Brinco esquerdo',
  earring2: 'Brinco direito',
  tool: 'Ferramenta',
  clothes: 'Traje de profissão',
};
@Component({
  selector: 'app-equipment-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemIcon, RouterLink],
  template: ` <section
    class="equipment-sheet"
    aria-label="Equipamentos do personagem"
    i18n-aria-label
  >
    <header>
      <h2 i18n>Equipamentos</h2>
      @if (showStatistics()) {
        <p i18n>
          Atributos da ficha, incluindo seus bônus. Conjunto de combate e profissão são
          configurações distintas.
        </p>
      } @else {
        <p i18n>
          Posições e itens confirmados por você. Os ícones não determinam aprimoramento ou
          atributos.
        </p>
      }
    </header>
    @if (showStatistics()) {
      <div class="equipment-stats">
        <strong>PA {{ profile().mainAp }}</strong
        ><strong i18n>Despertar {{ profile().awakeAp }}</strong
        ><strong>PD {{ profile().dp }}</strong
        ><span i18n>Índice comparativo {{ score() }}</span>
      </div>
    }
    @if (!showStatistics()) {
      <div class="equipment-board">
        @for (position of slots; track position) {
          @if (gearBySlot().get(position); as part) {
            <a
              class="equipment-slot"
              [attr.data-slot]="position"
              [routerLink]="['/database/items', part.itemId]"
            >
              <span>{{ labels[position] }}</span
              ><app-item-icon
                [url]="catalog.resolveIconUrl(items().get(part.itemId) ?? {})"
                [name]="part.name"
              /><strong>{{ part.name }}</strong>
              <small>{{
                part.levelConfirmed === false
                  ? 'Nível a confirmar'
                  : enhancement(part.slot, part.level)
              }}</small>
            </a>
          } @else {
            <div class="equipment-slot vacant" [attr.data-slot]="position">
              <span>{{ labels[position] }}</span
              ><span aria-hidden="true" class="empty-slot-mark">◇</span
              ><small i18n>Não informado</small>
            </div>
          }
        }
      </div>
    } @else {
      <div class="equipment-slots">
        @for (part of profile().gear; track part.slot) {
          <a
            [routerLink]="['/database/items', part.itemId]"
            class="equipment-slot"
            [attr.data-slot]="part.slot"
            ><span>{{ labels[part.slot] }}</span
            ><app-item-icon
              [url]="catalog.resolveIconUrl(items().get(part.itemId) ?? {})"
              [name]="part.name"
            /><strong>{{ part.name }}</strong
            ><small
              >{{
                part.levelConfirmed === false
                  ? 'Aprimoramento não informado'
                  : enhancement(part.slot, part.level)
              }}
              @if (part.caphras && part.caphrasConfirmed !== false) {
                · Caphras {{ part.caphras }}
              }
            </small></a
          >
        } @empty {
          <p i18n>Nenhum equipamento informado. Complete a ficha do personagem.</p>
        }
      </div>
    }
    @if (profile().crystals.length) {
      <h3 i18n>Predefinição de cristais</h3>
      <div class="equipment-slots">
        @for (crystal of profile().crystals; track $index) {
          <a [routerLink]="['/database/items', crystal.itemId]" class="equipment-slot"
            ><app-item-icon
              [url]="catalog.resolveIconUrl(items().get(crystal.itemId) ?? {})"
              [name]="crystal.name"
            /><strong>{{ crystal.name }}</strong></a
          >
        }
      </div>
    }
    @if (message()) {
      <p role="status">{{ message() }}</p>
    }
  </section>`,
  styleUrl: './equipment-sheet.scss',
})
export class EquipmentSheet {
  readonly slots = gearSlots;
  readonly gearBySlot = computed(
    () => new Map(this.profile().gear.map((part) => [part.slot, part])),
  );
  readonly showStatistics = input(true);
  readonly profile = input.required<CharacterProfile>();
  readonly catalog = inject(CatalogApiService);
  readonly items = signal(new Map<number, CatalogItem>());
  readonly message = signal('');
  readonly labels = labels;
  readonly score = computed(
    () => Math.max(this.profile().mainAp, this.profile().awakeAp) + this.profile().dp,
  );
  constructor() {
    effect((onCleanup) => {
      const ids = [
        ...new Set([...this.profile().gear, ...this.profile().crystals].map((p) => p.itemId)),
      ];
      if (!ids.length) {
        this.items.set(new Map());
        return;
      }
      const sub = this.catalog.getItems({ ids, page: 1, pageSize: 100 }).subscribe({
        next: (r) => this.items.set(new Map(r.items.map((i) => [i.id, i]))),
        error: () =>
          this.message.set(
            'Não foi possível carregar as imagens dos equipamentos. Os nomes continuam disponíveis.',
          ),
      });
      onCleanup(() => sub.unsubscribe());
    });
  }
  enhancement(slot: string, level: number) {
    const accessory = /^(ring|earring|necklace|belt)/.test(slot);
    const n = accessory ? level : level > 15 ? level - 15 : 0;
    return n > 0 && n <= 5
      ? ['', 'PRI (I)', 'DUO (II)', 'TRI (III)', 'TET (IV)', 'PEN (V)'][n]
      : level
        ? `+${level}`
        : 'Base';
  }
}
