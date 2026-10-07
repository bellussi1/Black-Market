import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { TaxOptions } from '@bdo/calculators';
@Component({
  selector: 'app-tax-options',
  imports: [FormsModule],
  templateUrl: './tax-options.html',
})
export class TaxOptionsComponent {
  readonly value = input.required<TaxOptions>();
  readonly changed = output<TaxOptions>();
  patch(patch: Partial<TaxOptions>): void {
    this.changed.emit({ ...this.value(), ...patch });
  }
}
