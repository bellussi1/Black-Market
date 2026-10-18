import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { characterSchema, gearSlots, lifeSkills } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';

import { IdentityService } from '../../core/identity.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import {
  equipmentLabels,
  type EquipmentPosition,
} from '../../shared/equipment-sheet/equipment-positions';
import { EquipmentSheet } from '../../shared/equipment-sheet/equipment-sheet';
import { lifeSkillLabels } from '../../shared/game-labels';
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
  styleUrl: './gear-inventory-page.scss',
})
export class GearInventoryPage {
  readonly store = inject(WorkspaceStore);
  readonly identity = inject(IdentityService);
  readonly embedded = input(false);
  readonly message = signal('');
  readonly slots = gearSlots;
  readonly labels = equipmentLabels;
  readonly skills = lifeSkills;
  readonly skillLabels = lifeSkillLabels;
  readonly selectedPosition = signal<EquipmentPosition>('clothes');
  readonly isArtifact = computed(() =>
    ['artifact1', 'artifact2'].includes(this.selectedPosition()),
  );
  focusSkill: (typeof lifeSkills)[number] = 'gathering';
  private previousProfileId = '';
  readonly profiles = computed(() =>
    this.store.data().characters.filter((row) => row.region === this.store.data().region),
  );
  readonly profile = this.store.activeCharacter;
  name = '';
  slot: (typeof gearSlots)[number] = 'clothes';
  item: CatalogItem | null = null;
  level = 0;
  caphras = 0;
  constructor() {
    effect(() => {
      const id = this.profile()?.id ?? '';
      if (id === this.previousProfileId) return;
      this.previousProfileId = id;
      this.item = null;
      this.slot = 'clothes';
      this.selectedPosition.set('clothes');
      this.level = 0;
      this.caphras = 0;
    });
  }
  chooseSlot(position: EquipmentPosition): void {
    this.selectedPosition.set(position);
    this.message.set('');
    this.item = null;
    if (position === 'artifact1' || position === 'artifact2') return;
    this.slot = position;
    const part = this.profile()?.gear.find((row) => row.slot === position);
    this.level = part?.levelConfirmed === false ? 0 : (part?.level ?? 0);
    this.caphras = part?.caphrasConfirmed === false ? 0 : (part?.caphras ?? 0);
    if (part)
      this.item = {
        id: part.itemId,
        name: part.name,
        description: null,
        grade: null,
        weight: null,
        category: null,
        categories: [],
        icon: null,
      };
  }
  canEnhance(): boolean {
    return !['alchemyStone', 'tome'].includes(this.slot);
  }
  isAccessorySlot(): boolean {
    return /^(ring|earring|necklace|belt)/.test(this.slot);
  }
  enhancementPresets(): { label: string; value: number }[] {
    if (this.isAccessorySlot()) {
      return [
        { label: 'Base', value: 0 },
        { label: 'I (PRI)', value: 1 },
        { label: 'II (DUO)', value: 2 },
        { label: 'III (TRI)', value: 3 },
        { label: 'IV (TET)', value: 4 },
        { label: 'V (PEN)', value: 5 },
        { label: 'VI (HEX)', value: 6 },
        { label: 'VII (SEP)', value: 7 },
        { label: 'VIII (OCT)', value: 8 },
        { label: 'IX (NON)', value: 9 },
        { label: 'X (DEC)', value: 10 },
      ];
    }
    return [
      { label: 'Base', value: 0 },
      { label: '+15', value: 15 },
      { label: 'I (PRI)', value: 16 },
      { label: 'II (DUO)', value: 17 },
      { label: 'III (TRI)', value: 18 },
      { label: 'IV (TET)', value: 19 },
      { label: 'V (PEN)', value: 20 },
      { label: 'VI (HEX)', value: 21 },
      { label: 'VII (SEP)', value: 22 },
      { label: 'VIII (OCT)', value: 23 },
      { label: 'IX (NON)', value: 24 },
      { label: 'X (DEC)', value: 25 },
    ];
  }
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
    if (!profile || !this.item || !this.slots.includes(this.slot) || this.isArtifact()) {
      this.message.set('Escolha personagem, item e posição.');
      return;
    }
    const part = {
      slot: this.slot,
      itemId: this.item.id,
      name: this.item.name,
      level: this.canEnhance() ? this.level : 0,
      caphras: this.canEnhance() ? this.caphras : 0,
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
