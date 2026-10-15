import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { CatalogItem, RoadmapEntry } from '@bdo/shared';
import { NgIcon } from '@ng-icons/core';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { RegionPreferences } from '../../core/region-preferences';
import { renderComponent } from '../../testing/test-setup';
import { DashboardPage } from './dashboard-page';

function entry(overrides: Partial<RoadmapEntry> = {}): RoadmapEntry {
  return {
    id: 'focus',
    slug: 'focus',
    kind: 'flow',
    sortOrder: 0,
    title: 'Contexto da API',
    summary: 'Resumo da API',
    description: 'Descrição da API',
    statusLabel: 'Em evolução',
    icon: 'lucideBoxes',
    featured: true,
    links: [{ label: 'Receitas da API', path: '/recipes' }],
    ...overrides,
  };
}

function createIdentity() {
  return { authenticated: signal(false), initialize: vi.fn().mockResolvedValue(undefined) };
}

async function renderHome(identity = createIdentity()) {
  const fixture = await renderComponent(DashboardPage, {}, [
    { provide: IdentityService, useValue: identity },
  ]);
  const http = TestBed.inject(HttpTestingController);
  const request = http.expectOne((request) => request.url.endsWith('/api/v1/roadmap'));
  return { fixture, http, request };
}

describe('DashboardPage navigation', () => {
  it('rendersEveryFeaturedEntryInGlobalOrder', async () => {
    const { fixture, http, request } = await renderHome();
    const focuses = [
      entry({
        id: 'pillar',
        kind: 'pillar',
        sortOrder: 1,
        title: 'Mercado da API',
        icon: 'lucideStore',
        links: [
          { label: 'Cotação da API', path: '/market' },
          { label: 'Trilha da API', path: '/roadmap' },
          { label: 'Privado', path: '/storage' },
        ],
      }),
      entry({ id: 'flow', sortOrder: 2 }),
      entry({ id: 'empty', kind: 'pillar', sortOrder: 3, title: 'Foco sem links', links: [] }),
    ];
    request.flush({ entries: [focuses[2], focuses[1], focuses[0]], updatedAt: null });
    await fixture.whenStable();
    const cards: HTMLElement[] = [...fixture.nativeElement.querySelectorAll('.home-focus-card')];
    expect(cards.map((card) => card.querySelector('h3')?.textContent?.trim())).toEqual(
      focuses.map((focus) => focus.title),
    );
    for (const [index, card] of cards.entries()) {
      expect(card.textContent).toContain(focuses[index].summary);
      expect(card.textContent).toContain(focuses[index].description);
      expect(card.textContent).toContain(focuses[index].statusLabel);
      const icon = fixture.debugElement.queryAll(By.directive(NgIcon))[index]
        .componentInstance as NgIcon;
      expect(icon.name()).toBe(focuses[index].icon);
      expect(card.querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');
      expect(card.closest('a')).toBeNull();
    }
    expect(cards[0].querySelector('.focus-primary')?.getAttribute('href')).toBe('/market');
    expect(cards[0].querySelector('.focus-primary')?.textContent).toContain('Cotação da API');
    expect(cards[0].querySelector('.focus-secondary')?.textContent).toContain('Trilha da API');
    expect(cards[0].querySelector('a[href="/storage"]')).toBeNull();
    expect(cards[2].querySelectorAll('a')).toHaveLength(1);
    expect(cards[2].querySelector('a')?.getAttribute('href')).toBe('/roadmap');
    expect(
      fixture.nativeElement.querySelector('.flow-card, .journey-grid, details.more-tools'),
    ).toBeNull();
    http.verify();
  });

  it.each([{ entries: [] }, { entries: [entry({ featured: false })] }])(
    'doesNotPromoteUnfeaturedEntriesAndShowsRoadmapFallback',
    async ({ entries }) => {
      const { fixture, http, request } = await renderHome();
      request.flush({ entries, updatedAt: null });
      await fixture.whenStable();
      expect(fixture.nativeElement.querySelectorAll('.home-focus-card')).toHaveLength(0);
      expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
        'Nenhum foco',
      );
      expect(
        fixture.nativeElement.querySelector('.home-focuses a[href="/roadmap"]'),
      ).not.toBeNull();
      http.verify();
    },
  );

  it('filtersProtectedFocusLinksUntilIdentityInitializationCompletes', async () => {
    const identity = createIdentity();
    let finishInitialization!: () => void;
    identity.initialize.mockImplementation(
      () => new Promise<void>((resolve) => (finishInitialization = resolve)),
    );
    const { fixture, http, request } = await renderHome(identity);
    request.flush({
      entries: [
        entry({
          id: 'recommendations',
          links: [{ label: 'Recomendações', path: '/recommendations' }],
        }),
        entry({ id: 'family', sortOrder: 1, links: [{ label: 'Família', path: '/family' }] }),
      ],
      updatedAt: null,
    });
    await fixture.whenStable();
    expect(identity.initialize).toHaveBeenCalledOnce();
    expect(
      fixture.nativeElement.querySelector('a[href="/recommendations"], a[href="/family"]'),
    ).toBeNull();
    const logins: HTMLAnchorElement[] = [
      ...fixture.nativeElement.querySelectorAll('.home-focus-card a'),
    ];
    expect(logins.map((link) => link.textContent?.trim())).toEqual([
      'Entrar para acessar',
      'Entrar para acessar',
    ]);
    expect(logins[0].getAttribute('href')).toBe('/account?returnUrl=%2Frecommendations');
    expect(logins[1].getAttribute('href')).toBe('/account');
    identity.authenticated.set(true);
    finishInitialization();
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('a[href="/recommendations"]')?.textContent,
    ).toContain('Recomendações');
    expect(fixture.nativeElement.querySelector('a[href="/family"]')?.textContent).toContain(
      'Família',
    );
    expect(fixture.nativeElement.querySelector('a[href^="/account"]')).toBeNull();
    http.verify();
  });

  it('keepsSearchAndContinueSectionsAvailableWhenRoadmapFailsAndCanRetry', async () => {
    const { fixture, http, request } = await renderHome();
    TestBed.inject(RegionPreferences).setSummary({
      schemaVersion: 1,
      region: 'sa',
      quotes: [{ region: TestBed.inject(RegionPreferences).region() }],
      inventory: [],
      recipes: [],
      presets: [],
    });
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando focos',
    );
    request.flush({}, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-catalog-item-picker')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#continue-title')?.textContent).toContain(
      'Continue de onde parou',
    );
    expect(
      fixture.nativeElement.querySelector('.continue-section a[href="/market"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.home-focus-card')).toHaveLength(0);
    fixture.nativeElement.querySelector('.focus-retry').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({ entries: [entry()], updatedAt: null });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('.home-focus-card')).toHaveLength(1);
    expect(
      fixture.nativeElement.querySelector('.flow-card, .journey-grid, details.more-tools'),
    ).toBeNull();
    http.verify();
  });

  it('preservesContextualItemActionsAndSourceNote', async () => {
    const { fixture, http, request } = await renderHome();
    request.flush({ entries: [], updatedAt: null });
    fixture.componentInstance.selectedItem.set({ id: 42, name: 'Item selecionado' } as CatalogItem);
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.home-search a[href="/recipes/items/42"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.home-search a[href="/market?item=42"]'),
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('.home-search a[href="/market/items/42"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.source-note a[href="/contato"]')).not.toBeNull();
    http.verify();
  });
});
