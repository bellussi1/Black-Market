import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnDestroy,
  inject,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { calculators, MODEL_VERSION, type CalculatorKey } from '@bdo/calculators';
import { validationMessage } from '../shared/calculation-feedback';
import { environment } from '../../environments/environment';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-calculation-proof',
  template:
    '<div class="proof"><button class="btn subtle" type="button" (click)="verify()" [disabled]="status() === \'loading\'">Conferir cálculo pela API</button><span aria-live="polite">{{ message() }}</span></div>',
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
    this.message.set('Conferindo…');
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
