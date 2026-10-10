import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { describe, expect, it } from 'vitest';

import { routes } from './app.routes';

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
});
