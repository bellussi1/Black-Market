import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { calculateBox, defaultTax, boxSchema, type BoxInput } from '@bdo/calculators';
import { evaluate } from '../../shared/calculation-feedback';
import { silver, number } from '../../shared/formatters';
import { TaxOptionsComponent } from '../../shared/tax-options';
import { PresetBar } from '../../shared/preset-bar';
import { CalculationProof } from '../../shared/calculation-proof';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-rng-page',
  imports: [FormsModule, TaxOptionsComponent, PresetBar, CalculationProof],
  templateUrl: './rng-page.html',
})
export class RngPage {
  readonly form = signal<BoxInput>({
    ...defaultTax,
    boxPrice: '0',
    boxes: 1,
    outcomes: [{ name: 'Resultado', probability: 100, quantity: 1, price: '0' }],
  });
  readonly result = computed(() => evaluate(() => calculateBox(this.form())));
  readonly total = computed(() =>
    this.form().outcomes.reduce((n, r) => n + (r.probability || 0), 0),
  );
  readonly silver = silver;
  readonly number = number;
  patch(value: Partial<BoxInput>): void {
    this.form.update((s) => ({ ...s, ...value }));
  }
  row(index: number, patch: Partial<BoxInput['outcomes'][number]>): void {
    this.patch({
      outcomes: this.form().outcomes.map((r, k) => (k === index ? { ...r, ...patch } : r)),
    });
  }
  add(): void {
    this.patch({
      outcomes: [
        ...this.form().outcomes,
        { name: 'Resultado', probability: 0, quantity: 1, price: '0' },
      ],
    });
  }
  remove(index: number): void {
    this.patch({ outcomes: this.form().outcomes.filter((_, k) => k !== index) });
  }
  load(raw: unknown): void {
    this.form.set(boxSchema.parse(raw));
  }
}
