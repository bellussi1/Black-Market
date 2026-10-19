import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import {
  TUTORIAL_ONBOARDING_STORAGE_KEY,
  TutorialOnboardingStateService,
} from '../../core/tutorial-onboarding-state.service';
import { emptyWorkspace } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  useMemoryStorage();
  it('provides a compact account and tutorial help surface without a page launcher', async () => {
    const fixture = await render(SettingsPage);
    const element = fixture.nativeElement as HTMLElement;
    const tutorial = fixture.debugElement
      .query(By.directive(TutorialSurfaceDirective))
      ?.injector.get(TutorialSurfaceDirective);

    expect(tutorial?.appTutorialSurface()).toBe('settings');
    expect(element.querySelector('[data-tour="settings.account"]')).not.toBeNull();
    expect(element.querySelector('[data-tour="settings.tutorials"]')).not.toBeNull();
    expect(element.querySelector('app-tutorial-launcher')).toBeNull();
  });
  it('keeps one page title and nests account synchronization as a section', async () => {
    const fixture = await render(SettingsPage);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('h1')).toHaveLength(1);
    expect(
      element.querySelector('app-account-page .account-heading h2#account-page-title')?.textContent,
    ).toContain('Conta e sincronização');
    expect(element.querySelector('app-account-page .tool-page')).toBeNull();
  });
  it('previews a valid backup and replaces only after the checkbox is selected', async () => {
    const fixture = await render(SettingsPage, {}, [
      {
        provide: IdentityService,
        useValue: {
          initialize: async () => undefined,
          ready: signal(true),
          enabled: signal(false),
          authenticated: signal(false),
          userId: signal(''),
          error: signal('offline'),
        },
      },
    ]);
    const content = fixture.nativeElement as HTMLElement;
    expect(content.textContent).toContain('Exportar backup completo');
    expect(content.textContent).toContain('Importar backup');
    expect(content.textContent).not.toContain('Consultar meus dados salvos');
    expect(content.textContent).toContain('Tentar novamente');
    const page = fixture.componentInstance;
    const backup = { ...emptyWorkspace(), region: 'eu' };
    const event = {
      target: { files: [{ size: 100, text: async () => JSON.stringify(backup) }] },
    } as unknown as Event;
    await page.read(event);
    expect(page.candidate()?.region).toBe('eu');
    page.replace();
    expect(TestBed.inject(WorkspaceStore).data().region).toBe('sa');
    page.confirmReplace = true;
    page.replace();
    expect(TestBed.inject(WorkspaceStore).data().region).toBe('eu');
  });

  it('resets onboarding only after confirmation and reports success', async () => {
    const fixture = await render(SettingsPage);
    const content = fixture.nativeElement as HTMLElement;
    const store = TestBed.inject(WorkspaceStore);
    const onboarding = TestBed.inject(TutorialOnboardingStateService);
    const beforeData = structuredClone(store.data());
    const exportBackup = vi.spyOn(store, 'exportBackup');
    localStorage.setItem('black-market-privacy', 'necessary');
    onboarding.markSeen('settings', 'revision-1', 'completed');

    const request = content.querySelector<HTMLButtonElement>('[data-action="reset-tutorials"]');
    expect(request).not.toBeNull();
    request!.click();
    fixture.detectChanges();

    expect(content.querySelector('[data-reset-confirmation][role="group"]')).not.toBeNull();
    expect(onboarding.hasSeen('settings', 'revision-1')).toBe(true);

    content.querySelector<HTMLButtonElement>('[data-action="cancel-tutorial-reset"]')!.click();
    fixture.detectChanges();
    expect(content.querySelector('[data-reset-confirmation]')).toBeNull();
    expect(content.querySelector('[data-action="reset-tutorials-confirm"]')).toBeNull();
    expect(onboarding.hasSeen('settings', 'revision-1')).toBe(true);
    expect(document.activeElement).toBe(request);

    content.querySelector<HTMLButtonElement>('[data-action="reset-tutorials"]')!.click();
    fixture.detectChanges();
    content.querySelector<HTMLButtonElement>('[data-action="reset-tutorials-confirm"]')!.click();
    fixture.detectChanges();

    expect(onboarding.hasSeen('settings', 'revision-1')).toBe(false);
    expect(localStorage.getItem('black-market-privacy')).toBe('necessary');
    expect(store.data()).toEqual(beforeData);
    expect(exportBackup).not.toHaveBeenCalled();
    expect(content.querySelector('[role="status"]')?.textContent).toContain(
      'As apresentações serão exibidas novamente',
    );
    expect(document.activeElement).toBe(request);
    expect(localStorage.getItem(TUTORIAL_ONBOARDING_STORAGE_KEY)).toBeNull();
  });
});
