import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import type { RoadmapResponse, RoadmapUpdateRequest } from '@bdo/shared';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { RoadmapApiService } from '../../core/roadmap-api.service';
import { renderComponent } from '../../testing/test-setup';
import { RoadmapManagePage } from './roadmap-manage-page';

const storedEntries = [
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
    summary: 'Compare atividades por lucro por hora.',
    description: 'Use Armazém, Maestria, cotações e tempo.',
    statusLabel: 'Em evolução',
    icon: 'lucideCompass',
    featured: true,
    links: [{ label: 'Ver recomendações', path: '/recommendations' }],
  },
];

async function setup(canManageRoadmap = true) {
  const identity = {
    canManageRoadmap: signal(canManageRoadmap),
    ready: signal(true),
    initialize: vi.fn().mockResolvedValue(undefined),
  };
  const api = {
    getManaged: vi.fn<() => Promise<RoadmapResponse>>().mockResolvedValue({
      entries: structuredClone(storedEntries),
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
