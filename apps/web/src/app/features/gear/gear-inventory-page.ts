import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { characterSchema, gearSlots } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';

import { WorkspaceStore } from '../../core/workspace-store';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { EquipmentSheet } from '../../shared/equipment-sheet/equipment-sheet';
import { BdoSelect } from '../../ui/native-select/bdo-select';
@Component({
  selector: 'app-gear-inventory-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmInput,
    HlmCard,
    HlmButton,
    BdoSelect,
    FormsModule,
    RouterLink,
    CatalogItemPicker,
    EquipmentSheet,
  ],
  templateUrl: './gear-inventory-page.html',
})
export class GearInventoryPage {
  readonly store = inject(WorkspaceStore);
  readonly embedded = input(false);
  readonly message = signal('');
  readonly slots = gearSlots;
  readonly labels: Record<string, string> = {
    mainhand: 'Arma principal',
    offhand: 'Arma secundária',
    awakening: 'Despertar',
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
  readonly profiles = computed(() =>
    this.store.data().characters.filter((row) => row.region === this.store.data().region),
  );
  readonly profile = this.store.activeCharacter;
  name = '';
  slot: (typeof gearSlots)[number] = 'mainhand';
  item: CatalogItem | null = null;
  level = 0;
  caphras = 0;
  select(id: string) {
    this.store.update((state) => ({ ...state, activeCharacterId: id }));
  }
  create() {
    const name = this.name.trim();
    if (!name) {
      this.message.set('Informe o nome do personagem.');
      return;
    }
    const profile = characterSchema.safeParse({
      id: crypto.randomUUID(),
      name,
      region: this.store.data().region,
    });
    if (!profile.success) {
      this.message.set('Use um nome de até 80 caracteres.');
      return;
    }
    if (
      this.store.update((state) => ({
        ...state,
        characters: [...state.characters, profile.data],
        activeCharacterId: profile.data.id,
      }))
    ) {
      this.name = '';
      this.message.set('Personagem cadastrado. Você já pode associar capturas a ele.');
    }
  }
  save() {
    const profile = this.profile();
    if (!profile || !this.item || !this.slots.includes(this.slot)) {
      this.message.set('Escolha personagem, item e posição.');
      return;
    }
    const part = {
      slot: this.slot,
      itemId: this.item.id,
      name: this.item.name,
      level: this.level,
      caphras: this.caphras,
      levelConfirmed: true,
      caphrasConfirmed: true,
    };
    const parsed = characterSchema.safeParse({
      ...profile,
      gear: [...profile.gear.filter((row) => row.slot !== this.slot), part],
    });
    if (!parsed.success) {
      this.message.set('Confira aprimoramento (0 a 30) e Caphras (0 a 20).');
      return;
    }
    if (
      this.store.update((state) => ({
        ...state,
        characters: state.characters.map((row) => (row.id === profile.id ? parsed.data : row)),
      }))
    ) {
      this.message.set('Equipamento confirmado e salvo.');
      this.item = null;
    }
  }
}
