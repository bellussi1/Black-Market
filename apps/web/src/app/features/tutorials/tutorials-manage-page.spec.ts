import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { TutorialsManagePage } from './tutorials-manage-page';
const saved = {
  id: 'g',
  screenKey: 'market' as const,
  locale: 'pt-BR' as const,
  enabled: true,
  updatedAt: '2026-10-15T12:00:00.000Z',
  steps: [{ id: 's', sortOrder: 0, anchorKey: 'market.search', title: 'Busca', body: 'Texto' }],
};
function setup(admin = true) {
  const api = {
    getManagement: vi.fn().mockResolvedValue({ guides: [saved], screens: [], locales: [] }),
    replace: vi.fn().mockResolvedValue({ ...saved, updatedAt: '2026-10-15T13:00:00.000Z' }),
  };
  TestBed.configureTestingModule({
    providers: [
      {
        provide: IdentityService,
        useValue: {
          initialize: vi.fn().mockResolvedValue(undefined),
          canManageRoadmap: signal(admin),
        },
      },
      { provide: TutorialApiService, useValue: api },
    ],
  });
  const fixture = TestBed.createComponent(TutorialsManagePage);
  return { page: fixture.componentInstance, fixture, api };
}
describe('TutorialsManagePage', () => {
  it('lists only code-registered screens and locales and offers no selector input', () => {
    const { page } = setup();
    expect(page.screens.map((screen) => screen.screenKey)).toEqual([
      'market',
      'recipes',
      'recipe-workshop',
      'scans',
      'storage',
      'recommendations',
    ]);
    expect(page.locales).toEqual(['pt-BR']);
  });
  it('does not load management content when canManageRoadmap is false', async () => {
    const { page, api } = setup(false);
    await page.initialize();
    expect(api.getManagement).not.toHaveBeenCalled();
  });
  it('creates, edits, removes and reorders steps with a null general anchor option', async () => {
    const { page } = setup();
    await page.initialize();
    page.addStep();
    page.patchStep(1, 'title', 'Geral');
    expect(page.draft().steps[1].anchorKey).toBeNull();
    page.moveStep(1, -1);
    expect(page.draft().steps[0].title).toBe('Geral');
    page.removeStep(0);
    expect(page.draft().steps).toHaveLength(1);
  });
  it('shows field validation and blocks invalid anchors or step counts', async () => {
    const { page, api } = setup();
    await page.initialize();
    page.patchStep(0, 'anchorKey', 'recipes.tree');
    await page.save();
    expect(page.validation()['steps.0.anchorKey']).toBeTruthy();
    expect(api.replace).not.toHaveBeenCalled();
  });
  it('preserves the full draft after a 409 conflict and after a failed save', async () => {
    const { page, api } = setup();
    await page.initialize();
    page.patchStep(0, 'body', 'Alterado');
    const before = structuredClone(page.draft());
    api.replace.mockRejectedValue(new HttpErrorResponse({ status: 409 }));
    await page.save();
    expect(page.draft()).toEqual(before);
    expect(page.error()).toContain('Outra');
    api.replace.mockRejectedValue(new Error());
    await page.save();
    expect(page.draft()).toEqual(before);
  });
  it('marks a removed registry anchor invalid and blocks save until it is replaced', async () => {
    const { page, api } = setup();
    api.getManagement.mockResolvedValue({
      guides: [{ ...saved, steps: [{ ...saved.steps[0], anchorKey: 'market.removed' }] }],
      screens: [],
      locales: [],
    });
    await page.initialize();
    expect(page.valid()).toBe(false);
    page.patchStep(0, 'anchorKey', null);
    expect(page.valid()).toBe(true);
  });
  it('shows the returned guide revision immediately after a successful save', async () => {
    const { page } = setup();
    await page.initialize();
    page.patchStep(0, 'title', 'Nova busca');
    await page.save();
    expect(page.draft().expectedUpdatedAt).toBe('2026-10-15T13:00:00.000Z');
    expect(page.dirty()).toBe(false);
  });
  it('keeps the editor recoverable after a failed management read', async () => {
    const { page, api } = setup();
    api.getManagement.mockRejectedValueOnce(new Error());
    await page.initialize();
    expect(page.error()).toBeTruthy();
    await page.load();
    expect(page.error()).toBe('');
    expect(page.draft().steps).toHaveLength(1);
  });
  it('marks changes dirty and toggles enabled state', async () => {
    const { page } = setup();
    await page.initialize();
    expect(page.dirty()).toBe(false);
    page.setEnabled(false);
    expect(page.dirty()).toBe(true);
    expect(page.draft().enabled).toBe(false);
  });
});
