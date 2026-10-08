import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';

import { isPublicSeoPath, publicDescription } from './app/core/seo-content';
import { securityHeaders } from './security-headers';

const browserDistFolder = join(import.meta.dirname, '../browser');
const socialImage = '/og-black-market.png';
const socialAlt =
  'Black Market, ferramentas de mercado, receitas e planejamento para Black Desert Online em português.';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function decodeHtml(value: string): string {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function injectSeoMetadata(
  html: string,
  path: string,
  title: string,
  response: Response,
): Response {
  const renderedDescription = html.match(
    /<meta\b[^>]*\bname=["']description["'][^>]*\bcontent=["']([^"']*)["'][^>]*>/i,
  )?.[1];
  const description =
    (renderedDescription && decodeHtml(renderedDescription)) ||
    publicDescription(path) ||
    'Black Market: plataforma brasileira para jogadores de Black Desert Online.';
  const publicUrl = process.env['PUBLIC_SITE_URL'];
  const origin = publicUrl ? new URL(publicUrl).origin : null;
  const responseRobots = response.headers.get('X-Robots-Tag') ?? '';
  const indexable =
    response.status === 200 &&
    isPublicSeoPath(path) &&
    origin !== null &&
    !responseRobots.includes('noindex');
  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${indexable ? 'index,follow' : 'noindex,nofollow'}" />`,
  ];

  if (indexable && origin) {
    const canonical = new URL(path, origin).href;
    const image = new URL(socialImage, origin).href;
    const structuredData =
      path === '/'
        ? {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Black Market',
            description,
            url: origin,
            inLanguage: 'pt-BR',
          }
        : {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: title,
            description,
            url: canonical,
            inLanguage: 'pt-BR',
            isPartOf: {
              '@type': 'WebSite',
              name: 'Black Market',
              url: origin,
              inLanguage: 'pt-BR',
            },
          };
    tags.push(
      `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
      '<meta property="og:type" content="website" />',
      '<meta property="og:site_name" content="Black Market" />',
      '<meta property="og:locale" content="pt_BR" />',
      `<meta property="og:title" content="${escapeHtml(title)}" />`,
      `<meta property="og:description" content="${escapeHtml(description)}" />`,
      `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
      `<meta property="og:image" content="${escapeHtml(image)}" />`,
      '<meta property="og:image:type" content="image/png" />',
      '<meta property="og:image:width" content="1200" />',
      '<meta property="og:image:height" content="630" />',
      `<meta property="og:image:alt" content="${escapeHtml(socialAlt)}" />`,
      `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
      `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
      '<meta name="twitter:card" content="summary_large_image" />',
      `<meta name="twitter:image" content="${escapeHtml(image)}" />`,
      `<meta name="twitter:image:alt" content="${escapeHtml(socialAlt)}" />`,
      `<script type="application/ld+json">${JSON.stringify(structuredData).replaceAll('<', '\\u003c')}</script>`,
    );
  }

  const managedTags =
    /<meta\b[^>]*\b(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi;
  const cleaned = html
    .replace(managedTags, '')
    .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '')
    .replace(/<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, '');
  const document = cleaned.replace('</head>', tags.join('') + '</head>');
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  if (!indexable) headers.set('X-Robots-Tag', 'noindex,nofollow');
  return new Response(document, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
app.use((req, res, next) => {
  if (req.path.length <= 1 || !req.path.endsWith('/')) {
    next();
    return;
  }
  const path = req.path.replace(/\/+$/, '') || '/';
  const query = req.originalUrl.slice(req.path.length);
  res.redirect(308, path + query);
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
app.get('/sobre/', (_req, res, next) => {
  void readFile(join(browserDistFolder, 'sobre', 'index.html'), 'utf8')
    .then((html) => {
      const description =
        'Conheça o Black Market: ferramentas de Black Desert para SA, fontes dos dados e importação em português brasileiro.';
      const publicUrl = process.env['PUBLIC_SITE_URL'];
      let metadata =
        `<meta name="description" content="${description}" />` +
        '<meta name="robots" content="noindex,nofollow" />';
      if (publicUrl) {
        const origin = new URL(publicUrl).origin;
        const canonical = new URL('/sobre', origin).href;
        const image = new URL('/og-black-market.png', origin).href;
        const schema = {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          name: 'Sobre o Black Market',
          description,
          url: canonical,
          inLanguage: 'pt-BR',
          isPartOf: { '@type': 'WebSite', name: 'Black Market', url: origin, inLanguage: 'pt-BR' },
        };
        metadata = [
          `<meta name="description" content="${description}" />`,
          '<meta name="robots" content="index,follow" />',
          `<link rel="canonical" href="${canonical}" />`,
          '<meta property="og:type" content="website" />',
          '<meta property="og:site_name" content="Black Market" />',
          '<meta property="og:locale" content="pt_BR" />',
          `<meta property="og:url" content="${canonical}" />`,
          '<meta property="og:title" content="Black Market — Fontes dos dados e perguntas frequentes" />',
          `<meta property="og:description" content="${description}" />`,
          `<meta property="og:image" content="${image}" />`,
          '<meta property="og:image:type" content="image/png" />',
          '<meta property="og:image:width" content="1200" />',
          '<meta property="og:image:height" content="630" />',
          '<meta property="og:image:alt" content="Black Market, ferramentas de mercado, receitas e planejamento para Black Desert Online em português." />',
          '<meta name="twitter:card" content="summary_large_image" />',
          '<meta name="twitter:title" content="Black Market — Fontes dos dados e perguntas frequentes" />',
          `<meta name="twitter:description" content="${description}" />`,
          `<meta name="twitter:image" content="${image}" />`,
          '<meta name="twitter:image:alt" content="Black Market, ferramentas de mercado, receitas e planejamento para Black Desert Online em português." />',
          `<script type="application/ld+json">${JSON.stringify(schema).replaceAll('<', '\\u003c')}</script>`,
        ].join('');
      }
      return res
        .set('Cache-Control', 'public, max-age=300')
        .type('html')
        .send(
          html
            .replace('</head>', metadata + '</head>')
            .replace(
              /<span data-copyright-year>\d{4}<\/span>/,
              '<span data-copyright-year>' + new Date().getUTCFullYear() + '</span>',
            ),
        );
    })
    .catch(next);
});
app.get('/sobre/index.html', (_req, res) => res.redirect(308, '/sobre'));
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
      if (response) {
        if (response.headers.get('content-type')?.includes('text/html'))
          return response.text().then((html) => {
            const title = decodeHtml(
              html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? 'Black Market',
            );
            const metadataResponse = injectSeoMetadata(html, req.path, title, response);
            return writeResponseToNodeResponse(metadataResponse, res);
          });
        return writeResponseToNodeResponse(response, res);
      }
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
