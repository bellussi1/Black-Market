export type Feature =
  | 'home'
  | 'catalog'
  | 'recipes'
  | 'reference'
  | 'market'
  | 'crafting'
  | 'enhancement'
  | 'gear'
  | 'lifeskills'
  | 'storage'
  | 'rng'
  | 'buffs'
  | 'settings'
  | 'profile'
  | 'plans'
  | 'account'
  | 'scans'
  | 'world'
  | 'recommendations'
  | 'legal'
  | 'other';
export function featureOf(url: string): Feature {
  const path = url.split(/[?#]/)[0];
  if (path === '/') return 'home';
  if (path === '/family') return 'profile';
  if (path.startsWith('/database/items')) return 'catalog';
  if (['/termos', '/privacidade', '/cookies', '/contato'].includes(path)) return 'legal';
  const area = path.split('/')[1];
  return [
    'recipes',
    'reference',
    'market',
    'crafting',
    'enhancement',
    'gear',
    'lifeskills',
    'storage',
    'rng',
    'buffs',
    'settings',
    'profile',
    'plans',
    'account',
    'scans',
    'world',
    'recommendations',
  ].includes(area)
    ? (area as Feature)
    : 'other';
}
