import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';

import { IdentityService } from './identity.service';

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
