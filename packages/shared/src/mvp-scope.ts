/** Reversible product scope shared by navigation, route guards and public sitemaps. */
export const SCREENSHOT_MVP = true;
export const SUSPENDED_MVP_ROOTS = [
  'recipes',
  'world',
  'recommendations',
  'account',
  'plans',
  'reference',
  'crafting',
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
  'storage',
  'inventory',
  'gear',
  'scans',
  'database',
  'profile',
  'settings',
  'termos',
  'privacidade',
  'cookies',
  'contato',
  'sobre',
]);
export function isMvpPathEnabled(path: string): boolean {
  return !SCREENSHOT_MVP || enabledRoots.has(path.replace(/^\//, '').split(/[/?#]/)[0]);
}
