import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import type { RoadmapEntry, RoadmapResponse, RoadmapUpdateRequest } from '@bdo/shared';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { RoadmapApiService } from '../../core/roadmap-api.service';
import { renderComponent } from '../../testing/test-setup';
import { RoadmapManagePage } from './roadmap-manage-page';

const storedEntries: RoadmapEntry[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    slug: 'context',
    kind: 'flow',
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
    kind: 'pillar',
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
    id: '00000000-0000-4000-8000-000000000112',
    slug: 'what-to-do',
    kind: 'pillar',
    sortOrder: 2,
    title: 'O que fazer?',
    summary: 'Compare atividades por lucro por hora.',
    description: 'Use Armazém, Maestria, cotações e tempo.',
    statusLabel: 'Em evolução',
    icon: 'lucideCompass',
    featured: true,
    links: [{ label: 'Ver recomendações', path: '/recommendations' }],
  },
];

async function setup(canManageRoadmap = true, initialEntries: RoadmapEntry[] = storedEntries) {
  const identity = {
    canManageRoadmap: signal(canManageRoadmap),
    ready: signal(true),
    initialize: vi.fn().mockResolvedValue(undefined),
  };
  const api = {
    getManaged: vi.fn<() => Promise<RoadmapResponse>>().mockResolvedValue({
      entries: structuredClone(initialEntries),
      updatedAt: '2026-10-13T12:00:00.000Z',
    }),
    replace: vi
      .fn<(update: RoadmapUpdateRequest) => Promise<RoadmapResponse>>()
      .mockImplementation(async (update) => ({
        entries: update.entries.map((entry, index) => ({
          ...entry,
          id: entry.id ?? `00000000-0000-4000-8000-${String(index + 200).padStart(12, '0')}`,
        })),
        updatedAt: '2026-10-13T13:00:00.000Z',
      })),
  };
  const fixture = await renderComponent(RoadmapManagePage, {}, [
    { provide: IdentityService, useValue: identity },
    { provide: RoadmapApiService, useValue: api },
  ]);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, identity, api };
}

describe('RoadmapManagePage', () => {
  it('uses the shared management heading and exposes the public roadmap', async () => {
    const { fixture } = await setup();
    const page = fixture.nativeElement as HTMLElement;

    expect(page.querySelector('.roadmap-admin > header.tool-heading h1')?.textContent).toContain(
      'Editar Roadmap',
    );
    expect(page.querySelector('a[href="/roadmap"]')?.textContent).toContain('Ver Roadmap público');
  });

  it('loads persisted entries only after verifying the administrator role', async () => {
    const { fixture, identity, api } = await setup();

    expect(identity.initialize).toHaveBeenCalledOnce();
    expect(api.getManaged).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelectorAll('.roadmap-editor-entry')).toHaveLength(3);
    expect(fixture.nativeElement.querySelector('[data-field="title"]')?.value).toBe('Seu contexto');
  });

  it('keeps the editor unavailable for an account without the roadmap role', async () => {
    const { fixture, api } = await setup(false);

    expect(api.getManaged).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.roadmap-access-denied')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.roadmap-editor-entry')).toHaveLength(0);
  });

  it('shows a reserved skeleton while the initial roadmap content is being read', async () => {
    const { fixture } = await setup();
    const page = fixture.componentInstance;
    page.entries.set([]);
    page.loaded.set(false);
    page.loading.set(true);
    fixture.detectChanges();

    const loading = (fixture.nativeElement as HTMLElement).querySelector('[data-roadmap-loading]');
    expect(loading?.getAttribute('aria-busy')).toBe('true');
    expect(loading?.querySelectorAll('.roadmap-skeleton-entry').length).toBeGreaterThan(0);
    expect(loading?.querySelector('[role="status"]')?.textContent).toContain('Carregando');
  });

  it('keeps the current editor visible and announces its busy state during reload', async () => {
    const { fixture, api } = await setup();
    const page = fixture.componentInstance;
    let finish!: (value: RoadmapResponse) => void;
    api.getManaged.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));

    const pending = page.load();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.roadmap-admin')?.getAttribute('aria-busy')).toBe('true');
    expect(element.querySelectorAll('.roadmap-editor-entry')).toHaveLength(3);
    expect(element.querySelector('[data-roadmap-refresh-status]')?.textContent).toContain(
      'Atualizando',
    );

    finish({ entries: structuredClone(storedEntries), updatedAt: '2026-10-16T12:00:00.000Z' });
    await pending;
  });

  it('rendersOneEditorListInGlobalOrder', async () => {
    const mixedEntries: RoadmapEntry[] = [
      { ...storedEntries[2]!, sortOrder: 2 },
      { ...storedEntries[0]!, sortOrder: 0 },
      { ...storedEntries[1]!, sortOrder: 1 },
    ];
    const { fixture } = await setup(true, mixedEntries);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.roadmap-editor-list')).toHaveLength(1);
    const cards = Array.from(element.querySelectorAll<HTMLElement>('.roadmap-editor-entry'));
    expect(cards.map((card) => card.querySelector('h3')?.textContent?.trim())).toEqual([
      'Seu contexto',
      'Mercado',
      'O que fazer?',
    ]);
    expect(
      cards.map((card) => card.querySelector('.roadmap-entry-type')?.textContent?.trim()),
    ).toEqual(['#1 · Fase', '#2 · Pilar', '#3 · Pilar']);
    expect(cards[0]?.querySelector<HTMLButtonElement>('[data-action="move-up"]')?.disabled).toBe(
      true,
    );
    expect(cards[1]?.querySelector<HTMLButtonElement>('[data-action="move-up"]')?.disabled).toBe(
      false,
    );
    expect(cards[2]?.querySelector<HTMLButtonElement>('[data-action="move-down"]')?.disabled).toBe(
      true,
    );
  });

  it('movesEntriesAcrossKindsAndNormalizesGlobalOrder', async () => {
    const { fixture, api } = await setup();
    const element = fixture.nativeElement as HTMLElement;

    const secondCard = element.querySelectorAll<HTMLElement>('.roadmap-editor-entry')[1];
    secondCard?.querySelector<HTMLButtonElement>('[data-action="move-up"]')?.click();
    fixture.detectChanges();

    await fixture.componentInstance.save();
    fixture.detectChanges();

    expect(api.replace).toHaveBeenCalledOnce();
    const submitted = api.replace.mock.calls[0]?.[0];
    expect(
      submitted?.entries.map((entry) => ({
        slug: entry.slug,
        kind: entry.kind,
        sortOrder: entry.sortOrder,
      })),
    ).toEqual([
      { slug: 'market', kind: 'pillar', sortOrder: 0 },
      { slug: 'context', kind: 'flow', sortOrder: 1 },
      { slug: 'what-to-do', kind: 'pillar', sortOrder: 2 },
    ]);
  });

  it('changingKindPreservesGlobalPosition', async () => {
    const { fixture, api } = await setup();

    fixture.componentInstance.changeKind('00000000-0000-4000-8000-000000000111', 'flow');
    fixture.detectChanges();

    await fixture.componentInstance.save();
    fixture.detectChanges();

    const submitted = api.replace.mock.calls[0]?.[0];
    expect(
      submitted?.entries.map((entry) => ({
        slug: entry.slug,
        kind: entry.kind,
        sortOrder: entry.sortOrder,
      })),
    ).toEqual([
      { slug: 'context', kind: 'flow', sortOrder: 0 },
      { slug: 'market', kind: 'flow', sortOrder: 1 },
      { slug: 'what-to-do', kind: 'pillar', sortOrder: 2 },
    ]);
  });

  it('addsAtEndAndRenumbersAfterRemoval', async () => {
    const { fixture, api } = await setup();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('[data-action="add-flow"]')?.click();
    fixture.detectChanges();

    const cards = element.querySelectorAll<HTMLElement>('.roadmap-editor-entry');
    expect(cards).toHaveLength(4);
    const addedCard = cards[3]!;
    const addedKey = addedCard.getAttribute('data-entry-key')!;
    fixture.componentInstance.patch(addedKey, {
      title: 'Nova fase no fim',
      summary: 'Resumo da nova fase.',
    });
    fixture.detectChanges();

    const middleCard = element.querySelectorAll<HTMLElement>('.roadmap-editor-entry')[1]!;
    middleCard.querySelector<HTMLButtonElement>('[data-action="remove"]')?.click();
    fixture.detectChanges();
    middleCard.querySelector<HTMLButtonElement>('[data-action="confirm-remove"]')?.click();
    fixture.detectChanges();

    await fixture.componentInstance.save();
    fixture.detectChanges();

    const submitted = api.replace.mock.calls[0]?.[0];
    expect(
      submitted?.entries.map((entry) => ({
        title: entry.title,
        kind: entry.kind,
        sortOrder: entry.sortOrder,
      })),
    ).toEqual([
      { title: 'Seu contexto', kind: 'flow', sortOrder: 0 },
      { title: 'O que fazer?', kind: 'pillar', sortOrder: 1 },
      { title: 'Nova fase no fim', kind: 'flow', sortOrder: 2 },
    ]);
  });

  it('allowsMultipleHomeFocusEntriesAndCollectionsAbove32', async () => {
    const manyEntries: RoadmapEntry[] = Array.from({ length: 32 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
      slug: `entry-${index + 1}`,
      kind: index % 2 === 0 ? 'flow' : 'pillar',
      sortOrder: index,
      title: `Item ${index + 1}`,
      summary: `Resumo ${index + 1}`,
      description: '',
      statusLabel: null,
      icon: 'lucideStore',
      featured: index === 0,
      links: [],
    }));
    const { fixture, api } = await setup(true, manyEntries);
    const element = fixture.nativeElement as HTMLElement;

    const addPillarBtn = element.querySelector<HTMLButtonElement>('[data-action="add-pillar"]');
    expect(addPillarBtn?.disabled).toBe(false);
    addPillarBtn?.click();
    fixture.detectChanges();

    const cards = element.querySelectorAll<HTMLElement>('.roadmap-editor-entry');
    expect(cards).toHaveLength(33);
    const lastKey = cards.item(32)?.getAttribute('data-entry-key') ?? '';
    fixture.componentInstance.patch(lastKey, {
      title: 'Trigésimo terceiro',
      summary: 'Resumo 33',
      featured: true,
    });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const featuredLabels = Array.from(
      element.querySelectorAll<HTMLLabelElement>('.roadmap-featured-field'),
    );
    expect(featuredLabels[0]?.textContent?.trim()).toBe('Mostrar como foco na Home');
    const checkedBoxes = Array.from(
      element.querySelectorAll<HTMLInputElement>('[data-field="featured"]'),
    ).filter((checkbox) => checkbox.checked);
    expect(checkedBoxes).toHaveLength(2);

    await fixture.componentInstance.save();
    fixture.detectChanges();

    expect(api.replace).toHaveBeenCalledOnce();
    const submitted = api.replace.mock.calls[0]?.[0];
    expect(submitted?.entries).toHaveLength(33);
    expect(submitted?.entries.filter((entry) => entry.featured)).toHaveLength(2);
    expect(submitted?.entries[32]?.sortOrder).toBe(32);
  });

  it('validatesRepeatedDestinationsBeforeSaving', async () => {
    const { fixture, api } = await setup();

    fixture.componentInstance.patch('00000000-0000-4000-8000-000000000111', {
      links: [
        { label: 'Abrir mercado', path: '/market' },
        { label: 'Mercado duplicado', path: ' /market ' },
      ],
    });
    await fixture.componentInstance.save();
    fixture.detectChanges();

    expect(api.replace).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'destino diferente',
    );
  });

  it('preserves the draft and asks for a reload after a concurrent edit conflict', async () => {
    const { fixture, api } = await setup();
    api.replace.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));

    fixture.componentInstance.patch('00000000-0000-4000-8000-000000000111', {
      title: 'Mercado revisado',
    });
    await fixture.componentInstance.save();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('foi alterado por outra pessoa');
    expect(fixture.nativeElement.textContent).toContain('Mercado revisado');
    expect(fixture.nativeElement.querySelector('[data-action="reload-discard"]')).not.toBeNull();
  });
});
