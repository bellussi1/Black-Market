import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { IdentityService } from '../../core/identity.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { AccountPage } from './account-page';

function createIdentity(overrides: Record<string, unknown> = {}) {
  return {
    enabled: signal(true),
    googleEnabled: signal(true),
    steamEnabled: signal(true),
    ready: signal(true),
    authenticated: signal(false),
    displayName: signal(''),
    email: signal(''),
    userId: signal(''),
    providers: signal<string[]>([]),
    canManageRoadmap: signal(false),
    initialize: vi.fn(async () => undefined),
    google: vi.fn(async () => undefined),
    steam: vi.fn(async () => undefined),
    linkGoogle: vi.fn(async () => undefined),
    linkSteam: vi.fn(async () => undefined),
    exchangeSteamCode: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    token: vi.fn(async () => 'firebase-id-token'),
    ...overrides,
  };
}

function createPage(identity = createIdentity(), hash = '', returnUrl: string | null = null) {
  let scrubbed = false;
  const browser = window;
  window.sessionStorage.removeItem('black-market.auth.return-url.v1');
  window.history.replaceState({}, '', window.location.pathname + window.location.search + hash);
  const originalReplace = window.history.replaceState.bind(window.history);
  vi.spyOn(window.history, 'replaceState').mockImplementation((state, title, url) => {
    scrubbed = true;
    originalReplace(state, title, url);
  });
  const workspace = {
    data: signal({ inventory: [], characters: [], personalPlans: [], sessions: [] }),
    demoActive: signal(false),
    replace: vi.fn(() => true),
  };
  const router = { navigateByUrl: vi.fn(async () => true) };
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: Router, useValue: router },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(returnUrl ? { returnUrl } : {}) },
        },
      },
      { provide: IdentityService, useValue: identity },
      { provide: WorkspaceStore, useValue: workspace },
      { provide: AnalyticsService, useValue: { capture: vi.fn() } },
    ],
  });
  const fixture: ComponentFixture<AccountPage> = TestBed.createComponent(AccountPage);
  return { fixture, identity, browser, router, wasScrubbed: () => scrubbed };
}

describe('AccountPage social sign-in', () => {
  afterEach(() => {
    window.sessionStorage.removeItem('black-market.auth.return-url.v1');
    vi.restoreAllMocks();
  });

  it('offers only Google and Steam when signed out', async () => {
    const { fixture } = createPage();

    await fixture.whenStable();

    const page = fixture.nativeElement as HTMLElement;
    const labels = [...page.querySelectorAll('button')].map((button) => button.textContent?.trim());
    expect(labels).toContain('Entrar com Google');
    expect(labels).toContain('Entrar com Steam');
    expect(page.querySelector('input[type="email"]')).toBeNull();
    expect(page.textContent).not.toContain('Receber link de acesso');
  });

  it('reserves the account panel while identity is being resolved', () => {
    const identity = createIdentity({ ready: signal(false) });
    const { fixture } = createPage(identity);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[data-account-loading]')?.getAttribute('aria-busy')).toBe('true');
    expect(page.querySelectorAll('.account-skeleton-line').length).toBeGreaterThanOrEqual(3);
    expect(page.querySelector('[data-account-loading] [role="status"]')?.textContent).toContain(
      'Consultando sua conta',
    );
  });

  it('announces social sign-in while an account action is pending', async () => {
    let finishSignIn!: () => void;
    const identity = createIdentity({
      google: vi.fn(() => new Promise<void>((resolve) => (finishSignIn = resolve))),
    });
    const { fixture } = createPage(identity);
    await fixture.whenStable();

    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.includes('Entrar com Google'),
    )!;
    button.click();
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[data-account-actions]')?.getAttribute('aria-busy')).toBe('true');
    expect(page.querySelector('[data-account-action-status]')?.textContent).toContain(
      'Operação em andamento',
    );

    finishSignIn();
    await fixture.whenStable();
  });

  it('reserves the cloud sync summary while saved account data is being read', async () => {
    const identity = createIdentity({
      authenticated: signal(true),
      displayName: signal('Aventureira'),
    });
    const { fixture } = createPage(identity);
    await fixture.whenStable();
    fixture.componentInstance.loadingSavedData.set(true);
    fixture.detectChanges();

    const page = fixture.nativeElement as HTMLElement;
    const loading = page.querySelector('[data-account-sync-loading]');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.querySelector('[role="status"]')?.textContent).toContain('Consultando');
    expect(loading?.querySelectorAll('.account-skeleton-line').length).toBeGreaterThanOrEqual(3);
  });

  it('shows a signed-in Steam user without requiring an email', async () => {
    const identity = createIdentity({
      authenticated: signal(true),
      displayName: signal('AuroraVale'),
      userId: signal('steam:76561197960265728'),
      providers: signal(['steam']),
      email: signal(''),
    });
    const { fixture } = createPage(identity);

    await fixture.whenStable();

    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h2')?.textContent).toContain('AuroraVale');
    expect(page.textContent).toContain('Sair da conta');
    expect(page.querySelector('input[type="email"]')).toBeNull();
  });

  it('removes the Steam exchange fragment before exchanging the code', async () => {
    const identity = createIdentity();
    const { fixture, wasScrubbed } = createPage(identity, '#steam-code=' + 'c'.repeat(43));
    identity.exchangeSteamCode.mockImplementation(async () => {
      expect(wasScrubbed()).toBe(true);
    });

    await fixture.whenStable();

    expect(identity.exchangeSteamCode).toHaveBeenCalledWith('c'.repeat(43));
  });

  it.each([
    '/scans?tab=review#space-4',
    '/family?tab=equipment#gear',
    '/shopping?tab=materials#missing',
  ])('returns to the requested private route after Google sign-in: %s', async (returnUrl) => {
    const { fixture, router } = createPage(createIdentity(), '', returnUrl);
    await fixture.whenStable();

    const button = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (candidate) => candidate.textContent?.includes('Entrar com Google'),
    );
    button?.click();
    await fixture.whenStable();

    expect(router.navigateByUrl).toHaveBeenCalledWith(returnUrl, { replaceUrl: true });
  });

  it('explains that social login is required but unavailable for a gated route', async () => {
    const identity = createIdentity({ enabled: signal(false) });
    const { fixture } = createPage(identity, '', '/storage?tab=inventory');
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'O login social ainda não está configurado',
    );
  });
});
