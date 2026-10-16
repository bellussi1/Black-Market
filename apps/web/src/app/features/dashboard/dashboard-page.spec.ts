import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { RoadmapEntry } from '@bdo/shared';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { RegionPreferences } from '../../core/region-preferences';
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
    expect(element.querySelector('a[href="/recommendations"]')).toBeNull();
    expect(element.querySelector('a[href="/family"]')).toBeNull();

    const focusCards = Array.from(element.querySelectorAll<HTMLElement>('.home-focus-card'));
    expect(focusCards).toHaveLength(2);
    const firstAction = focusCards[0]?.querySelector<HTMLAnchorElement>('.home-focus-actions a');
    const secondAction = focusCards[1]?.querySelector<HTMLAnchorElement>('.home-focus-actions a');
    expect(firstAction?.textContent?.trim()).toBe('Entrar para acessar');
    expect(firstAction?.getAttribute('href')).toBe('/account?returnUrl=%2Frecommendations');
    expect(secondAction?.textContent?.trim()).toBe('Entrar para acessar');
    expect(secondAction?.getAttribute('href')).toBe('/account?returnUrl=%2Ffamily');

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
});
