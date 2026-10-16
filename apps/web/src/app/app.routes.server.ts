import type { ServerRoute } from '@angular/ssr';
import { RenderMode } from '@angular/ssr';

const publicRoutes = [
  '',
  'database/items',
  'database/items/:id',
  'recipes',
  'recipes/:key',
  'recipes/items/:id',
  'reference',
  'reference/:kind',
  'reference/:kind/:id',
  'world',
  'market',
  'market/items/:id',
  'crafting',
  'enhancement',
  'lifeskills',
  'rng',
  'buffs',
  'termos',
  'privacidade',
  'cookies',
  'contato',
] as const;

const privateRoutes = [
  'scans',
  'tutorials/manage',
  'recommendations',
  'account',
  'profile',
  'family',
  'shopping',
  'plans',
  'storage',
  'inventory',
  'gear',
  'settings',
] as const;

export const serverRoutes: ServerRoute[] = [
  ...publicRoutes.map(
    (path): ServerRoute => ({
      path,
      renderMode: RenderMode.Server,
      headers: { 'Cache-Control': 'private, max-age=0, must-revalidate', Vary: 'Cookie' },
    }),
  ),
  ...privateRoutes.map(
    (path): ServerRoute => ({
      path,
      renderMode: RenderMode.Client,
      headers: { 'X-Robots-Tag': 'noindex,nofollow', 'Cache-Control': 'private,no-store' },
    }),
  ),
  {
    path: '**',
    renderMode: RenderMode.Server,
    headers: { 'X-Robots-Tag': 'noindex,nofollow', 'Cache-Control': 'private,no-store' },
  },
];
