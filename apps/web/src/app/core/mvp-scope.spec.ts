import { TestBed } from '@angular/core/testing';
import { Router, UrlSegment } from '@angular/router';
import { isMvpPathSuspended } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { isMvpPathEnabled, mvpRouteGuard } from './mvp-scope';
describe('Screenshot MVP scope', () => {
  it('allows core journeys and required catalog, legal and recovery routes', () => {
    for (const path of [
      '/',
      '/scans',
      '/market',
      '/recipes',
      '/recommendations',
      '/crafting',
      '/roadmap',
      '/tutorials/manage',
      '/recipes/items/5301',
      '/inventory',
      '/storage',
      '/storage?tab=inventory',
      '/family',
      '/family?tab=equipment',
      '/gear',
      '/database/items/212',
      '/settings',
      '/plans',
      '/lifeskills',
      '/account',
      '/privacidade',
    ])
      expect(isMvpPathEnabled(path)).toBe(true);
  });
  it('blocks direct access to suspended tools as well as navigation links', () => {
    for (const path of ['/demo', '/world', '/enhancement'])
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

  it('keeps the existing authenticated plans route available behind its auth guard', () => {
    expect(isMvpPathEnabled('/plans')).toBe(true);
    expect(isMvpPathSuspended('/plans')).toBe(false);
  });
});
