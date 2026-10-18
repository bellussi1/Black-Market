import { signal } from '@angular/core';
import { DeferBlockBehavior, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { IdentityService } from '../core/identity.service';
import { LoginIntentService } from '../core/login-intent.service';
import { PrivacyService } from '../core/privacy.service';
import { RegionPreferences } from '../core/region-preferences';
import { WorkspaceStore } from '../core/workspace-store';
import { renderComponent, useMemoryStorage } from '../testing/test-setup';
import { WorkspaceLayout } from './workspace-layout';

describe('workspace navigation', () => {
  useMemoryStorage();
  beforeEach(() => {
    TestBed.configureTestingModule({ deferBlockBehavior: DeferBlockBehavior.Playthrough });
  });
  it('loads the login modal only on request and reopens the same instance', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      {
        provide: IdentityService,
        useValue: { ...identity(), enabled: signal(false), error: signal('') },
      },
    ]);
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-login-dialog')).toBeNull();
    const intent = TestBed.inject(LoginIntentService);
    intent.request('/plans');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const modal = element.querySelector('app-login-dialog');
    expect(modal).not.toBeNull();
    intent.close();
    fixture.detectChanges();
    intent.request('/storage');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('app-login-dialog')).toBe(modal);
    expect(intent.returnUrl()).toBe('/storage');
  });

  it('loads privacy controls when an initial consent choice is needed', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
    ]);
    const element = fixture.nativeElement as HTMLElement;
    const privacy = TestBed.inject(PrivacyService);

    expect(element.querySelector('app-privacy-controls')).toBeNull();

    privacy.optionalAvailable.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(element.querySelector('app-privacy-controls')).not.toBeNull();
  });

  it('loads privacy controls when the user opens preferences from the footer', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
    ]);
    const element = fixture.nativeElement as HTMLElement;
    const privacy = TestBed.inject(PrivacyService);
    expect(element.querySelector('app-privacy-controls')).toBeNull();

    fixture.detectChanges();
    const preferences = element.querySelector<HTMLButtonElement>('app-platform-footer button')!;
    preferences.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(privacy.open()).toBe(true);
    expect(element.querySelector('app-privacy-controls')).not.toBeNull();
  });

  it('consumes a public redirect intent, removes the URL parameter and cancels without navigation', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      {
        provide: IdentityService,
        useValue: { ...identity(), ready: signal(true), enabled: signal(false), error: signal('') },
      },
    ]);
    const router = TestBed.inject(Router);
    await router.navigateByUrl('/?loginReturnUrl=%2Fplans%3Ftab%3Dactive%23first');
    await fixture.whenStable();
    const intent = TestBed.inject(LoginIntentService);
    expect(router.url).toBe('/');
    expect(intent.returnUrl()).toBe('/plans?tab=active#first');
    expect(intent.opened()).toBe(true);
    const dialog = (fixture.nativeElement as HTMLElement).querySelector('dialog')!;
    dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
    await fixture.whenStable();
    expect(intent.opened()).toBe(false);
    expect(intent.returnUrl()).toBeNull();
    expect(router.url).toBe('/');
  });

  function identity(authenticated = false) {
    return {
      initialize: async () => undefined,
      authenticated: signal(authenticated),
      ready: signal(true),
    };
  }

  it('skips to the current page content without losing its URL or filters', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
    ]);
    const router = TestBed.inject(Router);
    router.resetConfig([{ path: 'recipes', children: [] }]);
    await router.navigateByUrl('/recipes?q=Manos#details');
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const skip = element.querySelector<HTMLAnchorElement>('.skip-link')!;
    expect(skip.getAttribute('href')).toBe('/recipes?q=Manos#workspace-main');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    skip.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(element.querySelector('#workspace-main'));
    expect(router.url).toBe('/recipes?q=Manos#details');
  });

  it('focuses the deferred global search and restores its trigger on Escape', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
    ]);
    const element: HTMLElement = fixture.nativeElement;
    const trigger = element.querySelector<HTMLButtonElement>('.global-search-toggle')!;
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const search = element.querySelector<HTMLInputElement>('#global-item-search input')!;
    expect(search).not.toBeNull();
    expect(document.activeElement).toBe(search);
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges();
    expect(element.querySelector('#global-item-search')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes mobile navigation on Escape and returns focus to Menu', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
    ]);
    const element: HTMLElement = fixture.nativeElement;
    const trigger = element.querySelector<HTMLButtonElement>('.mobile-nav-toggle')!;
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('can cancel global search before its deferred picker is rendered', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
    ]);
    const element: HTMLElement = fixture.nativeElement;
    const trigger = element.querySelector<HTMLButtonElement>('.global-search-toggle')!;
    trigger.focus();
    trigger.click();
    document.activeElement!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.quickSearchOpen()).toBe(false);
    expect(element.querySelector('#global-item-search')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('hides family data immediately when authentication is lost and preserves login intent', async () => {
    const session = { ...identity(true), enabled: signal(false), error: signal('') };
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: session },
    ]);
    const router = TestBed.inject(Router);
    router.resetConfig([
      { path: 'family', children: [] },
      { path: '', children: [] },
    ]);
    await router.navigateByUrl('/family?tab=equipment#gear');
    fixture.detectChanges();
    expect(fixture.componentInstance.canShowPage()).toBe(true);
    session.authenticated.set(false);
    expect(fixture.componentInstance.canShowPage()).toBe(false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.url).toBe('/');
    expect(TestBed.inject(LoginIntentService).returnUrl()).toBe('/family?tab=equipment#gear');
  });

  it('uses the favicon emblem logo, preserves the separate wordmark, and never repeats sidebar icons', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
    ]);
    const brand = (fixture.nativeElement as HTMLElement).querySelector('.brand')!;
    const wordmark = brand.querySelector('.brand-wordmark')!;

    expect(brand.querySelector('.brand-emblem')).not.toBeNull();
    expect(brand.querySelector('.brand-symbol')?.getAttribute('src')).toBe('/favicon.svg');
    expect(brand.querySelector('.brand-symbol')?.getAttribute('alt')).toBe('');
    expect(brand.querySelector('.brand-symbol')?.getAttribute('aria-hidden')).toBe('true');
    expect(wordmark.children[0].textContent?.trim()).toBe('BLACK');
    expect(wordmark.children[1].textContent?.trim()).toBe('MARKET');
    expect(brand.querySelector('.brand-market')?.textContent?.trim()).toBe('MARKET');

    const layout = fixture.componentInstance;
    const allIconNames = [
      ...layout.primaryLinks().map((l) => l.icon),
      ...layout.navGroups().map((g) => g.icon),
      ...layout.navGroups().flatMap((g) => g.links.map((l) => l.icon)),
    ].filter(Boolean);
    expect(new Set(allIconNames).size).toBe(allIconNames.length);
  });

  it('keeps the non-affiliation disclosure beside the game name in the shell', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
    ]);
    const affiliation = (fixture.nativeElement as HTMLElement).querySelector('.sidebar-foot small');

    expect(affiliation?.textContent?.replace(/\s+/g, ' ').trim()).toMatch(
      /BLACK DESERT ONLINE.*SEM AFILIAÇÃO COM A PEARL ABYSS/i,
    );
  });

  it('offers one destination for authenticated personal areas and public market tools', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity(true) },
    ]);
    const nav = (fixture.nativeElement as HTMLElement).querySelector('#workspace-navigation')!;
    const paths = [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href'));
    expect(paths.filter((path) => path === '/storage')).toHaveLength(1);
    expect(paths.filter((path) => path === '/scans')).toHaveLength(1);
    expect(paths.filter((path) => path === '/recommendations')).toHaveLength(1);
    expect(paths.filter((path) => path === '/family')).toHaveLength(1);
    expect(paths.filter((path) => path === '/shopping')).toHaveLength(1);
    expect(paths.filter((path) => path === '/plans')).toHaveLength(1);
    expect(paths.filter((path) => path === '/lifeskills')).toHaveLength(1);
    expect(paths.filter((path) => path === '/settings')).toHaveLength(1);
    expect(paths.filter((path) => path === '/market')).toHaveLength(1);
    expect(paths.filter((path) => path === '/crafting')).toHaveLength(1);
    expect(paths.filter((path) => path === '/roadmap')).toHaveLength(1);
    for (const path of ['/inventory', '/profile', '/gear', '/database/items']) {
      expect(paths).not.toContain(path);
    }
    expect(nav.textContent).toContain('Armazém');
    expect(nav.textContent).toContain('Família');
    expect(nav.textContent).toContain('Meus planos');
    expect(nav.textContent).toContain('Configurações e backup');
    expect(nav.textContent).toContain('Calcular produção');
    expect(nav.textContent).toContain('Roadmap');
  });

  it('keeps six Life Skills actions visible and groups secondary destinations', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity(true) },
    ]);
    const nav = (fixture.nativeElement as HTMLElement).querySelector('#workspace-navigation')!;
    const primaryPaths = [...nav.querySelectorAll('.primary-links a')].map((link) =>
      link.getAttribute('href'),
    );
    const groups = [...nav.querySelectorAll('.nav-group')];
    const groupTitles = groups.map((group) =>
      group.querySelector('summary')?.textContent?.replace(/\s+/g, ' ').trim(),
    );

    expect(primaryPaths).toEqual([
      '/',
      '/recommendations',
      '/lifeskills',
      '/market',
      '/recipes',
      '/crafting',
    ]);
    expect(groupTitles).toEqual(['Materiais e planos', 'Guias e conta']);
    expect(
      groups.flatMap((group) =>
        [...group.querySelectorAll('a')].map((link) => link.getAttribute('href')),
      ),
    ).toEqual(['/storage', '/scans', '/family', '/shopping', '/plans', '/settings', '/roadmap']);
  });

  it('shows login-required destinations to signed-out visitors', async () => {
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
    ]);
    const nav = (fixture.nativeElement as HTMLElement).querySelector('#workspace-navigation')!;
    const links = [...nav.querySelectorAll('a')].map((link) => link.getAttribute('href'));

    for (const path of [
      '/scans',
      '/storage',
      '/recommendations',
      '/family',
      '/shopping',
      '/plans',
      '/settings',
    ])
      expect(links.filter((href) => href === path)).toHaveLength(1);
  });

  it('updates the selected market region from the topbar control', async () => {
    const setRegion = vi.fn();
    const preferences = {
      region: signal('NA'),
      message: signal(''),
      setRegion,
    };
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: identity() },
      { provide: RegionPreferences, useValue: preferences },
    ]);
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>(
      '#market-region',
    )!;
    const nextRegion = [...select.options]
      .map((option) => option.value)
      .find((value) => value !== 'NA');
    expect(nextRegion).toBeDefined();

    select.value = nextRegion!;
    select.dispatchEvent(new Event('change'));

    expect(setRegion).toHaveBeenCalledWith(nextRegion);
  });

  it('does not inject the lazy workspace store after the layout is destroyed', async () => {
    const session = identity();
    const storeFactory = vi.fn(() => ({}));
    const fixture = await renderComponent(WorkspaceLayout, {}, [
      { provide: IdentityService, useValue: session },
      { provide: WorkspaceStore, useFactory: storeFactory },
    ]);

    session.authenticated.set(true);
    fixture.detectChanges();
    fixture.destroy();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(storeFactory).not.toHaveBeenCalled();
  });
});
