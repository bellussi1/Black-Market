import { HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { renderComponent } from '../../testing/test-setup';
import { RoadmapPage } from './roadmap-page';

const entries = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    slug: 'context',
    kind: 'flow' as const,
    sortOrder: 0,
    title: 'Seu contexto',
    summary: 'Armazém, Maestria e cotações.',
    description: 'Dados para a comparação.',
    statusLabel: 'Base conectada',
    icon: 'lucideBoxes',
    featured: true,
    links: [{ label: 'Abrir mercado', path: '/market' }],
  },
  {
    id: '00000000-0000-4000-8000-000000000111',
    slug: 'market',
    kind: 'pillar' as const,
    sortOrder: 1,
    title: 'Mercado',
    summary: 'Consulte preços do Mercado Central.',
    description: 'Cotações usadas na simulação.',
    statusLabel: 'Disponível',
    icon: 'lucideStore',
    featured: false,
    links: [{ label: 'Ver cotações', path: '/market' }],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    slug: 'craft-flow',
    kind: 'flow' as const,
    sortOrder: 2,
    title: 'Da receita ao lote',
    summary: 'Escolha ingredientes e avalie o retorno.',
    description: 'Conecte estoque e árvore de produção.',
    statusLabel: null,
    icon: 'lucideHammer',
    featured: false,
    links: [{ label: 'Explorar receitas', path: '/recipes' }],
  },
  {
    id: '00000000-0000-4000-8000-000000000112',
    slug: 'what-to-do',
    kind: 'pillar' as const,
    sortOrder: 3,
    title: 'O que fazer?',
    summary: 'Compare receitas por lucro por hora.',
    description: 'Considere compra, coleta e produção.',
    statusLabel: 'Em evolução',
    icon: 'lucideCompass',
    featured: true,
    links: [
      { label: 'Explorar receitas', path: '/recipes' },
      { label: 'Ver recomendações', path: '/recommendations' },
    ],
  },
];

describe('RoadmapPage', () => {
  it('reserves the roadmap trail with an accessible skeleton while loading', async () => {
    const identity = {
      canManageRoadmap: signal(false),
      authenticated: signal(false),
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    const fixture = await renderComponent(RoadmapPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);

    const loading = fixture.nativeElement.querySelector('.roadmap-loading');
    expect(loading?.getAttribute('role')).toBe('status');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.querySelectorAll('.roadmap-skeleton-step')).toHaveLength(4);
    expect(loading?.querySelector('.roadmap-skeleton-path')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [],
        updatedAt: null,
      });
    http.verify();
  });

  it('rendersMixedKindsInOneOrderedListWithTextualTypeAndFocus', async () => {
    const identity = {
      canManageRoadmap: signal(false),
      authenticated: signal(false),
      initialize: vi.fn().mockResolvedValue(undefined),
    };
    const fixture = await renderComponent(RoadmapPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [entries[2]!, entries[0]!, entries[3]!, entries[1]!],
        updatedAt: '2026-10-13T12:00:00.000Z',
      });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Roadmap');
    const lists = fixture.nativeElement.querySelectorAll('ol');
    expect(lists).toHaveLength(1);
    const pathSteps = fixture.nativeElement.querySelectorAll('ol > li');
    expect(pathSteps).toHaveLength(4);
    expect(
      [...pathSteps].map((step) => step.querySelector('article h3')?.textContent.trim()),
    ).toEqual(['Seu contexto', 'Mercado', 'Da receita ao lote', 'O que fazer?']);
    expect(
      [...pathSteps].map((step) => step.querySelector('.roadmap-kind-badge')?.textContent.trim()),
    ).toEqual(['Fase', 'Pilar', 'Fase', 'Pilar']);
    expect(
      [...pathSteps].map(
        (step) => step.querySelector('.roadmap-focus-badge')?.textContent.trim() ?? null,
      ),
    ).toEqual(['Foco da Home', null, null, 'Foco da Home']);
    expect(
      [...pathSteps].map((step) => step.querySelector('.roadmap-path-marker')?.textContent.trim()),
    ).toEqual(['1', '2', '3', '4']);
    expect(fixture.nativeElement.textContent).toContain('Base conectada');
    expect(fixture.nativeElement.textContent).toContain('Em evolução');
    expect(fixture.nativeElement.querySelector('a[href="/market"]')?.textContent).toContain(
      'Abrir mercado',
    );
    expect(fixture.nativeElement.querySelector('a[href="/recommendations"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toMatch(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/);
    http.verify();
  });

  it('filtersProtectedLinksUntilIdentityInitializationCompletes', async () => {
    let resolveInit!: () => void;
    const authenticated = signal(false);
    const identity = {
      canManageRoadmap: signal(false),
      authenticated,
      initialize: vi.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveInit = resolve;
          }),
      ),
    };
    const fixture = await renderComponent(RoadmapPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [entries[3]!],
        updatedAt: '2026-10-13T12:00:00.000Z',
      });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[href="/recipes"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/recommendations"]')).toBeNull();

    authenticated.set(true);
    resolveInit();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[href="/recipes"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/recommendations"]')).not.toBeNull();
    http.verify();
  });

  it('shows Editar tutoriais only to a roadmap administrator', async () => {
    const canManageRoadmap = signal(false);
    const fixture = await renderComponent(RoadmapPage, {}, [
      {
        provide: IdentityService,
        useValue: {
          canManageRoadmap,
          authenticated: signal(false),
          initialize: vi.fn().mockResolvedValue(undefined),
        },
      },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [],
        updatedAt: null,
      });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a[href="/roadmap/manage"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/tutorials/manage"]')).toBeNull();

    canManageRoadmap.set(true);
    fixture.detectChanges();

    const manageRoadmap = fixture.nativeElement.querySelector('a[href="/roadmap/manage"]');
    const manageTutorials = fixture.nativeElement.querySelector('a[href="/tutorials/manage"]');
    expect(manageRoadmap?.textContent.trim()).toBe('Editar Roadmap');
    expect(manageTutorials?.textContent.trim()).toBe('Editar tutoriais');
    http.verify();
  });

  it('shows an explicit empty state without inventing default cards', async () => {
    const fixture = await renderComponent(RoadmapPage, {}, [
      {
        provide: IdentityService,
        useValue: {
          canManageRoadmap: signal(false),
          authenticated: signal(false),
          initialize: vi.fn().mockResolvedValue(undefined),
        },
      },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [],
        updatedAt: null,
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.roadmap-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.roadmap-card')).toHaveLength(0);
    http.verify();
  });

  it('shows retry feedback when the persisted roadmap cannot be loaded', async () => {
    const fixture = await renderComponent(RoadmapPage, {}, [
      {
        provide: IdentityService,
        useValue: {
          canManageRoadmap: signal(false),
          authenticated: signal(false),
          initialize: vi.fn().mockResolvedValue(undefined),
        },
      },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({ message: 'indisponível' }, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.roadmap-retry')).not.toBeNull();
    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('.roadmap-retry')
      ?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando Roadmap',
    );
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [entries[0]!],
        updatedAt: null,
      });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.roadmap-card')).toHaveLength(1);
    http.verify();
  });
});
