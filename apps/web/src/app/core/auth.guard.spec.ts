import { TestBed } from '@angular/core/testing';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { authGuard, isLoginRequiredPath } from './auth.guard';
import { IdentityService } from './identity.service';
import { LoginIntentService } from './login-intent.service';

describe('authGuard', () => {
  it('recognizes every personal data destination that requires authentication', () => {
    expect(isLoginRequiredPath('/scans?type=gear')).toBe(true);
    expect(isLoginRequiredPath('/scans/profile')).toBe(true);
    expect(isLoginRequiredPath('/recommendations')).toBe(true);
    expect(isLoginRequiredPath('/storage?tab=inventory')).toBe(true);
    expect(isLoginRequiredPath('/family')).toBe(true);
    expect(isLoginRequiredPath('/family?tab=equipment')).toBe(true);
    expect(isLoginRequiredPath('/shopping')).toBe(true);
    expect(isLoginRequiredPath('/plans')).toBe(true);
    expect(isLoginRequiredPath('/lifeskills?tab=sessions')).toBe(false);
    expect(isLoginRequiredPath('/settings')).toBe(false);
    expect(isLoginRequiredPath('/recipes')).toBe(false);
    expect(isLoginRequiredPath('/market')).toBe(false);
  });

  function evaluate(
    authenticated: boolean,
    url: string,
    initialize = vi.fn(async () => undefined),
    navigated = false,
  ) {
    const redirect = { destination: '/' };
    const identity = { initialize, authenticated: vi.fn(() => authenticated) };
    const router = { createUrlTree: vi.fn(() => redirect), navigated };
    const intent = { request: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: IdentityService, useValue: identity },
        { provide: Router, useValue: router },
        { provide: LoginIntentService, useValue: intent },
      ],
    });
    return {
      result: TestBed.runInInjectionContext(() =>
        authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
      ),
      identity,
      router,
      redirect,
      intent,
    };
  }

  it('waits for Firebase restoration before allowing a signed-in user', async () => {
    const initialize = vi.fn(async () => undefined);
    const attempt = evaluate(true, '/storage?tab=inventory', initialize);

    await expect(attempt.result).resolves.toBe(true);
    expect(initialize).toHaveBeenCalledOnce();
    expect(attempt.router.createUrlTree).not.toHaveBeenCalled();
  });

  it('sends direct protected URLs to the public home with a login intent', async () => {
    const attempt = evaluate(false, '/scans?tab=review#space-4');

    await expect(attempt.result).resolves.toBe(attempt.redirect);
    expect(attempt.router.createUrlTree).toHaveBeenCalledWith(['/'], {
      queryParams: { loginReturnUrl: '/scans?tab=review#space-4' },
    });
    expect(attempt.intent.request).toHaveBeenCalledWith('/scans?tab=review#space-4');
  });

  it('cancels internal navigation without losing the current page', async () => {
    const attempt = evaluate(
      false,
      '/plans',
      vi.fn(async () => undefined),
      true,
    );
    await expect(attempt.result).resolves.toBe(false);
    expect(attempt.intent.request).toHaveBeenCalledWith('/plans');
    expect(attempt.router.createUrlTree).not.toHaveBeenCalled();
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
