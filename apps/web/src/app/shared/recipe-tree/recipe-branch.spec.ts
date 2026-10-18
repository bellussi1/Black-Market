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
  it('reserves an accessible skeleton while loading an ingredient recipe', async () => {
    const node = ready();
    node.loading = true;
    const fixture = await renderComponent(RecipeBranch, { node });

    expect(fixture.nativeElement.querySelector('.ingredient')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(
      fixture.nativeElement.querySelector('.step-hint-loading-line')?.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(
      fixture.nativeElement.querySelector('.step-hint-loading [role="status"]'),
    ).not.toBeNull();
  });
  it('shows the same recipe structure without asking for yield input', async () => {
    const node = ready();
    node.yield = null;
    const fixture = await renderComponent(RecipeBranch, { node });
    expect(fixture.nativeElement.querySelector('input, select')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-recipe-branch')).not.toBeNull();
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
    expect(fixture.nativeElement.querySelector('.step-settings')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Comprar em vez de produzir');
  });
  it('opens the shared item details for adjustments instead of editing the visual steps', async () => {
    const fixture = await renderComponent(RecipeBranch, { node: ready() });
    const emit = vi.spyOn(fixture.componentInstance.action, 'emit');
    (fixture.nativeElement.querySelector('.step-source') as HTMLButtonElement).click();
    expect(emit).toHaveBeenCalledWith({ path: 'root/0', action: 'source', value: undefined });
    expect(fixture.nativeElement.querySelector('input, select')).toBeNull();
  });
});
