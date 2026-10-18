import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { IdentityService } from '../../core/identity.service';
import { emptyWorkspace } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';
import { SettingsPage } from './settings-page';

describe('SettingsPage', () => {
  useMemoryStorage();
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
});
