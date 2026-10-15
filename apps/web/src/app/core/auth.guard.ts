import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { IdentityService } from './identity.service';

const loginRequiredPaths = ['scans', 'recommendations', 'storage'] as const;

export function isLoginRequiredPath(path: string): boolean {
  const normalized = path.split(/[?#]/, 1)[0].replace(/^\/+|\/+$/g, '');
  return loginRequiredPaths.some(
    (required) => normalized === required || normalized.startsWith(`${required}/`),
  );
}

export const authGuard: CanActivateFn = async (_route, state) => {
  const identity = inject(IdentityService);
  const router = inject(Router);

  try {
    await identity.initialize();
  } catch {
    return router.createUrlTree(['/account'], { queryParams: { returnUrl: state.url } });
  }

  return identity.authenticated()
    ? true
    : router.createUrlTree(['/account'], { queryParams: { returnUrl: state.url } });
};
