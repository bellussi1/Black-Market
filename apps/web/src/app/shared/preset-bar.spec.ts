import { TestBed } from '@angular/core/testing';
import { defaultTax } from '@bdo/calculators';
import { describe, expect, it, vi } from 'vitest';

import { WorkspaceStore } from '../core/workspace-store';
import { renderComponent, useMemoryStorage } from '../testing/test-setup';
import { PresetBar } from './preset-bar';

describe('PresetBar', () => {
  useMemoryStorage();
  const value = { ...defaultTax, price: '100', quantity: 1, cost: '0' };

  it('saves a preset from the rendered form and emits a copy when loaded', async () => {
    const fixture = await renderComponent(PresetBar, { tool: 'market', value });
    const host = fixture.nativeElement as HTMLElement;
    const name = host.querySelector<HTMLInputElement>('input')!;
    name.value = 'Minha coleta';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    await fixture.whenStable();
    fixture.detectChanges();
    host.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    const saved = TestBed.inject(WorkspaceStore).data().presets[0];
    expect(saved.name).toBe('Minha coleta');
    expect(saved.region).toBe('sa');
    fixture.componentInstance.selected.set(saved.id);
    const loaded = vi.fn();
    fixture.componentInstance.loaded.subscribe(loaded);
    fixture.componentInstance.load();
    expect(loaded).toHaveBeenCalledWith(value);
    expect(loaded.mock.calls[0][0]).not.toBe(saved.input);
  });

  it('keeps the name and reports invalid values without saving a preset', async () => {
    const fixture = await renderComponent(PresetBar, {
      tool: 'market',
      value: { ...value, price: '-1' },
    });
    fixture.componentInstance.name.set('Corrigir depois');
    fixture.componentInstance.save();
    expect(TestBed.inject(WorkspaceStore).data().presets).toHaveLength(0);
    expect(fixture.componentInstance.name()).toBe('Corrigir depois');
    expect(TestBed.inject(WorkspaceStore).message()).not.toBe('');
  });
});
