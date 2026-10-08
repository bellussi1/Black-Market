import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import pt from '@angular/common/locales/pt';
import type { ApplicationConfig } from '@angular/core';
import { ErrorHandler, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
  withI18nSupport,
} from '@angular/platform-browser';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { uiLocale } from './core/locale';
import { operationalErrorInterceptor, SafeFrontendErrorHandler } from './core/operational-errors';

registerLocaleData(pt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([operationalErrorInterceptor])),
    { provide: ErrorHandler, useClass: SafeFrontendErrorHandler },
    { provide: LOCALE_ID, useFactory: uiLocale },
    provideClientHydration(
      withI18nSupport(),
      withHttpTransferCacheOptions({
        filter: (request) =>
          request.method === 'GET' &&
          !request.headers.has('Authorization') &&
          ['/items', '/recipes', '/reference', '/categories', '/world/'].some((path) =>
            request.url.includes('/api/v1' + path),
          ),
      }),
    ),
  ],
};
