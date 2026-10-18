import { DestroyRef, Directive, HostListener, inject, Injector, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { warmPublicPath } from './public-route-resolvers';

@Directive({
  selector: '[appRouteIntentPrefetch]',
  standalone: true,
})
export class RouteIntentPrefetchDirective {
  readonly routeUrl = input('', { alias: 'appRouteIntentPrefetch' });
  private readonly injector = inject(Injector);
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
    warmPublicPath(this.injector, url)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }
}
