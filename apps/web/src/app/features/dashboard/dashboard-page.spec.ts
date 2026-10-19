import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import type { RoadmapEntry } from '@bdo/shared';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { RegionPreferences } from '../../core/region-preferences';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { renderComponent } from '../../testing/test-setup';
import { DashboardPage } from './dashboard-page';

const roadmapFixture: RoadmapEntry[] = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    slug: 'context-flow',
    kind: 'flow',
    sortOrder: 0,
    title: 'Seu contexto conectado',
    summary: 'Reúna cotações e estoque para começar.',
    description: 'Conecte o que você tem antes de decidir o próximo lote.',
    statusLabel: 'Ativo',
    icon: 'lucideBoxes',
    featured: true,
    links: [
      { label: 'Consultar mercado', path: '/market' },
      { label: 'Explorar receitas', path: '/recipes' },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    slug: 'unfeatured-pillar',
    kind: 'pillar',
    sortOrder: 1,
    title: 'Catálogo secundário',
    summary: 'Não destacado na Home.',
    description: 'Fica apenas no Roadmap completo.',
    statusLabel: 'Disponível',
    icon: 'lucideStore',
    featured: false,
    links: [{ label: 'Abrir catálogo', path: '/recipes' }],
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    slug: 'what-to-do',
    kind: 'pillar',
    sortOrder: 2,
    title: 'O que fazer agora?',
    summary: 'Compare atividades por prata por hora.',
    description: 'Avalie produção, compra e estoque em um só fluxo.',
    statusLabel: 'Em evolução',
    icon: 'lucideCompass',
    featured: true,
    links: [{ label: 'Abrir receitas', path: '/recipes' }],
  },
];

describe('DashboardPage', () => {
  it('uses the shared page container and keeps a clear primary heading and public entry actions', async () => {
    const fixture = await renderComponent(DashboardPage);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.home-page.tool-page')).not.toBeNull();
    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(element.querySelector('[data-home-professions-link]')).not.toBeNull();
    expect(element.querySelector('.home-search app-catalog-item-picker')).not.toBeNull();
  });

  it('avoids an unqualified game-name claim in the home kicker', async () => {
    const fixture = await renderComponent(DashboardPage);
    const kicker = fixture.nativeElement.querySelector('.tool-kicker')?.textContent ?? '';

    expect(kicker).toContain('BLACK MARKET');
    expect(kicker).not.toContain('BLACK DESERT ONLINE');
  });

  it('registers the home tutorial without adding a page control', async () => {
    const fixture = await renderComponent(DashboardPage);
    const surface = fixture.debugElement.query(By.directive(TutorialSurfaceDirective));

    expect(surface?.injector.get(TutorialSurfaceDirective).appTutorialSurface()).toBe('home');
    expect(fixture.nativeElement.querySelector('[data-tour="home.main-actions"]')).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-tour="home.lifeskill-entry"]'),
    ).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tutorial-launcher')).toBeNull();
  });

  it('prioritizes public profession access and item search before the roadmap', async () => {
    const fixture = await renderComponent(DashboardPage, {}, [
      {
        provide: IdentityService,
        useValue: {
          authenticated: signal(false),
          initialize: vi.fn().mockResolvedValue(undefined),
        },
      },
    ]);
    const element = fixture.nativeElement as HTMLElement;
    const entry = element.querySelector('.home-entry');
    const professionLink = element.querySelector<HTMLAnchorElement>('[data-home-professions-link]');
    const itemSearch = element.querySelector('.home-search');
    const focus = element.querySelector('.home-focus-section');

    expect(entry).not.toBeNull();
    expect(professionLink?.getAttribute('href')).toBe('/lifeskills');
    expect(entry?.contains(itemSearch)).toBe(true);
    expect(itemSearch?.querySelector('app-catalog-item-picker select')).toBeNull();
    expect(
      Boolean(itemSearch!.compareDocumentPosition(focus!) & Node.DOCUMENT_POSITION_FOLLOWING),
    ).toBe(true);
  });

  it('shows a roadmap action for a focus without links and keeps public actions in mixed focuses', async () => {
    const fixture = await renderComponent(DashboardPage, {}, [
      {
        provide: IdentityService,
        useValue: {
          authenticated: signal(false),
          initialize: vi.fn().mockResolvedValue(undefined),
        },
      },
    ]);
    const http = TestBed.inject(HttpTestingController);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando focos',
    );
    expect(fixture.nativeElement.querySelector('.home-focus-loading')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.home-focus-skeleton')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.home-focus-skeleton')).toHaveLength(2);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [
          { ...roadmapFixture[0]!, links: [] },
          {
            ...roadmapFixture[2]!,
            links: [
              { label: 'Privado', path: '/recommendations' },
              { label: 'Público', path: '/market' },
            ],
          },
        ],
        updatedAt: null,
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.home-focus-section.panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.home-focus-heading.panel-heading')).not.toBeNull();
    const cards = fixture.nativeElement.querySelectorAll('.home-focus-card');
    expect(cards[0].querySelectorAll('a')).toHaveLength(1);
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe('/roadmap');
    expect(cards[1].querySelectorAll('a')).toHaveLength(1);
    expect(cards[1].querySelector('a')?.getAttribute('href')).toBe('/market');
    expect(cards[1].querySelector('a')?.textContent?.trim()).toBe('Público');
    http.verify();
  });

  it('rendersEveryFeaturedEntryInGlobalOrder', async () => {
    const identity = {
      authenticated: signal(false),
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    const fixture = await renderComponent(DashboardPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [roadmapFixture[2]!, roadmapFixture[1]!, roadmapFixture[0]!],
        updatedAt: '2026-10-15T12:00:00.000Z',
      });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.flow-card')).toBeNull();
    expect(element.querySelector('.journey-grid')).toBeNull();
    expect(element.querySelector('details.more-tools')).toBeNull();

    const focusCards = Array.from(element.querySelectorAll<HTMLElement>('.home-focus-card'));
    expect(focusCards).toHaveLength(2);
    expect(focusCards.map((card) => card.querySelector('h3')?.textContent?.trim())).toEqual([
      'Seu contexto conectado',
      'O que fazer agora?',
    ]);
    expect(
      focusCards.map((card) => card.querySelector('.home-focus-kind')?.textContent?.trim()),
    ).toEqual(['Fase', 'Pilar']);
    expect(
      focusCards.map((card) => card.querySelector('.home-focus-status')?.textContent?.trim()),
    ).toEqual(['Ativo', 'Em evolução']);
    expect(focusCards[0]?.textContent).toContain('Reúna cotações e estoque para começar.');
    expect(focusCards[0]?.textContent).toContain(
      'Conecte o que você tem antes de decidir o próximo lote.',
    );
    const firstCardLinks = Array.from(
      focusCards[0]!.querySelectorAll<HTMLAnchorElement>('.home-focus-actions a'),
    ).map((anchor) => ({
      text: anchor.textContent?.trim(),
      href: anchor.getAttribute('href'),
    }));
    expect(firstCardLinks).toEqual([
      { text: 'Consultar mercado', href: '/market' },
      { text: 'Explorar receitas', href: '/recipes' },
    ]);
    expect(element.textContent).not.toContain('Catálogo secundário');
    http.verify();
  });

  it('doesNotPromoteUnfeaturedEntriesAndShowsRoadmapFallback', async () => {
    const identity = {
      authenticated: signal(false),
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    const fixture = await renderComponent(DashboardPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [roadmapFixture[1]!],
        updatedAt: '2026-10-15T12:00:00.000Z',
      });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.home-focus-card')).toHaveLength(0);
    const emptyState = element.querySelector('.home-focus-empty');
    expect(emptyState).not.toBeNull();
    expect(emptyState?.getAttribute('role')).toBe('status');
    expect(emptyState?.querySelector('a[href="/roadmap"]')).not.toBeNull();
    expect(element.querySelectorAll('.home-focus-section a[href="/roadmap"]')).toHaveLength(1);
    expect(element.textContent).not.toContain('Catálogo secundário');
    http.verify();
  });

  it('preservesReturnTargetsForProtectedFocusLinksUntilIdentityInitializationCompletes', async () => {
    let resolveInit!: () => void;
    const authenticated = signal(false);
    const identity = {
      authenticated,
      initialize: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveInit = resolve;
          }),
      ),
    };
    const protectedEntries: RoadmapEntry[] = [
      {
        ...roadmapFixture[0]!,
        id: '00000000-0000-4000-8000-000000000210',
        slug: 'rec-focus',
        sortOrder: 0,
        title: 'Recomendações de prata',
        featured: true,
        links: [{ label: 'Ver recomendações', path: '/recommendations' }],
      },
      {
        ...roadmapFixture[2]!,
        id: '00000000-0000-4000-8000-000000000211',
        slug: 'family-focus',
        sortOrder: 1,
        title: 'Gestão da família',
        featured: true,
        links: [{ label: 'Abrir família', path: '/family' }],
      },
    ];

    const fixture = await renderComponent(DashboardPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: protectedEntries,
        updatedAt: '2026-10-15T12:00:00.000Z',
      });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('a[href="/recommendations"]')).not.toBeNull();
    expect(element.querySelector('a[href="/family"]')).not.toBeNull();

    const focusCards = Array.from(element.querySelectorAll<HTMLElement>('.home-focus-card'));
    expect(focusCards).toHaveLength(2);
    const firstAction = focusCards[0]?.querySelector<HTMLAnchorElement>('.home-focus-actions a');
    const secondAction = focusCards[1]?.querySelector<HTMLAnchorElement>('.home-focus-actions a');
    expect(firstAction?.textContent?.trim()).toBe('Entrar para acessar');
    expect(firstAction?.getAttribute('href')).toBe('/recommendations');
    expect(secondAction?.textContent?.trim()).toBe('Entrar para acessar');
    expect(secondAction?.getAttribute('href')).toBe('/family');

    authenticated.set(true);
    resolveInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(element.querySelector('a[href="/recommendations"]')?.textContent?.trim()).toBe(
      'Ver recomendações',
    );
    expect(element.querySelector('a[href="/family"]')?.textContent?.trim()).toBe('Abrir família');
    http.verify();
  });

  it('keepsSearchAndContinueSectionsAvailableWhenRoadmapFailsAndCanRetry', async () => {
    const identity = {
      authenticated: signal(true),
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    const fixture = await renderComponent(DashboardPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const preferences = TestBed.inject(RegionPreferences);
    preferences.setSummary({
      schemaVersion: 1,
      region: preferences.region(),
      quotes: [],
      inventory: [{ region: preferences.region() }],
      recipes: [],
      presets: [],
    });
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({ message: 'indisponível' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.home-focus-error[role="alert"]')).not.toBeNull();
    expect(element.querySelectorAll('.home-focus-card')).toHaveLength(0);
    expect(element.querySelector('.home-search')).not.toBeNull();
    expect(element.querySelector('.continue-section')).not.toBeNull();
    expect(element.querySelector('.continue-section a[href="/storage"]')).not.toBeNull();

    element.querySelector<HTMLButtonElement>('.home-focus-retry')?.click();
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [roadmapFixture[0]!],
        updatedAt: '2026-10-15T12:00:00.000Z',
      });
    fixture.detectChanges();

    expect(element.querySelector('.home-focus-error')).toBeNull();
    expect(element.querySelectorAll('.home-focus-card')).toHaveLength(1);
    http.verify();
  });

  it('displays value proposition pillars and opens the login dialog when clicking the hero paywall CTA', async () => {
    const identity = {
      authenticated: signal(false),
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    const fixture = await renderComponent(DashboardPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({ entries: [], updatedAt: null });
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.hero-value-list li')).toHaveLength(3);
    const paywallBtn = element.querySelector<HTMLButtonElement>('.hero-paywall-cta');
    expect(paywallBtn).not.toBeNull();
    paywallBtn?.click();
    expect(fixture.componentInstance.loginIntent.opened()).toBe(true);
    http.verify();
  });
});
