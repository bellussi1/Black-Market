import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ErrorHandler,
  inject,
  Injector,
} from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    const injector = inject(Injector);
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      void import('./core/analytics.service')
        .then(({ AnalyticsService }) => {
          if (!destroy.destroyed) injector.get(AnalyticsService).start();
        })
        .catch((error: unknown) => {
          if (!destroy.destroyed) injector.get(ErrorHandler).handleError(error);
        });
    });
  }
}
