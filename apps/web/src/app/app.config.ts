import { provideHttpClient, withInterceptors } from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { ErrorHandler, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import {
  provideClientHydration,
  withHttpTransferCacheOptions,
  withI18nSupport,
  withNoIncrementalHydration,
} from '@angular/platform-browser';
import { provideRouter, TitleStrategy, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { uiLocale } from './core/locale';
import { operationalErrorInterceptor, SafeFrontendErrorHandler } from './core/operational-errors';
import { SeoService } from './core/seo.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          const path = (snapshot: typeof from): string =>
            snapshot.url.map((segment) => segment.path).join('/') +
            (snapshot.firstChild ? '/' + path(snapshot.firstChild) : '');
          if (path(from) === path(to)) transition.skipTransition();
        },
      }),
    ),
    { provide: TitleStrategy, useExisting: SeoService },
    provideHttpClient(withInterceptors([operationalErrorInterceptor])),
    { provide: ErrorHandler, useClass: SafeFrontendErrorHandler },
    { provide: LOCALE_ID, useFactory: uiLocale },
    provideClientHydration(
      withNoIncrementalHydration(),
      withI18nSupport(),
      withHttpTransferCacheOptions({
        filter: (request) =>
          request.method === 'GET' &&
          !request.headers.has('Authorization') &&
          ['/items', '/recipes', '/reference', '/categories', '/world/', '/roadmap'].some((path) =>
            request.url.includes('/api/v1' + path),
          ),
      }),
    ),
  ],
};
