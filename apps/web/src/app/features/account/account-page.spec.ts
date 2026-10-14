import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
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

function createPage(identity = createIdentity(), hash = '') {
  let scrubbed = false;
  const browser = window;
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
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      { provide: IdentityService, useValue: identity },
      { provide: WorkspaceStore, useValue: workspace },
      { provide: AnalyticsService, useValue: { capture: vi.fn() } },
    ],
  });
  const fixture: ComponentFixture<AccountPage> = TestBed.createComponent(AccountPage);
  return { fixture, identity, browser, wasScrubbed: () => scrubbed };
}

describe('AccountPage social sign-in', () => {
  afterEach(() => vi.restoreAllMocks());

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
});
