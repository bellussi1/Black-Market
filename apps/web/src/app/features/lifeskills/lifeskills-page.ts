import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  type ActivityInput,
  activitySchema,
  calculateActivity,
  calculateInvestment,
  calculateTraining,
  defaultTax,
  type InvestmentInput,
  investmentSchema,
  type TrainingInput,
  trainingSchema,
} from '@bdo/calculators';

import { WorkspaceStore } from '../../core/workspace-store';
import { evaluate } from '../../shared/calculation-feedback';
import { CalculationProof } from '../../shared/calculation-proof';
import { date, number, silver } from '../../shared/formatters';
import { PresetBar } from '../../shared/preset-bar';
import { TaxOptionsComponent } from '../../shared/tax-options';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-lifeskills-page',
  imports: [FormsModule, TaxOptionsComponent, PresetBar, CalculationProof],
  templateUrl: './lifeskills-page.html',
})
export class LifeskillsPage {
  readonly store = inject(WorkspaceStore);
  readonly tab = signal('sessions');
  readonly form = signal<ActivityInput>({
    ...defaultTax,
    name: 'Minha sessão',
    minutes: 60,
    energy: 0,
    cost: '0',
    directIncome: '0',
    items: [],
  });
  readonly investment = signal<InvestmentInput>({
    upgradeCost: '0',
    currentHourly: '0',
    nextHourly: '0',
    dailyHours: 1,
  });
  readonly training = signal<TrainingInput>({ remainingXp: 1, xpPerHour: 1, sessionMinutes: 60 });
  readonly result = computed(() => evaluate(() => calculateActivity(this.form())));
  readonly investmentResult = computed(() =>
    evaluate(() => calculateInvestment(this.investment())),
  );
  readonly trainingResult = computed(() => evaluate(() => calculateTraining(this.training())));
  readonly sessions = computed(() =>
    this.store
      .data()
      .sessions.filter((s) => s.region === this.store.data().region)
      .slice()
      .reverse(),
  );
  readonly totals = computed(() => {
    const rows = this.sessions();
    const minutes = rows.reduce((n, r) => n + r.input.minutes, 0);
    const profit = rows.reduce((sum, r) => sum + BigInt(calculateActivity(r.input).profit), 0n);
    return {
      minutes,
      profit: String(profit),
      perHour: minutes > 0 ? String((profit * 60_000n) / BigInt(Math.round(minutes * 1000))) : null,
    };
  });
  readonly silver = silver;
  readonly number = number;
  readonly date = date;
  patch(p: Partial<ActivityInput>): void {
    this.form.update((s) => ({ ...s, ...p }));
  }
  patchInvestment(p: Partial<InvestmentInput>): void {
    this.investment.update((s) => ({ ...s, ...p }));
  }
  patchTraining(p: Partial<TrainingInput>): void {
    this.training.update((s) => ({ ...s, ...p }));
  }
  row(index: number, p: Partial<ActivityInput['items'][number]>): void {
    this.patch({ items: this.form().items.map((r, k) => (k === index ? { ...r, ...p } : r)) });
  }
  add(): void {
    this.patch({ items: [...this.form().items, { name: 'Item', quantity: 1, price: '0' }] });
  }
  remove(index: number): void {
    this.patch({ items: this.form().items.filter((_, k) => k !== index) });
  }
  save(): void {
    const parsed = activitySchema.safeParse(this.form());
    if (parsed.success)
      this.store.update((s) => ({
        ...s,
        sessions: [
          ...s.sessions,
          {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            region: s.region,
            input: parsed.data,
          },
        ],
      }));
  }
  removeSession(id: string): void {
    this.store.update((s) => ({ ...s, sessions: s.sessions.filter((r) => r.id !== id) }));
  }
  useSession(id: string): void {
    const row = this.sessions().find((r) => r.id === id);
    if (row) this.form.set(structuredClone(row.input));
  }
  sessionProfit(raw: ActivityInput): string {
    return calculateActivity(raw).profit;
  }
  load(raw: unknown): void {
    this.form.set(activitySchema.parse(raw));
  }
  loadInvestment(raw: unknown): void {
    this.investment.set(investmentSchema.parse(raw));
  }
  loadTraining(raw: unknown): void {
    this.training.set(trainingSchema.parse(raw));
  }
}
