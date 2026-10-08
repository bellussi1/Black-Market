import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import type { ErrorHandler } from '@angular/core';
import { inject, Injectable, Injector } from '@angular/core';
import { PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../environments/environment';
import { featureOf } from './analytics.service';
@Injectable({ providedIn: 'root' })
export class OperationalErrors {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private sent = 0;
  report(kind: 'runtime' | 'unhandled_rejection' | 'http', status?: number, requestId?: string) {
    if (!this.browser || !environment.production || this.sent >= 5) return;
    this.sent++;
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
      ].includes(feature)
        ? feature
        : 'other';
    this.http
      .post(
        environment.apiBaseUrl + '/api/v1/telemetry/errors',
        {
          kind,
          area,
          ...(status === undefined ? {} : { status }),
          ...(/^[a-f0-9-]{36}$/.test(requestId ?? '') ? { requestId } : {}),
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
