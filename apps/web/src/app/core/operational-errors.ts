import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import type { ErrorHandler } from '@angular/core';
import { inject, Injectable, Injector } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { featureOf } from './feature-area';
@Injectable({ providedIn: 'root' })
export class OperationalErrors {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private sent = 0;
  private readonly reported = new Set<string>();
  report(kind: 'runtime' | 'unhandled_rejection' | 'http', status?: number, requestId?: string) {
    if (!this.browser || !environment.production || this.sent >= 5) return;
    const feature = featureOf(this.router.url),
      area = [
        'catalog',
        'recipes',
        'reference',
        'market',
        'crafting',
        'profile',
        'storage',
        'plans',
        'account',
        'scans',
        'world',
        'gear',
        'enhancement',
        'lifeskills',
        'recommendations',
        'rng',
        'buffs',
        'settings',
        'legal',
        'home',
      ].includes(feature)
        ? feature
        : 'other';
    const validStatus =
      Number.isInteger(status) && status! >= 0 && status! <= 599 ? status : undefined;
    const validId = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
      requestId ?? '',
    )
      ? requestId
      : undefined;
    const signature = JSON.stringify([kind, area, validStatus, validId]);
    if (this.reported.has(signature)) return;
    this.reported.add(signature);
    this.sent++;
    this.http
      .post(
        environment.apiBaseUrl + '/api/v1/telemetry/errors',
        {
          kind,
          area,
          ...(validStatus === undefined ? {} : { status: validStatus }),
          ...(validId === undefined ? {} : { requestId: validId }),
        },
        { transferCache: false },
      )
      .subscribe({ error: () => undefined });
  }
}
@Injectable()
export class SafeFrontendErrorHandler implements ErrorHandler {
  private readonly injector = inject(Injector);
  handleError() {
    this.injector.get(OperationalErrors).report('runtime');
  }
}
export const operationalErrorInterceptor: HttpInterceptorFn = (request, next) => {
  const errors = inject(OperationalErrors);
  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        request.url.includes('/api/v1/') &&
        !request.url.includes('/telemetry/') &&
        error instanceof HttpErrorResponse &&
        (error.status === 0 || error.status >= 500)
      )
        errors.report('http', error.status, error.headers.get('X-Request-ID') ?? undefined);
      return throwError(() => error);
    }),
  );
};
