import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { IdentityService } from './identity.service';
import { LoginIntentService } from './login-intent.service';

const loginRequiredPaths = [
  'scans',
  'recommendations',
  'storage',
  'family',
  'shopping',
  'plans',
  'lifeskills',
  'tutorials/manage',
  'roadmap/manage',
] as const;

export function isLoginRequiredPath(path: string): boolean {
  const normalized = path.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, '');
  return loginRequiredPaths.some(
    (required) => normalized === required || normalized.startsWith(`${required}/`),
  );
}

export const authGuard: CanActivateFn = async (_route, state) => {
  const identity = inject(IdentityService);
  const router = inject(Router);
  const intent = inject(LoginIntentService);

  try {
    await identity.initialize();
  } catch {
    /* Login panel exposes initialization errors and retry. */
  }
  if (identity.authenticated()) return true;
  intent.request(state.url);
  // Cancel in-app navigation to keep the public page and its scroll position intact.
  return router.navigated
    ? false
    : router.createUrlTree(['/'], { queryParams: { loginReturnUrl: state.url } });
};
