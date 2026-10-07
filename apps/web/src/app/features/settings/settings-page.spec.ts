import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { SettingsPage } from './settings-page';
import { WorkspaceStore } from '../../core/workspace-store';
import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';
import { emptyWorkspace } from '../../core/workspace-models';

describe('SettingsPage', () => {
  useMemoryStorage();
  it('previews a valid backup and replaces only after the checkbox is selected', async () => {
    const fixture = await render(SettingsPage);
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
