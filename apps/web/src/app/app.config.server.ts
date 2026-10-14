import {
  HTTP_TRANSFER_CACHE_ORIGIN_MAP,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import type { ApplicationConfig } from '@angular/core';
import { inject, mergeApplicationConfig, REQUEST } from '@angular/core';
import { provideRouter, TitleStrategy, withNavigationErrorHandler } from '@angular/router';
import { provideServerRendering, withRoutes } from '@angular/ssr';

import { environment } from '../environments/environment';
import { appConfig } from './app.config';
import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import { SeoService } from './core/seo.service';

const serverConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withNavigationErrorHandler(({ error }: { error: unknown }) => {
        const code =
          error && typeof error === 'object' && 'code' in error && typeof error.code === 'number'
            ? error.code
            : null;
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            event: 'ssr_navigation_error',
            code,
            cause: error instanceof Error ? error.name : 'Unknown',
          }),
        );
      }),
    ),
    { provide: TitleStrategy, useExisting: SeoService },
    provideServerRendering(withRoutes(serverRoutes)),
    provideHttpClient(
      withInterceptors([
        (request, next) => {
          const base = process.env['API_BASE_URL'] ?? 'http://localhost:3001';
          if (request.url.startsWith('/api/v1/'))
            return next(request.clone({ url: base + request.url }));
          if (environment.apiBaseUrl && request.url.startsWith(environment.apiBaseUrl + '/api/v1/'))
            return next(
              request.clone({ url: base + request.url.slice(environment.apiBaseUrl.length) }),
            );
          return next(request);
        },
      ]),
    ),
    {
      provide: HTTP_TRANSFER_CACHE_ORIGIN_MAP,
      useFactory: () => {
        const request = inject(REQUEST, { optional: true });
        const origin =
          environment.apiBaseUrl ||
          (request ? new URL(request.url).origin : 'http://localhost:4000');
        return { [new URL(process.env['API_BASE_URL'] ?? 'http://localhost:3001').origin]: origin };
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
