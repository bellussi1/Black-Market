import { inject } from '@angular/core';
import { type CanMatchFn, Router } from '@angular/router';
import { isMvpPathEnabled } from '@bdo/shared/mvp-scope';
export { isMvpPathEnabled, SCREENSHOT_MVP } from '@bdo/shared/mvp-scope';
export const mvpRouteGuard: CanMatchFn = (route, segments) =>
  route.path === '' ||
  route.path === '**' ||
  isMvpPathEnabled(route.path ?? segments[0]?.path ?? '') ||
  inject(Router).createUrlTree(['/']);
