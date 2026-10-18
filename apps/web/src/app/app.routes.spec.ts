import { Component } from '@angular/core';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RenderMode } from '@angular/ssr';
import { describe, expect, it } from 'vitest';

import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import { authGuard } from './core/auth.guard';
import { IdentityService } from './core/identity.service';
import { recommendationsRouteResolver } from './core/public-route-data';

@Component({ template: '' })
class RouteDestination {}

describe('Unified personal workspace routes', () => {
  it('serializes a direct protected URL into the public Home redirect for reload and SSR continuity', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: IdentityService,
          useValue: { initialize: async () => undefined, authenticated: signal(false) },
        },
        provideRouter([
          { path: 'plans', component: RouteDestination, canActivate: [authGuard] },
          { path: '', component: RouteDestination },
        ]),
      ],
    });
    await RouterTestingHarness.create('/plans?tab=active#first');
    const router = TestBed.inject(Router);
    expect(router.parseUrl(router.url).queryParams['loginReturnUrl']).toBe(
      '/plans?tab=active#first',
    );
    expect(router.url.split('?')[0]).toBe('/');
  });
  it('keeps catalogue filters and detail IDs when opening the unified market', async () => {
    const catalogueRoutes = routes[0]
      .children!.filter((route) =>
        ['database/items', 'database/items/:id', 'market', 'market/items/:id'].includes(
          route.path!,
        ),
      )
      .map((route) =>
        route.redirectTo
          ? route
          : {
              ...route,
              component: RouteDestination,
              loadComponent: undefined,
              // This harness verifies redirect URLs; warming is covered by its
              // resolver integration specs and must not issue real HTTP here.
              resolve: undefined,
              canMatch: undefined,
              canActivate: undefined,
            },
      );
    TestBed.configureTestingModule({ providers: [provideRouter(catalogueRoutes)] });
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    await harness.navigateByUrl('/database/items?q=madeira&region=na#catalogue', RouteDestination);
    expect(router.url).toBe('/market?q=madeira&region=na#catalogue');
    await harness.navigateByUrl('/database/items/212?q=corda&region=sa#prices', RouteDestination);
    expect(router.url).toBe('/market/items/212?q=corda&region=sa#prices');
  });
  it('opens legacy personal links in their corresponding canonical tabs', async () => {
    const personalRoutes = routes[0]
      .children!.filter((route) =>
        ['inventory', 'storage', 'profile', 'gear', 'family'].includes(route.path!),
      )
      .map((route) =>
        route.redirectTo
          ? route
          : {
              ...route,
              component: RouteDestination,
              loadComponent: undefined,
              canMatch: undefined,
              canActivate: undefined,
            },
      );
    TestBed.configureTestingModule({ providers: [provideRouter(personalRoutes)] });
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);
    for (const [legacy, canonical] of [
      ['/inventory', '/storage?tab=inventory'],
      ['/profile', '/family?tab=character'],
      ['/gear', '/family?tab=equipment'],
      ['/inventory?item=212#review', '/storage?item=212&tab=inventory#review'],
    ]) {
      await harness.navigateByUrl(legacy, RouteDestination);
      expect(router.url).toBe(canonical);
    }
  });
  it('requires social sessions on every personal data route', () => {
    const sessionRoutes = new Set([
      'scans',
      'scans/profile',
      'recommendations',
      'tutorials/manage',
      'roadmap/manage',
      'storage',
      'family',
      'shopping',
      'plans',
      'lifeskills',
    ]);
    for (const route of routes[0].children ?? []) {
      expect((route.canActivate?.length ?? 0) > 0).toBe(sessionRoutes.has(route.path ?? ''));
    }
  });

  it('keeps local settings public and preserves legacy Steam callbacks and return intent', async () => {
    expect(
      routes[0].children?.find((route) => route.path === 'settings')?.canActivate,
    ).toBeUndefined();
    const selected = routes[0]
      .children!.filter((route) => ['account', 'settings'].includes(route.path!))
      .map((route) =>
        route.redirectTo
          ? route
          : {
              ...route,
              loadComponent: undefined,
              component: RouteDestination,
              canActivate: undefined,
              canMatch: undefined,
            },
      );
    TestBed.configureTestingModule({ providers: [provideRouter(selected)] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(
      '/account?returnUrl=%2Fplans#steam-code=' + 'a'.repeat(43),
      RouteDestination,
    );
    expect(TestBed.inject(Router).url).toBe(
      '/settings?returnUrl=%2Fplans#steam-code=' + 'a'.repeat(43),
    );
  });

  it('warms only the public production catalog after the private route guard', () => {
    const route = routes[0].children?.find((candidate) => candidate.path === 'recommendations');
    expect(route?.canActivate?.length).toBeGreaterThan(0);
    expect(route?.resolve?.['productionCatalog']).toBe(recommendationsRouteResolver);
  });

  it('protects the tutorial editor and serves it privately without indexing', () => {
    const route = routes[0].children?.find((candidate) => candidate.path === 'tutorials/manage');
    expect(route?.canActivate?.length).toBeGreaterThan(0);
    expect(route?.data).toMatchObject({ private: true, noindex: true });
    const serverRoute = serverRoutes.find((candidate) => candidate.path === 'tutorials/manage');
    expect(serverRoute?.renderMode).toBe(RenderMode.Client);
    expect(serverRoute?.headers).toMatchObject({
      'Cache-Control': 'private,no-store',
      'X-Robots-Tag': 'noindex,nofollow',
    });
  });

  it('keeps personal data routes client-rendered and non-cacheable', () => {
    for (const path of [
      'family',
      'shopping',
      'plans',
      'lifeskills',
      'settings',
      'recommendations',
      'tutorials/manage',
    ]) {
      const route = serverRoutes.find((candidate) => candidate.path === path);
      expect(route?.renderMode).toBe(RenderMode.Client);
      expect(route?.headers).toMatchObject({
        'Cache-Control': 'private,no-store',
        'X-Robots-Tag': 'noindex,nofollow',
      });
    }
  });
});
