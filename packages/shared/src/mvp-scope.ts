/** Reversible product scope shared by navigation, route guards and public sitemaps. */
export const SCREENSHOT_MVP = true;
export const SUSPENDED_MVP_ROOTS = [
  'world',
  'plans',
  'reference',
  'enhancement',
  'lifeskills',
  'rng',
  'buffs',
  'demo',
] as const;
export function isMvpPathSuspended(path: string): boolean {
  return (
    SCREENSHOT_MVP &&
    (SUSPENDED_MVP_ROOTS as readonly string[]).includes(path.replace(/^\//, '').split(/[/?#]/)[0])
  );
}
const enabledRoots = new Set([
  '',
  'market',
  'recommendations',
  'roadmap',
  'tutorials',
  'storage',
  'family',
  'inventory',
  'gear',
  'scans',
  'recipes',
  'crafting',
  'database',
  'profile',
  'shopping',
  'settings',
  'account',
  'termos',
  'privacidade',
  'cookies',
  'contato',
  'sobre',
]);
export function isMvpPathEnabled(path: string): boolean {
  return !SCREENSHOT_MVP || enabledRoots.has(path.replace(/^\//, '').split(/[/?#]/)[0]);
}
