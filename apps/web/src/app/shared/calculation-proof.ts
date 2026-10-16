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
  styleUrl: './calculation-proof.scss',
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
              ? 'Resultado conferido.'
              : 'O cálculo foi atualizado. Recarregue a página para conferir o resultado.',
          );
        },
        error: () => {
          this.status.set('error');
          this.message.set(
            'Não foi possível conferir agora. Você pode continuar usando a calculadora e tentar novamente mais tarde.',
          );
        },
      });
  }
}
