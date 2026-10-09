import { describe, expect, it, vi } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { RecipeGraph } from './recipe-graph';
import { nodeFor } from './recipe-tree-model';
describe('Accessible graph controls', () => {
  useMemoryStorage();
  it('emits node selection and bounds zoom without changing the recipe', async () => {
    const root = nodeFor({ itemId: 5301, name: 'Reagente', quantity: '1' }, 'root');
    const fixture = await renderComponent(RecipeGraph, { root }),
      graph = fixture.componentInstance,
      selected = vi.fn();
    graph.action.subscribe(selected);
    fixture.nativeElement.querySelector('.node-select').click();
    expect(fixture.nativeElement.querySelector('.node-select').getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(selected).toHaveBeenCalledWith({ path: 'root', action: 'source' });
    graph.scale(100);
    expect(graph.zoom()).toBe(1.75);
    graph.scale(-100);
    expect(graph.zoom()).toBe(0.35);
    expect(root.children).toEqual([]);
  });
  it('pans with keyboard arrows and collapses the visual focus without losing nodes', async () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [nodeFor({ itemId: 2, name: 'Material', quantity: '1' }, 'root/0')];
    const fixture = await renderComponent(RecipeGraph, { root, selected: 'root/0' }),
      graph = fixture.componentInstance,
      viewport = fixture.nativeElement.querySelector('.graph-viewport');
    const before = graph.pan().x;
    viewport.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
    );
    expect(graph.pan().x).toBe(before + 40);
    graph.focusBranch();
    expect(graph.focus()).toBe('root/0');
    graph.focusBranch();
    expect(graph.focus()).toBe('');
    expect(root.children).toHaveLength(1);
  });
});
