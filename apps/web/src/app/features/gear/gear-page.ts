import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { calculateGear, gearSchema, type GearInput } from '@bdo/calculators';
import { WorkspaceStore, evaluate, silver, number } from '../../core/workspace-store';
import { CalculationProof } from '../../shared/calculation-proof';
@Component({
  selector: 'app-gear-page',
  imports: [FormsModule, CalculationProof],
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
