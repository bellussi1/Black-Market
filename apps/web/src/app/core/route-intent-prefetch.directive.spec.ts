import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, RouterLink } from '@angular/router';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { PublicRouteData } from './public-route-data';
import { RouteIntentPrefetchDirective } from './route-intent-prefetch.directive';

@Component({
  standalone: true,
  imports: [RouterLink, RouteIntentPrefetchDirective],
  template: '<a routerLink="/market" [appRouteIntentPrefetch]="\'/market\'">Mercado</a>',
})
class PrefetchHost {}

@Component({
  standalone: true,
  imports: [RouterLink, RouteIntentPrefetchDirective],
  template: '<a routerLink="/market" appRouteIntentPrefetch>Mercado</a>',
})
class EmptyPrefetchHost {}

describe('Route intent prefetch directive', () => {
  it('does not instantiate catalogue warming before user intent or after destruction', async () => {
    const factory = vi.fn(() => ({ prefetchPath: () => of({ status: 'ready' }) }));
    TestBed.configureTestingModule({
      imports: [PrefetchHost],
      providers: [provideRouter([]), { provide: PublicRouteData, useFactory: factory }],
    });
    const fixture = TestBed.createComponent(PrefetchHost);
    fixture.detectChanges();
    expect(factory).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('a').dispatchEvent(new PointerEvent('pointerenter'));
    fixture.destroy();
    await import('./public-route-data');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(factory).not.toHaveBeenCalled();
  });

  it('warms the matching public route on pointer intent and keyboard focus', async () => {
    const prefetchPath = vi.fn(() => of({ status: 'ready' as const }));
    TestBed.configureTestingModule({
      imports: [PrefetchHost],
      providers: [provideRouter([]), { provide: PublicRouteData, useValue: { prefetchPath } }],
    });
    const fixture = TestBed.createComponent(PrefetchHost);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;

    link.dispatchEvent(new PointerEvent('pointerenter'));
    link.dispatchEvent(new FocusEvent('focusin'));

    await vi.waitFor(() => expect(prefetchPath).toHaveBeenCalledTimes(2));
    expect(prefetchPath).toHaveBeenNthCalledWith(1, '/market');
    expect(prefetchPath).toHaveBeenNthCalledWith(2, '/market');
    fixture.destroy();
  });

  it('does not call the route service when the prefetch URL is empty', () => {
    const prefetchPath = vi.fn(() => of({ status: 'ready' as const }));
    TestBed.configureTestingModule({
      imports: [EmptyPrefetchHost],
      providers: [provideRouter([]), { provide: PublicRouteData, useValue: { prefetchPath } }],
    });
    const fixture = TestBed.createComponent(EmptyPrefetchHost);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('a').dispatchEvent(new PointerEvent('pointerenter'));
    expect(prefetchPath).not.toHaveBeenCalled();
    fixture.destroy();
  });
});
