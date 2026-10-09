import { describe, expect, it, vi } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { RecipeGraph } from './recipe-graph';
import { layoutRecipeGraph } from './recipe-graph-model';
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
    expect(graph.zoom()).toBe(0.005);
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
  it('keeps the world point under the wheel cursor fixed and prevents page scrolling', async () => {
    const fixture = await renderComponent(RecipeGraph, {
      root: nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root'),
    });
    const graph = fixture.componentInstance;
    const viewport: HTMLElement = fixture.nativeElement.querySelector('.graph-viewport');
    graph.pan.set({ x: 20, y: 30 });
    const wheel = new WheelEvent('wheel', {
      clientX: 180,
      clientY: 150,
      deltaY: -120,
      bubbles: true,
      cancelable: true,
    });
    viewport.dispatchEvent(wheel);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(wheel.defaultPrevented).toBe(true);
    expect(graph.zoom()).toBeGreaterThan(1);
    expect((180 - graph.pan().x) / graph.zoom()).toBeCloseTo(160, 5);
    expect((150 - graph.pan().y) / graph.zoom()).toBeCloseTo(120, 5);
  });
  it('does not move existing nodes when adding or hiding a dependency branch', async () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [0, 1, 2].map((i) =>
      nodeFor({ itemId: i + 2, name: 'Material ' + i, quantity: '1' }, 'root/' + i),
    );
    const fixture = await renderComponent(RecipeGraph, { root });
    const initial = fixture.componentInstance
      .layout()
      .nodes.map(({ node, x, y }) => ({ path: node.path, x, y }));
    const expanded = {
      ...root,
      children: root.children.map((node, i) =>
        i === 0
          ? {
              ...node,
              expanded: true,
              children: [0, 1].map((j) =>
                nodeFor({ itemId: j + 8, name: 'Dependência', quantity: '1' }, 'root/0/' + j),
              ),
            }
          : node,
      ),
    };
    fixture.componentRef.setInput('root', expanded);
    fixture.detectChanges();
    const graph = fixture.componentInstance;
    for (const before of initial) {
      expect(graph.layout().nodes.find((n) => n.node.path === before.path)).toMatchObject({
        x: before.x,
        y: before.y,
      });
    }
    const childPosition = graph.layout().nodes.find((n) => n.node.path === 'root/0/0')!;
    fixture.componentRef.setInput('root', {
      ...expanded,
      children: expanded.children.map((n, i) => (i === 0 ? { ...n, expanded: false } : n)),
    });
    fixture.detectChanges();
    expect(graph.layout().nodes).toHaveLength(4);
    fixture.componentRef.setInput('root', expanded);
    fixture.detectChanges();
    expect(graph.layout().nodes.find((n) => n.node.path === 'root/0/0')).toMatchObject({
      x: childPosition.x,
      y: childPosition.y,
    });
  });
  it('fits the full height of a deep graph inside the viewport', async () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    let last = root;
    for (let i = 0; i < 8; i++) {
      last.expanded = true;
      const next = nodeFor({ itemId: i + 2, name: 'Etapa', quantity: '1' }, last.path + '/0');
      last.children = [next];
      last = next;
    }
    const fixture = await renderComponent(RecipeGraph, { root });
    const viewport = fixture.nativeElement.querySelector('.graph-viewport');
    Object.defineProperties(viewport, {
      clientWidth: { value: 800 },
      clientHeight: { value: 600 },
    });
    const graph = fixture.componentInstance;
    graph.fit();
    for (const node of graph.layout().nodes) {
      expect(node.y * graph.zoom() + graph.pan().y).toBeGreaterThanOrEqual(0);
      expect((node.y + 168) * graph.zoom() + graph.pan().y).toBeLessThanOrEqual(600);
    }
  });
  it('connects measured card bottoms and moves only descendants of a growing card', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [0, 1].map((i) =>
      nodeFor({ itemId: i + 2, name: 'Material', quantity: '1' }, 'root/' + i),
    );
    root.children[0].expanded = true;
    root.children[0].children = [nodeFor({ itemId: 4, name: 'Insumo', quantity: '1' }, 'root/0/0')];
    const state = {
      positions: new Map(),
      sizes: new Map<string, { width: number; height: number }>(),
    };
    const before = layoutRecipeGraph(root, '', new Map(), state);
    const sibling = before.nodes.find((n) => n.node.path === 'root/1')!;
    const parent = before.nodes.find((n) => n.node.path === 'root/0')!;
    state.sizes.set('root/0', { width: 248, height: 480 });
    const after = layoutRecipeGraph(root, '', new Map(), state);
    expect(after.nodes.find((n) => n.node.path === 'root/1')).toMatchObject({
      x: sibling.x,
      y: sibling.y,
    });
    expect(after.nodes.find((n) => n.node.path === 'root/0/0')!.y).toBeGreaterThan(parent.y + 480);
    expect(after.edges.find((e) => e.from === 'root/0')!.d).toContain(
      `M ${parent.x + 124} ${parent.y + 480}`,
    );
  });
  it('does not turn dragging a card into expansion and ignores tiny movements', async () => {
    const fixture = await renderComponent(RecipeGraph, {
      root: nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root'),
    });
    const graph = fixture.componentInstance;
    const viewport = fixture.nativeElement.querySelector('.graph-viewport');
    const card = fixture.nativeElement.querySelector('.node-select');
    const actions: unknown[] = [];
    graph.action.subscribe((a) => actions.push(a));
    const event = (x: number, y: number) =>
      ({
        button: 0,
        pointerId: 1,
        clientX: x,
        clientY: y,
        target: card,
        currentTarget: viewport,
        preventDefault: () => {},
      }) as PointerEvent;
    const before = graph.pan();
    graph.start(event(100, 100));
    graph.move(event(102, 101));
    expect(graph.pan()).toEqual(before);
    graph.move(event(130, 115));
    graph.end();
    card.click();
    expect(graph.pan()).toEqual({ x: before.x + 30, y: before.y + 15 });
    expect(actions).toEqual([]);
    graph.start(event(100, 100));
    graph.end();
    card.click();
    expect(actions).toContainEqual({ path: 'root', action: 'expand' });
  });
  it('prevents a growing card from overlapping descendants of a different branch', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [0, 1, 2].map((i) =>
      nodeFor({ itemId: i + 2, name: 'Material', quantity: '1' }, 'root/' + i),
    );
    const state = {
      positions: new Map(),
      sizes: new Map<string, { width: number; height: number }>(),
    };
    layoutRecipeGraph(root, '', new Map(), state);
    root.children[0].expanded = true;
    root.children[0].children = [0, 1, 2].map((i) =>
      nodeFor({ itemId: i + 8, name: 'Insumo', quantity: '1' }, 'root/0/' + i),
    );
    layoutRecipeGraph(root, '', new Map(), state);
    state.sizes.set('root/1', { width: 248, height: 480 });
    const nodes = layoutRecipeGraph(root, '', new Map(), state).nodes;
    for (let i = 0; i < nodes.length; i++)
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i],
          b = nodes[j];
        expect(
          a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y,
        ).toBe(false);
      }
  });
  it('never zooms in when decreasing zoom after fitting a very wide graph', async () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = Array.from({ length: 40 }, (_, i) =>
      nodeFor({ itemId: i + 2, name: 'Material', quantity: '1' }, 'root/' + i),
    );
    const fixture = await renderComponent(RecipeGraph, { root });
    const viewport = fixture.nativeElement.querySelector('.graph-viewport');
    Object.defineProperties(viewport, {
      clientWidth: { value: 800 },
      clientHeight: { value: 600 },
    });
    const graph = fixture.componentInstance;
    graph.fit();
    const fitted = graph.zoom();
    expect(fitted).toBeLessThan(0.08);
    graph.scale(-0.15);
    expect(graph.zoom()).toBeLessThanOrEqual(fitted);
  });
  it('respects cached tall dimensions on the first layout of a new root session', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [nodeFor({ itemId: 2, name: 'Insumo', quantity: '1' }, 'root/0')];
    const state = { positions: new Map(), sizes: new Map([['root', { width: 248, height: 480 }]]) };
    const graph = layoutRecipeGraph(root, '', new Map(), state);
    expect(graph.nodes[1].y).toBeGreaterThanOrEqual(graph.nodes[0].y + 480 + 64);
  });
});
