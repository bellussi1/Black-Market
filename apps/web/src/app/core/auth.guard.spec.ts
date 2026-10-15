import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { authGuard } from './auth.guard';
import { IdentityService } from './identity.service';

describe('authGuard', () => {
  function evaluate(
    authenticated: boolean,
    url: string,
    initialize = vi.fn(async () => undefined),
  ) {
    const redirect = { destination: '/account' };
    const identity = { initialize, authenticated: vi.fn(() => authenticated) };
    const router = { createUrlTree: vi.fn(() => redirect) };
    TestBed.configureTestingModule({
      providers: [
        { provide: IdentityService, useValue: identity },
        { provide: Router, useValue: router },
      ],
    });
    return {
      result: TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
      ),
      identity,
      router,
      redirect,
    };
  }

  it('waits for Firebase restoration before allowing a signed-in user', async () => {
    const initialize = vi.fn(async () => undefined);
    const attempt = evaluate(true, '/storage?tab=inventory', initialize);

    await expect(attempt.result).resolves.toBe(true);
    expect(initialize).toHaveBeenCalledOnce();
    expect(attempt.router.createUrlTree).not.toHaveBeenCalled();
  });

  it('redirects visitors to the public account page with their requested route', async () => {
    const attempt = evaluate(false, '/scans?tab=review#space-4');

    await expect(attempt.result).resolves.toBe(attempt.redirect);
    expect(attempt.router.createUrlTree).toHaveBeenCalledWith(['/account'], {
      queryParams: { returnUrl: '/scans?tab=review#space-4' },
    });
  });

  it('redirects safely if session initialization fails', async () => {
    const initialize = vi.fn(async () => {
      throw new Error('Firebase unavailable');
    });
    const attempt = evaluate(false, '/recommendations', initialize);

    await expect(attempt.result).resolves.toBe(attempt.redirect);
    expect(attempt.router.createUrlTree).toHaveBeenCalledOnce();
  });
});
