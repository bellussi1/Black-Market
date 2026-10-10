import { describe, expect, it, vi } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { RecipeBranch } from './recipe-branch';
import { nodeFor, withRecipe } from './recipe-tree-model';

const ready = () =>
  withRecipe(nodeFor({ itemId: 1399, name: 'Fármaco da Harmonia', quantity: '10' }, 'root/0'), {
    key: 'harmony',
    type: 'SIMPLE_ALCHEMY',
    station: null,
    outputs: [{ itemId: 1399, name: 'Fármaco da Harmonia', quantity: '10' }],
    inputs: [{ itemId: 1389, name: 'Fármaco da Raiva', quantity: '10' }],
  });
describe('Simple expandable production steps', () => {
  useMemoryStorage();
  it('lets the user finish a decimal yield before applying it on blur', async () => {
    const node = ready();
    node.yield = null;
    const fixture = await renderComponent(RecipeBranch, { node });
    const emit = vi.spyOn(fixture.componentInstance.action, 'emit');
    const input = fixture.nativeElement.querySelector('.yield-needed input') as HTMLInputElement;
    for (const value of ['2', '2.5']) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.yield-needed input')).toBe(input);
      expect(emit).not.toHaveBeenCalled();
    }
    input.dispatchEvent(new Event('blur'));
    expect(emit).toHaveBeenCalledWith({ path: 'root/0', action: 'yield', value: 2.5 });
  });
  it('makes the ingredient header the primary expand control and hides optional adjustments', async () => {
    const node = ready();
    node.expanded = false;
    const fixture = await renderComponent(RecipeBranch, { node });
    const emit = vi.spyOn(fixture.componentInstance.action, 'emit');
    const button = fixture.nativeElement.querySelector('.step-toggle') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    button.click();
    expect(emit).toHaveBeenCalledWith({ path: 'root/0', action: 'expand', value: undefined });
    expect(fixture.nativeElement.querySelector('.step-settings').open).toBe(false);
    expect(fixture.nativeElement.textContent).not.toContain('Comprar em vez de produzir');
  });
  it('makes missing yield actionable and nests ingredients beneath the same control', async () => {
    const node = ready();
    node.yield = null;
    const fixture = await renderComponent(RecipeBranch, { node });
    expect(fixture.nativeElement.querySelector('.yield-needed input')).not.toBeNull();
    const button = fixture.nativeElement.querySelector('.step-toggle');
    expect(button.getAttribute('aria-controls')).toBe('branch-root/0');
    expect(
      fixture.nativeElement.querySelector('#branch-root\\/0 app-recipe-branch'),
    ).not.toBeNull();
  });
});
