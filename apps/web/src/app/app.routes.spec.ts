import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RenderMode } from '@angular/ssr';
import { describe, expect, it } from 'vitest';

import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import { recommendationsRouteResolver } from './core/public-route-data';

@Component({ template: '' })
class RouteDestination {}

describe('Unified personal workspace routes', () => {
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
      'storage',
      'family',
      'shopping',
      'plans',
      'settings',
    ]);
    for (const route of routes[0].children ?? []) {
      expect((route.canActivate?.length ?? 0) > 0).toBe(sessionRoutes.has(route.path ?? ''));
    }
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
