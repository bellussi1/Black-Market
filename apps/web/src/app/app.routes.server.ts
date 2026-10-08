import type { ServerRoute } from '@angular/ssr';
import { RenderMode } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  ...[
    '',
    'database/items',
    'database/items/:id',
    'recipes',
    'recipes/:key',
    'reference',
    'reference/:kind',
    'reference/:kind/:id',
    'world',
    'termos',
    'privacidade',
    'cookies',
    'contato',
  ].map(
    (path): ServerRoute => ({
      path,
      renderMode: RenderMode.Server,
      headers: { 'Cache-Control': 'private, max-age=0, must-revalidate', Vary: 'Cookie' },
    }),
  ),
  {
    path: '**',
    renderMode: RenderMode.Client,
    headers: { 'X-Robots-Tag': 'noindex,nofollow', 'Cache-Control': 'private,no-store' },
  },
];
