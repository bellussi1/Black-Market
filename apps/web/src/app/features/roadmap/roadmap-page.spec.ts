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
    statusLabel: null,
    icon: 'lucideBoxes',
    featured: false,
    links: [
      { label: 'Consultar receitas', path: '/recipes' },
      { label: 'Abrir armazém', path: '/storage' },
    ],
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
    links: [{ label: 'Abrir mercado', path: '/market' }],
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    slug: 'decision',
    kind: 'flow' as const,
    sortOrder: 2,
    title: 'Sua decisão',
    summary: 'Escolha a próxima atividade.',
    description: null,
    statusLabel: null,
    icon: 'lucideCompass',
    featured: false,
    links: [],
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
    links: [{ label: 'Ver recomendações', path: '/recommendations' }],
  },
];

function createIdentity() {
  return {
    canManageRoadmap: signal(false),
    authenticated: signal(false),
    initialize: vi.fn().mockResolvedValue(undefined),
  };
}

describe('RoadmapPage', () => {
  it('rendersMixedKindsInOneOrderedListWithTextualTypeAndFocus', async () => {
    const identity = createIdentity();
    const fixture = await renderComponent(RoadmapPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries,
        updatedAt: '2026-10-13T12:00:00.000Z',
      });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Roadmap');
    expect(fixture.nativeElement.querySelectorAll('ol')).toHaveLength(1);
    const pathSteps = fixture.nativeElement.querySelectorAll('ol > li');
    expect(pathSteps).toHaveLength(4);
    expect(
      [...pathSteps].map((step) => step.querySelector('article h2')?.textContent.trim()),
    ).toEqual(entries.map((entry) => entry.title));
    expect(
      [...pathSteps].map((step) => step.querySelector('.roadmap-kind')?.textContent.trim()),
    ).toEqual(['Fase', 'Pilar', 'Fase', 'Pilar']);
    expect(
      [...pathSteps].map((step) => step.querySelector('.roadmap-path-marker')?.textContent.trim()),
    ).toEqual(['1', '2', '3', '4']);
    for (const step of pathSteps) {
      expect(step.querySelector('.roadmap-path-marker')?.getAttribute('aria-hidden')).toBe('true');
      expect(step.querySelector('ng-icon')?.getAttribute('aria-hidden')).toBe('true');
      expect(step.querySelector('article')?.closest('a')).toBeNull();
    }
    expect(fixture.nativeElement.querySelectorAll('.roadmap-featured')).toHaveLength(1);
    expect(pathSteps[3].querySelector('.roadmap-featured')?.textContent).toContain('Foco da Home');
    expect(pathSteps[1].querySelector('.roadmap-state')?.textContent).toContain('Disponível');
    expect(fixture.nativeElement.textContent).toContain('Em evolução');
    expect(fixture.nativeElement.querySelector('a[href="/market"]')?.textContent).toContain(
      'Abrir mercado',
    );
    expect(fixture.nativeElement.querySelector('a[href="/recommendations"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toMatch(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/);
    http.verify();
  });

  it('filtersProtectedLinksUntilIdentityInitializationCompletes', async () => {
    const identity = createIdentity();
    let finishInitialization!: () => void;
    identity.initialize.mockImplementation(
      () => new Promise<void>((resolve) => (finishInitialization = resolve)),
    );
    const fixture = await renderComponent(RoadmapPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries,
        updatedAt: null,
      });
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('a[href="/recipes"]')?.textContent).toContain(
      'Consultar receitas',
    );
    expect(fixture.nativeElement.querySelector('a[href="/market"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/storage"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('a[href="/recommendations"]')).toBeNull();

    identity.authenticated.set(true);
    finishInitialization();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a[href="/storage"]')?.textContent).toContain(
      'Abrir armazém',
    );
    expect(
      fixture.nativeElement.querySelector('a[href="/recommendations"]')?.textContent,
    ).toContain('Ver recomendações');
    http.verify();
  });

  it('shows an explicit empty state without inventing default cards', async () => {
    const fixture = await renderComponent(RoadmapPage, {}, [
      {
        provide: IdentityService,
        useValue: createIdentity(),
      },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [],
        updatedAt: null,
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.roadmap-empty')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'O Roadmap ainda não tem conteúdo',
    );
    expect(fixture.nativeElement.querySelectorAll('.roadmap-card')).toHaveLength(0);
    http.verify();
  });

  it('shows retry feedback when the persisted roadmap cannot be loaded', async () => {
    const fixture = await renderComponent(RoadmapPage, {}, [
      {
        provide: IdentityService,
        useValue: createIdentity(),
      },
    ]);
    const http = TestBed.inject(HttpTestingController);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando Roadmap',
    );
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({ message: 'indisponível' }, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.roadmap-retry')).not.toBeNull();
    fixture.nativeElement.querySelector('.roadmap-retry').click();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Carregando Roadmap',
    );
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries,
        updatedAt: null,
      });
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelectorAll('article')).toHaveLength(entries.length);
    http.verify();
  });

  it.each([false, true])('shows management only when permission is %s', async (canManage) => {
    const identity = createIdentity();
    identity.canManageRoadmap.set(canManage);
    const fixture = await renderComponent(RoadmapPage, {}, [
      { provide: IdentityService, useValue: identity },
    ]);
    const http = TestBed.inject(HttpTestingController);
    http
      .expectOne((request) => request.url.endsWith('/api/v1/roadmap'))
      .flush({
        entries: [],
        updatedAt: null,
      });
    await fixture.whenStable();
    expect(Boolean(fixture.nativeElement.querySelector('a[href="/roadmap/manage"]'))).toBe(
      canManage,
    );
    http.verify();
  });
});
