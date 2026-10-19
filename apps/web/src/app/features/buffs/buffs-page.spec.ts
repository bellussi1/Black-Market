import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { emptyWorkspace } from '../../core/workspace-models';
import { WorkspaceStore } from '../../core/workspace-store';
import { renderComponent as render, useMemoryStorage } from '../../testing/test-setup';
import { BuffsPage } from './buffs-page';

describe('BuffsPage', () => {
  useMemoryStorage();

  it('uses the shared page hierarchy and groups the active setup action', async () => {
    const fixture = await render(BuffsPage);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.tool-page > header.tool-heading h1')?.textContent).toContain(
      'Sua combinação, pronta',
    );
    expect(element.querySelector('button')?.textContent).toContain('Salvar buff');
  });

  it('activates one buff per exclusive group and removes expired effects from totals', async () => {
    const fixture = await render(BuffsPage);
    const page = fixture.componentInstance;
    const base = {
      group: 'Food',
      effect: 'XP',
      value: 10,
      unit: '%',
      duration: 1,
      enabled: false,
      startedAt: null,
    };
    const first = { ...base, id: 'one', name: 'Buff A' };
    const second = { ...base, id: 'two', name: 'Buff B', value: 20 };
    TestBed.inject(WorkspaceStore).replace({ ...emptyWorkspace(), buffs: [first, second] });
    page.toggle(first);
    page.toggle(second);
    expect(page.active().map((r) => r.id)).toEqual(['two']);
    page.start();
    page.now.set(Date.now() + 61_000);
    expect(page.totals()).toHaveLength(0);
  });
});
