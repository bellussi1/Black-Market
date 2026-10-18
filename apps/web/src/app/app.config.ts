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
import { apiOriginInterceptor } from './core/api-origin.interceptor';
import { uiLocale } from './core/locale';
import { operationalErrorInterceptor, SafeFrontendErrorHandler } from './core/operational-errors';
import { shouldTransferPublicRead } from './core/public-http-transfer-cache';
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
    provideHttpClient(withInterceptors([apiOriginInterceptor, operationalErrorInterceptor])),
    { provide: ErrorHandler, useClass: SafeFrontendErrorHandler },
    { provide: LOCALE_ID, useFactory: uiLocale },
    provideClientHydration(
      withNoIncrementalHydration(),
      withI18nSupport(),
      withHttpTransferCacheOptions({
        filter: shouldTransferPublicRead,
      }),
    ),
  ],
};
