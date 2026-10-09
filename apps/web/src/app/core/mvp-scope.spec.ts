import { TestBed } from '@angular/core/testing';
import { Router, UrlSegment } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { isMvpPathEnabled, mvpRouteGuard } from './mvp-scope';
describe('Screenshot MVP scope', () => {
  it('allows core journeys and required catalog, legal and recovery routes', () => {
    for (const path of [
      '/',
      '/scans',
      '/market',
      '/inventory',
      '/storage',
      '/gear',
      '/database/items/212',
      '/settings',
      '/privacidade',
    ])
      expect(isMvpPathEnabled(path)).toBe(true);
  });
  it('blocks direct access to suspended tools as well as navigation links', () => {
    for (const path of [
      '/demo',
      '/world',
      '/crafting',
      '/recipes/a',
      '/recommendations',
      '/lifeskills',
      '/account',
    ])
      expect(isMvpPathEnabled(path)).toBe(false);
    const tree = { redirect: '/' };
    TestBed.configureTestingModule({
      providers: [{ provide: Router, useValue: { createUrlTree: () => tree } }],
    });
    expect(
      TestBed.runInInjectionContext(() =>
        mvpRouteGuard({}, [new UrlSegment('world', {})], {} as Parameters<typeof mvpRouteGuard>[2]),
      ),
    ).toBe(tree);
  });
});
