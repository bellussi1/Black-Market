import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import {
  isMvpPathEnabled,
  TUTORIAL_LOCALES,
  TUTORIAL_SCREEN_REGISTRY,
  type TutorialGuide,
} from '@bdo/shared';
import { describe, expect, it, vi } from 'vitest';

import { routes } from '../../app.routes';
import { IdentityService } from '../../core/identity.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { renderComponent } from '../../testing/test-setup';
import { TutorialsManagePage } from './tutorials-manage-page';

const revision = '2026-10-15T12:00:00.000Z';
function guide(): TutorialGuide {
  return {
    id: 'guide',
    screenKey: 'market',
    locale: 'pt-BR',
    enabled: true,
    updatedAt: revision,
    steps: [
      {
        id: 'one',
        sortOrder: 0,
        anchorKey: 'market.search',
        title: 'Título de teste',
        body: 'Corpo de teste',
      },
      { id: 'two', sortOrder: 1, anchorKey: null, title: 'Segunda etapa', body: 'Outro texto' },
    ],
  };
}
async function setup(
  options: { admin?: boolean; guides?: TutorialGuide[]; readError?: boolean } = {},
) {
  const identity = {
    canManageRoadmap: signal(options.admin ?? true),
    initialize: vi.fn().mockResolvedValue(undefined),
  };
  const api = {
    getManagement: vi.fn().mockResolvedValue({
      screens: Object.values(TUTORIAL_SCREEN_REGISTRY),
      locales: TUTORIAL_LOCALES,
      guides: options.guides ?? [guide()],
    }),
    replace: vi.fn().mockResolvedValue({ ...guide(), updatedAt: '2026-10-15T13:00:00.000Z' }),
  };
  if (options.readError) api.getManagement.mockRejectedValueOnce(new Error('offline'));
  const fixture = await renderComponent(TutorialsManagePage, {}, [
    { provide: IdentityService, useValue: identity },
    { provide: TutorialApiService, useValue: api },
  ]);
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, page: fixture.componentInstance, api, identity };
}

describe('TutorialsManagePage', () => {
  it('lists only code-registered screens and locales and offers no selector input', async () => {
    const { fixture } = await setup();
    const element: HTMLElement = fixture.nativeElement;
    expect(
      [...element.querySelectorAll<HTMLSelectElement>('#tutorial-screen option')].map(
        (o) => o.value,
      ),
    ).toEqual(Object.keys(TUTORIAL_SCREEN_REGISTRY));
    expect(
      [...element.querySelectorAll<HTMLSelectElement>('#tutorial-locale option')].map(
        (o) => o.value,
      ),
    ).toEqual([...TUTORIAL_LOCALES]);
    expect(
      element.querySelector('input[name="selector"], input[name="route"], [contenteditable]'),
    ).toBeNull();
    const route = routes[0]?.children?.find((entry) => entry.path === 'tutorials/manage');
    expect(route?.data).toEqual({ private: true, noindex: true });
    expect(isMvpPathEnabled('/tutorials/manage')).toBe(true);
  });

  it('creates, edits, removes and reorders steps with a null general anchor option', async () => {
    const { page, fixture, api } = await setup({ guides: [] });
    expect(page.steps()).toEqual([]);
    page.addStep();
    page.patchStep(0, { title: 'Primeira etapa', body: 'Texto de teste', anchorKey: null });
    page.addStep();
    page.patchStep(1, { title: 'Outra etapa', body: 'Outro texto', anchorKey: 'market.filters' });
    page.moveStep(1, -1);
    expect(page.steps().map((s) => s.title)).toEqual(['Outra etapa', 'Primeira etapa']);
    page.removeStep(0);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#tutorial-anchor-0')?.textContent).toContain(
      'Etapa geral, sem destaque',
    );
    await page.save();
    expect(api.replace).toHaveBeenCalledWith('market', 'pt-BR', {
      expectedUpdatedAt: null,
      enabled: false,
      steps: [{ sortOrder: 0, anchorKey: null, title: 'Primeira etapa', body: 'Texto de teste' }],
    });
  });

  it('shows field validation and blocks invalid anchors or step counts', async () => {
    const { page, fixture, api } = await setup();
    page.patchStep(0, { title: '', body: 'x'.repeat(361), anchorKey: 'recipes.tree' });
    await page.save();
    await fixture.whenStable();
    expect(api.replace).not.toHaveBeenCalled();
    for (const field of ['title', 'body', 'anchorKey']) {
      expect(
        fixture.nativeElement.querySelector(`[data-error="steps.0.${field}"]`)?.textContent.trim(),
      ).toBeTruthy();
    }
    page.removeStep(1);
    page.removeStep(0);
    await page.save();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[data-error="steps"]')?.textContent).toContain(
      '1 a 8',
    );
    for (let i = 0; i < 9; i++) page.addStep();
    expect(page.steps()).toHaveLength(8);
    expect(api.replace).not.toHaveBeenCalled();
  });

  it('preserves the full draft after a 409 conflict and after a failed save', async () => {
    const { page, api } = await setup();
    page.patchStep(0, { title: 'Rascunho alterado' });
    page.setEnabled(false);
    page.moveStep(1, -1);
    const draft = structuredClone(page.steps());
    for (const status of [409, 503]) {
      api.replace.mockRejectedValueOnce(new HttpErrorResponse({ status }));
      await page.save();
      expect(page.steps()).toEqual(draft);
      expect(page.enabled()).toBe(false);
      expect(page.updatedAt()).toBe(revision);
      expect(page.dirty()).toBe(true);
      expect(page.error()).toContain('rascunho');
    }
  });

  it('marks a removed registry anchor invalid and blocks save until it is replaced', async () => {
    const old = guide();
    old.steps[0]!.anchorKey = 'market.removed';
    const { page, fixture, api } = await setup({ guides: [old] });
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('[data-error="steps.0.anchorKey"]')?.textContent,
    ).toContain('âncora');
    page.setEnabled(false);
    await page.save();
    expect(api.replace).not.toHaveBeenCalled();
    page.patchStep(0, { anchorKey: null });
    await page.save();
    expect(api.replace).toHaveBeenCalledOnce();
  });

  it('shows the returned guide revision immediately after a successful save', async () => {
    const { page, api, fixture } = await setup();
    page.patchStep(0, { title: 'Revisado' });
    await page.save();
    await fixture.whenStable();
    expect(page.updatedAt()).toBe('2026-10-15T13:00:00.000Z');
    expect(fixture.nativeElement.querySelector('.tutorial-revision')?.textContent).toContain(
      '2026-10-15T13:00:00.000Z',
    );
    page.setEnabled(false);
    await page.save();
    expect(api.replace.mock.calls[1]?.[2].expectedUpdatedAt).toBe('2026-10-15T13:00:00.000Z');
    expect(api.getManagement).toHaveBeenCalledOnce();
  });

  it('keeps the editor recoverable after a failed management read', async () => {
    const { page, api, fixture } = await setup({ readError: true });
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.tutorial-retry')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.tutorial-editor')).toBeNull();
    await page.load();
    await fixture.whenStable();
    expect(api.getManagement).toHaveBeenCalledTimes(2);
    expect(page.error()).toBe('');
    expect(fixture.nativeElement.querySelector('.tutorial-editor')).not.toBeNull();
  });

  it('marks changes dirty, toggles enabled state and clears dirty state after save', async () => {
    const { page, api, fixture } = await setup();
    expect(page.dirty()).toBe(false);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.tutorial-save')
        ?.disabled,
    ).toBe(true);
    page.setEnabled(false);
    expect(page.dirty()).toBe(true);
    let resolveSave!: (value: TutorialGuide) => void;
    api.replace.mockImplementationOnce(
      () => new Promise<TutorialGuide>((resolve) => (resolveSave = resolve)),
    );
    const saving = page.save();
    await fixture.whenStable();
    expect(page.saving()).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain(
      'Salvando',
    );
    resolveSave({ ...guide(), enabled: false });
    await saving;
    await fixture.whenStable();
    expect(page.dirty()).toBe(false);
    expect(page.saving()).toBe(false);
    expect(fixture.nativeElement.querySelector('[role="status"]')?.textContent).toContain('salvo');
  });

  it('does not load management content when canManageRoadmap is false', async () => {
    const { api, fixture } = await setup({ admin: false });
    expect(api.getManagement).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('permissão');
    expect(fixture.nativeElement.querySelector('.tutorial-editor')).toBeNull();
  });

  it('maps API validation issues beside the field without replacing text', async () => {
    const { page, api, fixture } = await setup();
    page.patchStep(0, { title: '<b>Rascunho</b>' });
    api.replace.mockRejectedValueOnce(
      new HttpErrorResponse({
        status: 400,
        error: {
          issues: [
            { path: ['steps', 0, 'title'], message: 'Use texto simples, sem HTML ou Markdown.' },
          ],
        },
      }),
    );
    await page.save();
    await fixture.whenStable();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[data-error="steps.0.title"]')?.textContent).toContain(
      'Use texto simples',
    );
    expect(element.querySelector<HTMLInputElement>('#tutorial-title-0')?.value).toBe(
      '<b>Rascunho</b>',
    );
    expect(page.dirty()).toBe(true);
  });

  it('keeps unsaved drafts while switching registered screens', async () => {
    const { page } = await setup();
    page.patchStep(0, { title: 'Rascunho local' });
    page.selectScreen('recipes');
    expect(page.steps()).toHaveLength(0);
    page.addStep();
    page.patchStep(0, { title: 'Outro rascunho', body: 'Texto' });
    page.selectScreen('market');
    expect(page.steps()[0]?.title).toBe('Rascunho local');
    expect(page.updatedAt()).toBe(revision);
    page.selectScreen('recipes');
    expect(page.steps()[0]?.title).toBe('Outro rascunho');
  });

  it('loads when the verified identity later receives administrator permission', async () => {
    const { identity, fixture, api } = await setup({ admin: false });
    expect(api.getManagement).not.toHaveBeenCalled();
    identity.canManageRoadmap.set(true);
    await fixture.whenStable();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.getManagement).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('.tutorial-editor')).not.toBeNull();
  });
});
