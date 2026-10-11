import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { calculateGear, type GearInput, gearSchema } from '@bdo/calculators';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';

import { WorkspaceStore } from '../../core/workspace-store';
import { evaluate } from '../../shared/calculation-feedback';
import { CalculationProof } from '../../shared/calculation-proof';
import { EquipmentReference } from '../../shared/equipment-reference/equipment-reference';
import { number, silver } from '../../shared/formatters';
import { BdoSelect } from '../../ui/native-select/bdo-select';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-gear-page',
  imports: [
    HlmInput,
    HlmCard,
    HlmButton,
    BdoSelect,
    FormsModule,
    CalculationProof,
    EquipmentReference,
  ],
  templateUrl: './gear-page.html',
})
export class GearPage {
  readonly store = inject(WorkspaceStore);
  readonly form = signal<GearInput>({ mainAp: 0, awakeAp: 0, dp: 0, budget: '0', upgrades: [] });
  readonly result = computed(() => evaluate(() => calculateGear(this.form())));
  presetName = '';
  selected = '';
  readonly silver = silver;
  readonly number = number;
  profileId = '';
  get profiles() {
    return this.store.data().characters.filter((row) => row.region === this.store.data().region);
  }
  useProfile() {
    const profile = this.profiles.find((row) => row.id === this.profileId);
    if (profile)
      this.patch({
        mainAp: profile.mainAp,
        awakeAp: profile.awakeAp,
        dp: profile.dp,
        budget: profile.silver,
      });
  }
  get presets() {
    return this.store.data().gear.filter((r) => r.region === this.store.data().region);
  }
  patch(p: Partial<GearInput>): void {
    this.form.update((s) => ({ ...s, ...p }));
  }
  row(index: number, p: Partial<GearInput['upgrades'][number]>): void {
    this.patch({
      upgrades: this.form().upgrades.map((r, k) => (k === index ? { ...r, ...p } : r)),
    });
  }
  add(): void {
    this.patch({
      upgrades: [
        ...this.form().upgrades,
        {
          id: crypto.randomUUID(),
          name: 'Upgrade',
          cost: '0',
          mainApGain: 0,
          awakeApGain: 0,
          dpGain: 0,
        },
      ],
    });
  }
  remove(id: string): void {
    this.patch({ upgrades: this.form().upgrades.filter((r) => r.id !== id) });
  }
  save(): void {
    const input = gearSchema.safeParse(this.form());
    if (!input.success || !this.presetName.trim()) return;
    this.store.update((s) => ({
      ...s,
      gear: [
        ...s.gear,
        {
          id: crypto.randomUUID(),
          name: this.presetName.trim(),
          region: s.region,
          input: input.data,
        },
      ],
    }));
    this.presetName = '';
  }
  load(): void {
    const p = this.presets.find((r) => r.id === this.selected);
    if (p) this.form.set(structuredClone(p.input));
  }
  removePreset(): void {
    this.store.update((s) => ({ ...s, gear: s.gear.filter((r) => r.id !== this.selected) }));
    this.selected = '';
  }
}
