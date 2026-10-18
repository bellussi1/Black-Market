import { inject, Injector } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { defer, type Observable, switchMap } from 'rxjs';

import type { PublicRouteWarmResult } from './public-route-data';

/** Load catalogue/market warming only for a requested route or explicit pointer/keyboard intent. */
export function warmPublicPath(
  injector: Injector,
  path: string,
): Observable<PublicRouteWarmResult> {
  return defer(() => import('./public-route-data')).pipe(
    switchMap(({ PublicRouteData }) => injector.get(PublicRouteData).prefetchPath(path)),
  );
}

export const marketRouteResolver: ResolveFn<PublicRouteWarmResult> = () =>
  warmPublicPath(inject(Injector), '/market');

export const recommendationsRouteResolver: ResolveFn<PublicRouteWarmResult> = () =>
  warmPublicPath(inject(Injector), '/recommendations');

export const recipesRouteResolver: ResolveFn<PublicRouteWarmResult> = (route) => {
  const id = route.paramMap.get('id') ?? route.queryParamMap.get('item');
  const key = route.paramMap.get('key');
  const path = key ? `/recipes/${key}` : id ? `/recipes/items/${id}` : '/recipes';
  return warmPublicPath(inject(Injector), path);
};
