import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  type CharacterProfile,
  characterSchema,
  familyProfileSchema,
  lifeSkills,
  type TaxOptions,
} from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';

import { WorkspaceStore } from '../../core/workspace-store';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { TaxOptionsComponent } from '../../shared/tax-options';

@Component({
  selector: 'app-player-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, CatalogItemPicker, TaxOptionsComponent],
  templateUrl: './player-page.html',
})
export class PlayerPage {
  readonly store = inject(WorkspaceStore);
  readonly tab = signal<'character' | 'family'>('character');
  readonly message = signal('');
  readonly profiles = computed(() =>
    this.store.data().characters.filter((row) => row.region === this.store.data().region),
  );
  readonly current = this.store.activeCharacter;
  readonly family = computed(() =>
    familyProfileSchema.parse(this.store.data().families?.[this.store.data().region] ?? {}),
  );
  readonly skills = lifeSkills;
  readonly skillLabels: Record<string, string> = {
    gathering: 'Coleta',
    cooking: 'Culinária',
    alchemy: 'Alquimia',
    processing: 'Processamento',
    fishing: 'Pesca',
    hunting: 'Caça',
    training: 'Treinamento',
    trading: 'Comércio',
    farming: 'Cultivo',
    sailing: 'Navegação',
    barter: 'Permuta',
  };
  readonly tiers = ['Iniciante', 'Aprendiz', 'Hábil', 'Profissional', 'Artesão', 'Mestre', 'Guru'];
  name = '';
  presetName = '';
  skill: (typeof lifeSkills)[number] = 'cooking';
  tier: 'Iniciante' | 'Aprendiz' | 'Hábil' | 'Profissional' | 'Artesão' | 'Mestre' | 'Guru' =
    'Iniciante';
  skillLevel = 1;
  skillXp = 0;
  pet = { name: '', tier: 1, level: 1, skills: '' };
  mount = { name: '', kind: 'Cavalo', level: 1, notes: '' };
  petId = '';
  mountId = '';
  readonly numericFields = [
    { key: 'level', label: 'Nível', max: 100 },
    { key: 'weightLimit', label: 'Peso máximo (LT)', max: 10000 },
    { key: 'inventoryCapacity', label: 'Espaços de inventário', max: 300 },
    { key: 'energy', label: 'Energia atual', max: 2000 },
    { key: 'mainAp', label: 'PA principal', max: 5000 },
    { key: 'awakeAp', label: 'PA de despertar', max: 5000 },
    { key: 'dp', label: 'PD', max: 5000 },
  ] as const;
  create() {
    const parsed = characterSchema.safeParse({
      id: crypto.randomUUID(),
      name: this.name,
      region: this.store.data().region,
    });
    if (!parsed.success) {
      this.message.set('Informe um nome de 1 a 80 caracteres.');
      return;
    }
    if (
      this.store.update((state) => ({
        ...state,
        characters: [...state.characters, parsed.data],
        activeCharacterId: parsed.data.id,
      }))
    ) {
      this.name = '';
      this.message.set('Personagem criado. Os outros dados são opcionais.');
    }
  }
  select(id: string) {
    this.store.update((state) => ({ ...state, activeCharacterId: id }));
  }
  saveCharacter(patch: Partial<CharacterProfile>) {
    const current = this.current();
    if (!current) return;
    const parsed = characterSchema.safeParse({ ...current, ...patch });
    if (!parsed.success) {
      this.message.set('Valor inválido. Confira o campo; seus dados anteriores foram mantidos.');
      return;
    }
    if (
      this.store.update((state) => ({
        ...state,
        characters: state.characters.map((row) => (row.id === current.id ? parsed.data : row)),
      }))
    )
      this.message.set('Alteração salva.');
  }
  saveNumber(key: (typeof this.numericFields)[number]['key'], value: string) {
    if (value.trim()) this.saveCharacter({ [key]: Number(value) });
  }
  saveMastery(skill: (typeof lifeSkills)[number], value: string) {
    if (value.trim() && this.current())
      this.saveCharacter({ mastery: { ...this.current()!.mastery, [skill]: Number(value) } });
  }
  setTaxes(taxOptions: TaxOptions) {
    if (this.store.update((state) => ({ ...state, taxOptions })))
      this.message.set('Benefícios de mercado salvos.');
  }
  private previousFamily: ReturnType<typeof familyProfileSchema.parse> | null = null;
  private previousFamilyRegion = '';
  saveFamily(patch: Partial<ReturnType<typeof familyProfileSchema.parse>>) {
    const parsed = familyProfileSchema.safeParse({ ...this.family(), ...patch });
    if (!parsed.success) {
      this.message.set('Confira os valores da família. Nada foi alterado.');
      return;
    }
    const before = this.family();
    if (
      this.store.update((state) => ({
        ...state,
        families: { ...state.families, [state.region]: parsed.data },
      }))
    ) {
      this.previousFamily = before;
      this.previousFamilyRegion = this.store.data().region;
      this.message.set('Dados da família salvos para esta região.');
    }
  }
  saveSkill() {
    const parsed = familyProfileSchema.safeParse({
      ...this.family(),
      lifeSkills: {
        ...this.family().lifeSkills,
        [this.skill]: { tier: this.tier, level: this.skillLevel, xpPercent: this.skillXp },
      },
    });
    if (!parsed.success) {
      this.message.set('Confira nível e experiência da profissão.');
      return;
    }
    this.saveFamily({ lifeSkills: parsed.data.lifeSkills });
  }
  chooseSkill() {
    const level = this.family().lifeSkills?.[this.skill];
    this.tier = level?.tier ?? 'Iniciante';
    this.skillLevel = level?.level ?? 1;
    this.skillXp = level?.xpPercent ?? 0;
  }
  importLegacySkills() {
    const levels = this.store.data().familyLifeSkills;
    if (levels) this.saveFamily({ lifeSkills: levels });
  }
  addPet() {
    this.saveFamily({
      pets: [
        ...this.family().pets.filter((row) => row.id !== this.petId),
        { ...this.pet, id: this.petId || crypto.randomUUID() },
      ],
    });
  }
  addMount() {
    this.saveFamily({
      mounts: [
        ...this.family().mounts.filter((row) => row.id !== this.mountId),
        { ...this.mount, id: this.mountId || crypto.randomUUID() },
      ],
    });
  }
  editPet(id: string) {
    const item = this.family().pets.find((row) => row.id === id);
    if (item) {
      this.petId = id;
      this.pet = { name: item.name, tier: item.tier, level: item.level, skills: item.skills };
    }
  }
  editMount(id: string) {
    const item = this.family().mounts.find((row) => row.id === id);
    if (item) {
      this.mountId = id;
      this.mount = { name: item.name, kind: item.kind, level: item.level, notes: item.notes };
    }
  }
  removeFamilyItem(kind: 'pets' | 'mounts', id: string) {
    this.saveFamily({ [kind]: this.family()[kind].filter((row) => row.id !== id) });
  }
  undoFamily() {
    if (this.previousFamily && this.previousFamilyRegion === this.store.data().region) {
      const before = this.previousFamily;
      this.previousFamily = null;
      this.saveFamily(before);
    }
  }
  accessory(
    kind: 'artifacts' | 'lightstones' | 'crystals' | 'pearlOutfits',
    item: CatalogItem | null,
  ) {
    if (!item || !this.current()) return;
    this.saveCharacter({
      [kind]: [...(this.current()![kind] ?? []), { itemId: item.id, name: item.name }],
    });
  }
  removeAccessory(kind: 'artifacts' | 'lightstones' | 'crystals' | 'pearlOutfits', index: number) {
    this.saveCharacter({ [kind]: this.current()?.[kind]?.filter((_, i) => i !== index) });
  }
  savePreset() {
    const current = this.current();
    if (!current || !this.presetName.trim()) {
      this.message.set('Dê um nome ao preset.');
      return;
    }
    this.saveCharacter({
      activityPresets: [
        ...(current.activityPresets ?? []),
        {
          id: crypto.randomUUID(),
          name: this.presetName.trim(),
          gear: current.gear,
          crystals: current.crystals,
        },
      ],
    });
  }
  presetId = '';
  applyPreset() {
    const preset = this.current()?.activityPresets?.find((row) => row.id === this.presetId);
    if (preset) {
      this.previous = this.current();
      this.saveCharacter({ gear: preset.gear, crystals: preset.crystals });
    }
  }
  private previous: CharacterProfile | null = null;
  undoPreset() {
    if (this.previous && this.previous.id === this.current()?.id) {
      this.saveCharacter(this.previous);
      this.previous = null;
    }
  }
}
