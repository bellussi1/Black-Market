import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  calculateEnhancement,
  calculateFailstack,
  type EnhancementInput,
  enhancementSchema,
  type FailstackInput,
  failstackSchema,
} from '@bdo/calculators';

import { WorkspaceStore } from '../../core/workspace-store';
import { evaluate } from '../../shared/calculation-feedback';
import { CalculationProof } from '../../shared/calculation-proof';
import { EquipmentReference } from '../../shared/equipment-reference/equipment-reference';
import { date, number, silver } from '../../shared/formatters';
import { PresetBar } from '../../shared/preset-bar';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-enhancement-page',
  imports: [FormsModule, PresetBar, CalculationProof, EquipmentReference],
  templateUrl: './enhancement-page.html',
})
export class EnhancementPage {
  readonly store = inject(WorkspaceStore);
  readonly tab = signal('cost');
  readonly form = signal<EnhancementInput>({
    chance: 0,
    increase: 0,
    cap: 100,
    limit: 50,
    pity: 0,
    currentPity: 0,
    attemptCost: '0',
    failureCost: '0',
    guaranteedCost: '0',
    stackCost: '0',
    buyPrice: '0',
  });
  readonly stack = signal<FailstackInput>({
    baseCost: '0',
    steps: [{ label: 'Etapa 1', chance: 0, cost: '0', failureCost: '0' }],
  });
  readonly result = computed(() => evaluate(() => calculateEnhancement(this.form())));
  readonly stackResult = computed(() => evaluate(() => calculateFailstack(this.stack())));
  name = '';
  outcome: 'success' | 'failure' = 'failure';
  readonly silver = silver;
  readonly number = number;
  readonly date = date;
  patch(value: Partial<EnhancementInput>): void {
    this.form.update((s) => ({ ...s, ...value }));
  }
  load(raw: unknown): void {
    this.form.set(enhancementSchema.parse(raw));
  }
  loadStack(raw: unknown): void {
    this.stack.set(failstackSchema.parse(raw));
  }
  patchStack(value: Partial<FailstackInput>): void {
    this.stack.update((s) => ({ ...s, ...value }));
  }
  step(index: number, patch: Partial<FailstackInput['steps'][number]>): void {
    this.patchStack({
      steps: this.stack().steps.map((s, k) => (k === index ? { ...s, ...patch } : s)),
    });
  }
  addStep(): void {
    this.patchStack({
      steps: [
        ...this.stack().steps,
        {
          label: 'Etapa ' + (this.stack().steps.length + 1),
          chance: 0,
          cost: '0',
          failureCost: '0',
        },
      ],
    });
  }
  removeStep(index: number): void {
    this.patchStack({ steps: this.stack().steps.filter((_, k) => k !== index) });
  }
  points(): string {
    const rows = this.result().value?.distribution ?? [];
    return rows
      .filter(
        (_, index) =>
          index % Math.max(1, Math.ceil(rows.length / 100)) === 0 || index === rows.length - 1,
      )
      .map(
        (r) =>
          (rows.length === 1 ? 1000 : ((r.attempt - 1) * 1000) / (rows.length - 1)) +
          ',' +
          (150 - r.successByNow * 1.4),
      )
      .join(' ');
  }
  get landmarks() {
    const rows = this.result().value?.distribution ?? [];
    return rows.filter(
      (_, i) => i % Math.max(1, Math.ceil(rows.length / 12)) === 0 || i === rows.length - 1,
    );
  }
  get logs() {
    return this.store
      .data()
      .enhancementLog.filter((r) => r.region === this.store.data().region)
      .slice()
      .reverse();
  }
  record(): void {
    if (!this.result().value || !this.name.trim()) return;
    this.store.update((s) => ({
      ...s,
      enhancementLog: [
        ...s.enhancementLog,
        {
          id: crypto.randomUUID(),
          name: this.name.trim(),
          createdAt: new Date().toISOString(),
          region: s.region,
          chance: this.form().chance,
          cost: this.form().attemptCost,
          outcome: this.outcome,
        },
      ],
    }));
  }
  removeLog(id: string): void {
    this.store.update((s) => ({
      ...s,
      enhancementLog: s.enhancementLog.filter((r) => r.id !== id),
    }));
  }
}
