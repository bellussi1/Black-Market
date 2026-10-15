import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import type { RoadmapResponse, RoadmapUpdateRequest } from '@bdo/shared';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { RoadmapApiService } from '../../core/roadmap-api.service';
import { renderComponent } from '../../testing/test-setup';
import { RoadmapManagePage } from './roadmap-manage-page';

const storedEntries: RoadmapResponse['entries'] = [
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
    kind: 'pillar' as const,
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

async function setup(canManageRoadmap = true, entries = storedEntries) {
  const identity = {
    canManageRoadmap: signal(canManageRoadmap),
    ready: signal(true),
    initialize: vi.fn().mockResolvedValue(undefined),
  };
  const api = {
    getManaged: vi.fn<() => Promise<RoadmapResponse>>().mockResolvedValue({
      entries: structuredClone(entries),
      updatedAt: '2026-10-13T12:00:00.000Z',
    }),
    replace: vi.fn<(update: RoadmapUpdateRequest) => Promise<RoadmapResponse>>().mockResolvedValue({
      entries: structuredClone(storedEntries),
      updatedAt: '2026-10-13T13:00:00.000Z',
    }),
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

  it('rendersOneEditorListInGlobalOrder', async () => {
    const { fixture } = await setup(true, [
      { ...storedEntries[2]!, kind: 'flow' },
      storedEntries[1]!,
      storedEntries[0]!,
    ]);
    const element = fixture.nativeElement as HTMLElement;
    const editors = Array.from(element.querySelectorAll('.roadmap-editor-entry'));

    expect(element.querySelectorAll('.roadmap-editor-list')).toHaveLength(1);
    expect(
      editors.map(
        (editor) => editor.querySelector<HTMLInputElement>('[data-field="title"]')!.value,
      ),
    ).toEqual(['Seu contexto', 'Mercado', 'O que fazer?']);
    expect(
      editors.map((editor) => editor.querySelector('.roadmap-entry-type')!.textContent?.trim()),
    ).toEqual(['Fase 1', 'Pilar 2', 'Fase 3']);
    expect(
      editors.map(
        (editor) => editor.querySelector<HTMLButtonElement>('[data-action="move-up"]')!.disabled,
      ),
    ).toEqual([true, false, false]);
    expect(
      editors.map(
        (editor) => editor.querySelector<HTMLButtonElement>('[data-action="move-down"]')!.disabled,
      ),
    ).toEqual([false, false, true]);
  });

  it('movesEntriesAcrossKindsAndNormalizesGlobalOrder', async () => {
    const { fixture, api } = await setup(true, [
      { ...storedEntries[0]!, sortOrder: 4 },
      { ...storedEntries[1]!, sortOrder: 9 },
      { ...storedEntries[2]!, sortOrder: 25 },
    ]);
    const element = fixture.nativeElement as HTMLElement;
    const market = element.querySelector(
      '[data-entry-key="00000000-0000-4000-8000-000000000111"]',
    )!;

    market.querySelector<HTMLButtonElement>('[data-action="move-up"]')!.click();
    await fixture.whenStable();
    const context = element.querySelector(
      '[data-entry-key="00000000-0000-4000-8000-000000000101"]',
    )!;
    context.querySelector<HTMLButtonElement>('[data-action="move-down"]')!.click();
    await fixture.whenStable();
    await fixture.componentInstance.save();

    expect(
      api.replace.mock.calls[0]?.[0].entries.map(({ slug, sortOrder }) => [slug, sortOrder]),
    ).toEqual([
      ['market', 0],
      ['what-to-do', 1],
      ['context', 2],
    ]);
  });

  it('changingKindPreservesGlobalPosition', async () => {
    const { fixture, api } = await setup();
    const element = fixture.nativeElement as HTMLElement;
    const kind = element.querySelector<HTMLSelectElement>(
      '[data-entry-key="00000000-0000-4000-8000-000000000112"] [data-field="kind"]',
    )!;

    kind.value = 'flow';
    kind.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(
      Array.from(element.querySelectorAll<HTMLInputElement>('[data-field="title"]')).map(
        (input) => input.value,
      ),
    ).toEqual(['Seu contexto', 'Mercado', 'O que fazer?']);
    await fixture.componentInstance.save();

    expect(
      api.replace.mock.calls[0]?.[0].entries.map(({ slug, kind, sortOrder }) => [
        slug,
        kind,
        sortOrder,
      ]),
    ).toEqual([
      ['context', 'flow', 0],
      ['market', 'pillar', 1],
      ['what-to-do', 'flow', 2],
    ]);
  });

  it('addsAtEndAndRenumbersAfterRemoval', async () => {
    const { fixture, api } = await setup(true, [
      storedEntries[0]!,
      { ...storedEntries[1]!, sortOrder: 5 },
      { ...storedEntries[2]!, sortOrder: 8 },
    ]);
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector<HTMLButtonElement>('[data-action="add-flow"]')!.click();
    await fixture.whenStable();
    const created = fixture.componentInstance
      .entries()
      .find((entry) => entry.draftKey.startsWith('draft-'))!;
    fixture.componentInstance.patch(created.draftKey, {
      title: 'Nova fase',
      summary: 'Última posição global.',
    });
    await fixture.whenStable();

    expect(
      Array.from(element.querySelectorAll<HTMLInputElement>('[data-field="title"]')).map(
        (input) => input.value,
      ),
    ).toEqual(['Seu contexto', 'Mercado', 'O que fazer?', 'Nova fase']);
    expect(created.sortOrder).toBe(9);
    const market = element.querySelector(
      '[data-entry-key="00000000-0000-4000-8000-000000000111"]',
    )!;
    market.querySelector<HTMLButtonElement>('[data-action="remove"]')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.roadmap-editor-entry')).toHaveLength(4);
    fixture.componentInstance.cancelRemove();
    await fixture.whenStable();
    expect(element.querySelector('[data-action="confirm-remove"]')).toBeNull();
    market.querySelector<HTMLButtonElement>('[data-action="remove"]')!.click();
    await fixture.whenStable();
    market.querySelector<HTMLButtonElement>('[data-action="confirm-remove"]')!.click();
    await fixture.whenStable();
    await fixture.componentInstance.save();

    expect(
      api.replace.mock.calls[0]?.[0].entries.map(({ title, sortOrder }) => [title, sortOrder]),
    ).toEqual([
      ['Seu contexto', 0],
      ['O que fazer?', 1],
      ['Nova fase', 2],
    ]);
  });

  it('allowsMultipleHomeFocusEntriesAndCollectionsAbove32', async () => {
    const entries = Array.from({ length: 32 }, (_, index) => ({
      ...storedEntries[0]!,
      id: `00000000-0000-4000-8000-${String(200 + index).padStart(12, '0')}`,
      slug: `entry-${index}`,
      kind: index % 2 === 0 ? ('flow' as const) : ('pillar' as const),
      sortOrder: index,
      title: `Conteúdo ${index + 1}`,
    }));
    const { fixture, api } = await setup(true, entries);
    const element = fixture.nativeElement as HTMLElement;
    const featured = Array.from(
      element.querySelectorAll<HTMLInputElement>('[data-field="featured"]'),
    );
    for (const checkbox of featured) {
      expect(checkbox.labels?.[0]?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Mostrar como foco na Home',
      );
    }
    featured[0]!.click();
    featured[1]!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('[data-field="featured"]:checked')).toHaveLength(2);
    const add = element.querySelector<HTMLButtonElement>('[data-action="add-pillar"]')!;
    expect(add.disabled).toBe(false);
    add.click();
    await fixture.whenStable();
    const created = fixture.componentInstance
      .entries()
      .find((entry) => entry.draftKey.startsWith('draft-'))!;
    fixture.componentInstance.patch(created.draftKey, {
      title: 'Conteúdo 33',
      summary: 'Outro foco possível.',
    });
    await fixture.whenStable();
    await fixture.componentInstance.save();

    const submitted = api.replace.mock.calls[0]?.[0];
    expect(submitted?.entries).toHaveLength(33);
    expect(submitted?.entries.map((entry) => entry.sortOrder)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
      26, 27, 28, 29, 30, 31, 32,
    ]);
    expect(submitted?.entries.filter((entry) => entry.featured).map((entry) => entry.slug)).toEqual(
      ['entry-0', 'entry-1'],
    );
  });

  it('validatesRepeatedDestinationsBeforeSaving', async () => {
    const { fixture, api } = await setup();
    const component = fixture.componentInstance;
    component.patch('00000000-0000-4000-8000-000000000111', {
      links: [
        { label: 'Mercado', path: '/market' },
        { label: 'Mesmo destino', path: ' /market ' },
      ],
    });
    await component.save();
    await fixture.whenStable();

    expect(api.replace).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'destinos repetidos',
    );
    expect(component.hasChanges()).toBe(true);
    expect(component.entries().find((entry) => entry.slug === 'market')?.links).toHaveLength(2);
    component.removeLink('00000000-0000-4000-8000-000000000111', 1);
    component.patch('00000000-0000-4000-8000-000000000112', {
      links: [{ label: 'Mesmo destino em outra entrada', path: '/market' }],
    });
    await component.save();

    expect(api.replace).toHaveBeenCalledOnce();
    expect(
      api.replace.mock.calls[0]?.[0].entries.filter((entry) =>
        entry.links.some((link) => link.path === '/market'),
      ),
    ).toHaveLength(2);
  });

  it('supports adding, editing, reordering, removing, and saving the full collection', async () => {
    const { fixture, api } = await setup();
    const element = fixture.nativeElement as HTMLElement;

    element.querySelector<HTMLButtonElement>('[data-action="add-pillar"]')?.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.roadmap-editor-entry')).toHaveLength(4);

    const title = element.querySelector<HTMLInputElement>(
      '.roadmap-editor-entry[data-kind="pillar"]:last-of-type [data-field="title"]',
    );
    expect(title).not.toBeNull();
    title!.value = 'Novo foco';
    title!.dispatchEvent(new Event('input'));
    const summary = element.querySelector<HTMLTextAreaElement>(
      '.roadmap-editor-entry[data-kind="pillar"]:last-of-type [data-field="summary"]',
    );
    summary!.value = 'Resumo do novo foco.';
    summary!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    element
      .querySelector<HTMLButtonElement>(
        '.roadmap-editor-entry[data-kind="pillar"]:last-of-type [data-action="move-up"]',
      )
      ?.click();
    fixture.detectChanges();
    const pillarTitles = Array.from(
      element.querySelectorAll<HTMLElement>(
        '.roadmap-editor-entry[data-kind="pillar"] [data-field="title"]',
      ),
    ).map((input) => (input as HTMLInputElement).value);
    expect(pillarTitles.indexOf('Novo foco')).toBe(1);

    element.querySelector<HTMLButtonElement>('[data-action="add-link"]')?.click();
    fixture.detectChanges();
    const newLink = element.querySelector('.roadmap-editor-link');
    const linkLabel = newLink?.querySelector<HTMLInputElement>('[data-field="link-label"]');
    linkLabel!.value = 'Abrir Roadmap';
    linkLabel!.dispatchEvent(new Event('input'));
    const linkPath = newLink?.querySelector<HTMLInputElement>('[data-field="link-path"]');
    linkPath!.value = '/roadmap';
    linkPath!.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(element.querySelectorAll('.roadmap-editor-link')).toHaveLength(3);

    const firstPillar = element.querySelector<HTMLElement>(
      '.roadmap-editor-entry[data-kind="pillar"]',
    );
    firstPillar?.querySelector<HTMLButtonElement>('[data-action="remove"]')?.click();
    fixture.detectChanges();
    firstPillar?.querySelector<HTMLButtonElement>('[data-action="confirm-remove"]')?.click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.roadmap-editor-entry')).toHaveLength(3);

    element.querySelector<HTMLButtonElement>('[data-action="save"]')?.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toBe('');
    expect(api.replace).toHaveBeenCalledOnce();
    const submitted = api.replace.mock.calls[0]?.[0];
    expect(submitted?.expectedUpdatedAt).toBe('2026-10-13T12:00:00.000Z');
    expect(submitted?.entries).toHaveLength(3);
    expect(submitted?.entries.map((entry) => entry.title)).toContain('Novo foco');
    expect(fixture.nativeElement.textContent).toContain('Roadmap salvo.');
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
