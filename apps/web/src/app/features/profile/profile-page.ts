import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { type CharacterProfile, characterSchema, gearSlots, lifeSkills } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';

import { AnalyticsService } from '../../core/analytics.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { validationMessage } from '../../shared/calculation-feedback';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { EquipmentSheet } from '../../shared/equipment-sheet/equipment-sheet';
import { silver } from '../../shared/formatters';
import { BdoSelect } from '../../ui/native-select/bdo-select';
@Component({
  selector: 'app-profile-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmInput,
    HlmCard,
    HlmButton,
    BdoSelect,
    FormsModule,
    CatalogItemPicker,
    RouterLink,
    EquipmentSheet,
  ],
  templateUrl: './profile-page.html',
})
export class ProfilePage {
  private readonly analytics = inject(AnalyticsService);
  constructor() {
    effect(() => {
      const region = this.store.data().region;
      untracked(() => {
        const active = this.store.activeCharacter();
        if (active && this.selected !== active.id) {
          this.selected = active.id;
          this.load();
          return;
        }
        if (this.draft.region !== region) this.create();
      });
    });
  }
  readonly store = inject(WorkspaceStore);
  readonly message = signal('');
  readonly profiles = computed(() =>
    this.store.data().characters.filter((row) => row.region === this.store.data().region),
  );
  readonly skills = lifeSkills;
  readonly slots = gearSlots;
  readonly silver = silver;
  slot: (typeof gearSlots)[number] = 'mainhand';
  draft: CharacterProfile = this.empty();
  selected = '';
  readonly skillLabels: Readonly<Record<string, string>> = {
    gathering: 'Coleta',
    cooking: 'Culinária',
    alchemy: 'Alquimia',
    processing: 'Processamento',
    fishing: 'Pesca',
    hunting: 'Caça',
    training: 'Treino',
    trading: 'Comércio',
    farming: 'Cultivo',
    sailing: 'Navegação',
    barter: 'Permuta',
  };
  readonly slotLabels: Readonly<Record<string, string>> = {
    mainhand: 'Arma principal',
    offhand: 'Arma secundária',
    awakening: 'Arma de despertar',
    helmet: 'Elmo',
    armor: 'Armadura',
    gloves: 'Luvas',
    shoes: 'Sapatos',
    necklace: 'Colar',
    belt: 'Cinto',
    ring1: 'Anel 1',
    ring2: 'Anel 2',
    earring1: 'Brinco 1',
    earring2: 'Brinco 2',
    tool: 'Ferramenta',
    clothes: 'Traje de profissão',
    alchemyStone: 'Pedra alquímica',
    tome: 'Tomo do aventureiro',
  };
  empty() {
    return characterSchema.parse({
      id: crypto.randomUUID(),
      name: 'Meu personagem',
      region: this.store.data().region,
    });
  }
  save() {
    const parsed = characterSchema.safeParse({ ...this.draft, region: this.store.data().region });
    if (!parsed.success) {
      this.message.set(validationMessage(parsed.error));
      return;
    }
    if (
      this.store.update((state) => ({
        ...state,
        characters: [...state.characters.filter((row) => row.id !== parsed.data.id), parsed.data],
        activeCharacterId: parsed.data.id,
      }))
    ) {
      this.analytics.capture('journey_completed', {
        feature: 'profile',
        action: 'save',
        status: 'success',
      });
      this.selected = parsed.data.id;
      this.message.set('Personagem salvo. Suas recomendações podem usar estes dados.');
    }
  }
  load() {
    const profile = this.profiles().find((row) => row.id === this.selected);
    if (profile) this.draft = structuredClone(profile);
    if (profile && this.store.data().activeCharacterId !== profile.id)
      this.store.update((s) => ({ ...s, activeCharacterId: profile.id }));
    this.message.set('');
  }
  create() {
    this.draft = this.empty();
    this.selected = '';
    this.message.set('');
  }
  remove() {
    if (!this.selected) return;
    this.store.update((state) => ({
      ...state,
      characters: state.characters.filter((row) => row.id !== this.selected),
    }));
    this.create();
  }
  equip(item: CatalogItem | null) {
    if (!item) return;
    this.draft.gear = [
      ...this.draft.gear.filter((row) => row.slot !== this.slot),
      { slot: this.slot, itemId: item.id, name: item.name, level: 0, caphras: 0 },
    ];
  }
  removeGear(slot: string) {
    this.draft.gear = this.draft.gear.filter((row) => row.slot !== slot);
  }
}
