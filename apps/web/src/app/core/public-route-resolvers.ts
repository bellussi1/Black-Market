import { isPlatformServer } from '@angular/common';
import { inject, Injector, PLATFORM_ID } from '@angular/core';
import type { ResolveFn } from '@angular/router';
import { defer, type Observable, of, switchMap } from 'rxjs';

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

/** Browser pages own loading/error states; only SSR needs data before activation. */
function resolvePublicPath(path: string): Observable<PublicRouteWarmResult> {
  return isPlatformServer(inject(PLATFORM_ID))
    ? warmPublicPath(inject(Injector), path)
    : of({ status: 'ignored' });
}

export const marketRouteResolver: ResolveFn<PublicRouteWarmResult> = () =>
  resolvePublicPath('/market');

export const recommendationsRouteResolver: ResolveFn<PublicRouteWarmResult> = () =>
  resolvePublicPath('/recommendations');

export const recipesRouteResolver: ResolveFn<PublicRouteWarmResult> = (route) => {
  const id = route.paramMap.get('id') ?? route.queryParamMap.get('item');
  const key = route.paramMap.get('key');
  const path = key ? `/recipes/${key}` : id ? `/recipes/items/${id}` : '/recipes';
  return resolvePublicPath(path);
};
