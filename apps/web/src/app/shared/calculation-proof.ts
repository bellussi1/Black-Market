import { HttpClient } from '@angular/common/http';
import type { OnChanges, OnDestroy } from '@angular/core';
import { ChangeDetectionStrategy, Component, inject, Input, signal } from '@angular/core';
import { type CalculatorKey, calculators, MODEL_VERSION } from '@bdo/calculators';
import type { Subscription } from 'rxjs';

import { environment } from '../../environments/environment';
import { validationMessage } from '../shared/calculation-feedback';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-calculation-proof',
  templateUrl: './calculation-proof.html',
})
export class CalculationProof implements OnChanges, OnDestroy {
  @Input({ required: true }) tool!: CalculatorKey;
  @Input({ required: true }) value!: unknown;
  readonly status = signal('idle');
  readonly message = signal('');
  private readonly http = inject(HttpClient);
  private request?: Subscription;
  ngOnChanges(): void {
    this.request?.unsubscribe();
    this.status.set('idle');
    this.message.set('');
  }
  ngOnDestroy(): void {
    this.request?.unsubscribe();
  }
  verify(): void {
    let expected: unknown;
    try {
      expected = calculators[this.tool](this.value);
    } catch (error) {
      this.status.set('error');
      this.message.set(validationMessage(error));
      return;
    }
    this.status.set('loading');
    this.message.set($localize`Conferindo…`);
    this.request = this.http
      .post<{
        modelVersion: string;
        result: unknown;
      }>(environment.apiBaseUrl + '/api/v1/calculators/' + this.tool, this.value)
      .subscribe({
        next: (r) => {
          const equal =
            r.modelVersion === MODEL_VERSION &&
            JSON.stringify(r.result) === JSON.stringify(expected);
          this.status.set(equal ? 'ok' : 'error');
          this.message.set(
            equal
              ? 'Resultado confirmado pela API · modelo ' + r.modelVersion
              : 'Os modelos ou resultados diferem. Atualize a página antes de usar o cenário.',
          );
        },
        error: () => {
          this.status.set('error');
          this.message.set(
            'A API não validou esta entrada ou está offline. O cálculo local permanece disponível.',
          );
        },
      });
  }
}
