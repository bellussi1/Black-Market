import { DestroyRef, Directive, HostListener, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PublicRouteData } from './public-route-data';

@Directive({
  selector: '[appRouteIntentPrefetch]',
  standalone: true,
})
export class RouteIntentPrefetchDirective {
  readonly routeUrl = input('', { alias: 'appRouteIntentPrefetch' });
  private readonly routeData = inject(PublicRouteData);
  private readonly destroyRef = inject(DestroyRef);

  @HostListener('pointerenter')
  onPointerEnter(): void {
    this.warmRoute();
  }

  @HostListener('focusin')
  onFocusIn(): void {
    this.warmRoute();
  }

  private warmRoute(): void {
    const url = this.routeUrl().trim();
    if (!url) return;
    this.routeData
      .prefetchPath(url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
}
