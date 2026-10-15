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
    links: [],
  },
  {
    id: '00000000-0000-4000-8000-000000000111',
    slug: 'market',
    kind: 'pillar' as const,
    sortOrder: 0,
    title: 'Mercado',
    summary: 'Consulte preços do Mercado Central.',
    description: 'Cotações usadas na simulação.',
    statusLabel: 'Disponível',
    icon: 'lucideStore',
    featured: false,
    links: [{ label: 'Abrir mercado', path: '/market' }],
  },
  {
    id: '00000000-0000-4000-8000-000000000112',
    slug: 'what-to-do',
    kind: 'pillar' as const,
    sortOrder: 1,
    title: 'O que fazer?',
    summary: 'Compare receitas por lucro por hora.',
    description: 'Considere compra, coleta e produção.',
    statusLabel: 'Em evolução',
    icon: 'lucideCompass',
    featured: true,
    links: [{ label: 'Ver recomendações', path: '/recommendations' }],
  },
];

describe('RoadmapPage', () => {
  it('renders the flow, pillars, status, and internal links from the API', async () => {
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
        entries,
        updatedAt: '2026-10-13T12:00:00.000Z',
      });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Roadmap');
    expect(fixture.nativeElement.querySelectorAll('.roadmap-flow li')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.roadmap-card')).toHaveLength(2);
    expect(fixture.nativeElement.textContent).toContain('Em evolução');
    expect(fixture.nativeElement.querySelector('a[href="/market"]')?.textContent).toContain(
      'Abrir mercado',
    );
    expect(fixture.nativeElement.querySelector('a[href="/recommendations"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toMatch(/\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b/);
    http.verify();
  });

  it('shows an explicit empty state without inventing default cards', async () => {
    const fixture = await renderComponent(RoadmapPage, {}, [
      {
        provide: IdentityService,
        useValue: {
          canManageRoadmap: signal(false),
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
    http.verify();
  });
});
