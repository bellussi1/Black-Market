import { randomUUID } from 'node:crypto';
import { join } from 'node:path';

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';

import { securityHeaders } from './security-headers';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.locals['requestId'] = randomUUID();
  res.setHeader('X-Request-ID', String(res.locals['requestId']));
  next();
});
app.use((_req, res, next) => {
  if (process.env['NODE_ENV'] === 'production')
    for (const [name, value] of Object.entries(
      securityHeaders(
        process.env['PUBLIC_SITE_URL'],
        process.env['SUPABASE_URL'],
        process.env['CATALOG_ASSETS_PUBLIC_URL'],
      ),
    ))
      res.setHeader(name, value);
  next();
});
const publicOrigin = process.env['PUBLIC_SITE_URL'];
const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: process.env['NODE_ENV'] === 'production' ? ['x-forwarded-proto'] : false,
  allowedHosts: [
    'localhost',
    '127.0.0.1',
    ...(publicOrigin ? [new URL(publicOrigin).hostname] : []),
  ],
});

app.get('/robots.txt', (_req, res) => {
  const origin = process.env['PUBLIC_SITE_URL'];
  res
    .type('text/plain')
    .send(
      'User-agent: *\nAllow: /\nDisallow: /api/\n' +
        (origin ? 'Sitemap: ' + new URL(origin).origin + '/sitemap.xml\n' : ''),
    );
});
app.get('/sobre/', (_req, res) => {
  res
    .set('Cache-Control', 'public, max-age=300')
    .sendFile(join(browserDistFolder, 'sobre', 'index.html'));
});
async function sitemapResponse(path: string, res: express.Response) {
  try {
    const response = await fetch(
      (process.env['API_BASE_URL'] ?? 'http://localhost:3000') + '/api/v1/catalog/' + path,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) {
      res.status(response.status).send('Mapa do site indisponível.');
      return;
    }
    const content = await response.text();
    if (content.length > 4_000_000) throw new Error('Mapa muito grande.');
    res.set('Cache-Control', 'public, max-age=3600').type('application/xml').send(content);
  } catch {
    res.status(503).send('Mapa do site indisponível.');
  }
}
app.get('/sitemap.xml', (_req, res) => {
  void sitemapResponse('sitemap.xml', res);
});
app.get('/sitemaps/:type/:page.xml', (req, res) => {
  const type = String(req.params['type']),
    page = String(req.params['page']);
  if (!['public', 'items', 'recipes', 'reference'].includes(type) || !/^\d{1,3}$/.test(page)) {
    res.status(404).end();
    return;
  }
  void sitemapResponse('sitemaps/' + type + '/' + page, res);
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
    setHeaders: (res, path) => {
      if (!/[-.][A-Za-z0-9_-]{8,}\.(?:js|css)$/.test(path))
        res.setHeader('Cache-Control', 'public, max-age=300');
    },
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (response) return writeResponseToNodeResponse(response, res);
      if (
        /^\/(?:$|database\/items(?:\/|$)|recipes(?:\/|$)|reference(?:\/|$)|world$|termos$|privacidade$|cookies$|contato$)/.test(
          req.path,
        )
      ) {
        console.error(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'ERROR',
            environment: process.env['NODE_ENV'] ?? 'development',
            event: 'ssr_render_failed',
            requestId: res.locals['requestId'],
          }),
        );
        res
          .status(503)
          .set('Cache-Control', 'no-store')
          .send(
            'Não foi possível carregar esta página agora. Tente novamente em alguns instantes.',
          );
        return;
      }
      return next();
    })
    .catch(next);
});

app.use(
  (error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        environment: process.env['NODE_ENV'] ?? 'development',
        event: 'web_exception',
        cause: error instanceof Error ? 'InternalError' : 'Unknown',
        requestId: res.locals['requestId'],
      }),
    );
    if (!res.headersSent)
      res
        .status(503)
        .set('Cache-Control', 'no-store')
        .send('Não foi possível carregar esta página agora. Tente novamente em alguns instantes.');
  },
);

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'ERROR',
          environment: process.env['NODE_ENV'] ?? 'development',
          event: 'web_startup_failed',
        }),
      );
      process.exitCode = 1;
      return;
    }

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'INFO',
        environment: process.env['NODE_ENV'] ?? 'development',
        event: 'web_started',
      }),
    );
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
