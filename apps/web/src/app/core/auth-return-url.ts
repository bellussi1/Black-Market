const INTERNAL_ORIGIN = 'https://black-market.invalid';
export const AUTH_RETURN_URL_KEY = 'black-market.auth.return-url.v1';

const AUTHENTICATED_PATHS = [
  '/scans',
  '/recommendations',
  '/storage',
  '/family',
  '/shopping',
  '/plans',
  '/settings',
];

export function safeInternalReturnUrl(candidate: string | null): string | null {
  if (!candidate?.startsWith('/') || candidate.startsWith('//')) return null;

  try {
    const destination = new URL(candidate, INTERNAL_ORIGIN);
    if (destination.origin !== INTERNAL_ORIGIN) return null;
    const isAuthenticatedDestination = AUTHENTICATED_PATHS.some(
      (path) => destination.pathname === path || destination.pathname.startsWith(`${path}/`),
    );
    if (!isAuthenticatedDestination) return null;
    return destination.pathname + destination.search + destination.hash;
  } catch {
    return null;
  }
}
