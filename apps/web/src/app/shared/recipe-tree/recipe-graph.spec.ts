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
  it('never zooms in when decreasing zoom after fitting a long graph', async () => {
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
    expect(fitted).toBeLessThan(1);
    expect(graph.layout().bounds.height * fitted).toBeLessThanOrEqual(600);
    expect(graph.layout().bounds.width * fitted).toBeLessThanOrEqual(800);
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

  it('stacks a large initial recipe downwards within two nearby columns', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = Array.from({ length: 5 }, (_, index) =>
      nodeFor({ itemId: index + 2, name: 'Ingrediente', quantity: '1' }, `root/${index}`),
    );
    const graph = layoutRecipeGraph(root);
    const parent = graph.nodes[0];
    expect(new Set(graph.nodes.slice(1).map((entry) => entry.x)).size).toBeLessThanOrEqual(2);
    expect(graph.bounds.width).toBeLessThanOrEqual(600);
    for (const child of graph.nodes.slice(1)) {
      expect(child.y).toBeGreaterThanOrEqual(parent.y + parent.height + 64);
      expect(Math.abs(child.x - parent.x)).toBeLessThanOrEqual(284);
    }
    expect(graph.bounds.height).toBeGreaterThan(700);
  });
  it('balances a large recipe across four columns with fewer rows and no overlaps', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = Array.from({ length: 9 }, (_, index) =>
      nodeFor({ itemId: index + 2, name: 'Ingrediente', quantity: '1' }, `root/${index}`),
    );
    const narrow = layoutRecipeGraph(root);
    const balanced = layoutRecipeGraph(root, '', new Map(), {
      positions: new Map(),
      sizes: new Map(),
      columns: 4,
    });
    expect(new Set(balanced.nodes.slice(1).map((entry) => entry.x)).size).toBe(4);
    expect(balanced.bounds.width).toBeLessThanOrEqual(1150);
    expect(balanced.bounds.height).toBeLessThan(narrow.bounds.height);
    for (const a of balanced.nodes)
      for (const b of balanced.nodes) {
        if (a === b) continue;
        expect(
          a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y + b.height &&
            a.y + a.height > b.y,
        ).toBe(false);
      }
  });
  it('keeps a moved acquisition location from overlapping an already placed method', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [2, 3].map((id, i) => ({
      ...nodeFor({ itemId: id, name: 'Material', quantity: '1' }, `root/${i}`),
      expanded: true,
    }));
    const source = (id: string) => ({
      id,
      name: id,
      territory: null,
      managerNode: null,
      contribution: null,
      position: null,
    });
    const positions = new Map([
      ['root', { x: 450, y: 24, width: 248, height: 200, identity: '1' }],
      ['root/0', { x: 24, y: 324, width: 248, height: 200, identity: '2' }],
      ['root/1', { x: 308, y: 560, width: 248, height: 200, identity: '3' }],
      ['root/0/workers', { x: 24, y: 1100, width: 248, height: 176, identity: 'method' }],
      ['root/1/workers', { x: 308, y: 824, width: 248, height: 176, identity: 'method' }],
      ['root/1/workers/b', { x: 24, y: 800, width: 248, height: 176, identity: 'b' }],
    ]);
    const graph = layoutRecipeGraph(
      root,
      '',
      new Map([
        [2, [source('a')]],
        [3, [source('b')]],
      ]),
      { positions, sizes: new Map(), columns: 4 },
    );
    const method = graph.sources.find((node) => node.path === 'root/0/workers')!;
    const location = graph.sources.find((node) => node.path === 'root/1/workers/b')!;
    expect(location.y).toBeGreaterThanOrEqual(method.y + method.height + 48);
  });

  it('places five expanded ingredients below their parent within bounded balanced columns', async () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [0, 1].map((index) =>
      nodeFor({ itemId: index + 2, name: 'Ingrediente', quantity: '1' }, `root/${index}`),
    );
    const fixture = await renderComponent(RecipeGraph, { root });
    const graph = fixture.componentInstance;
    graph.pan.set({ x: -90, y: -35 });
    graph.zoom.set(0.7);
    const parent = graph.layout().nodes.find((entry) => entry.node.path === 'root/0')!;
    const expanded = {
      ...root,
      children: root.children.map((node, index) =>
        index === 0
          ? {
              ...node,
              expanded: true,
              children: Array.from({ length: 5 }, (_, child) =>
                nodeFor(
                  { itemId: child + 8, name: 'Material dependente', quantity: '1' },
                  `root/0/${child}`,
                ),
              ),
            }
          : node,
      ),
    };
    fixture.componentRef.setInput('root', expanded);
    fixture.detectChanges();
    expect(graph.pan()).toEqual({ x: -90, y: -35 });
    expect(graph.zoom()).toBe(0.7);
    expect(graph.layout().nodes.find((entry) => entry.node.path === 'root/0')).toMatchObject({
      x: parent.x,
      y: parent.y,
    });
    const nodes = graph.layout().nodes;
    expect(graph.layout().bounds.width).toBeLessThanOrEqual(1150);
    for (const child of nodes.filter((entry) => entry.node.path.startsWith('root/0/'))) {
      expect(child.y).toBeGreaterThanOrEqual(parent.y + parent.height + 64);
      expect(Math.abs(child.x - parent.x)).toBeLessThanOrEqual(852);
    }
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

  it('marks the root distinctly and selects the entire ancestry when a deep card is clicked', async () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [
      nodeFor({ itemId: 2, name: 'Material', quantity: '1' }, 'root/0'),
      nodeFor({ itemId: 3, name: 'Outro', quantity: '1' }, 'root/1'),
    ];
    root.children[0].expanded = true;
    root.children[0].children = [nodeFor({ itemId: 4, name: 'Base', quantity: '1' }, 'root/0/0')];
    const fixture = await renderComponent(RecipeGraph, { root });
    fixture.nativeElement.querySelector('[data-node-path="root/0/0"] .node-select').click();
    fixture.detectChanges();
    expect(
      fixture.nativeElement
        .querySelector('[data-node-path="root"]')
        .classList.contains('root-node'),
    ).toBe(true);
    expect(
      [...fixture.nativeElement.querySelectorAll('.graph-node.on-path')].map(
        (node: HTMLElement) => node.dataset['nodePath'],
      ),
    ).toEqual(['root', 'root/0', 'root/0/0']);
    expect(fixture.nativeElement.querySelectorAll('.graph-links path.highlight')).toHaveLength(2);
  });

  it('uses one world-space column for a narrow viewport and preserves it during zoom', async () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = Array.from({ length: 5 }, (_, index) =>
      nodeFor({ itemId: index + 2, name: 'Ingrediente', quantity: '1' }, `root/${index}`),
    );
    const fixture = await renderComponent(RecipeGraph, { root });
    const viewport = fixture.nativeElement.querySelector('.graph-viewport');
    Object.defineProperties(viewport, {
      clientWidth: { value: 380 },
      clientHeight: { value: 600 },
    });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 40));
    fixture.detectChanges();
    const graph = fixture.componentInstance;
    expect(new Set(graph.layout().nodes.map((entry) => entry.x)).size).toBe(1);
    const positions = graph.layout().nodes.map((entry) => ({ x: entry.x, y: entry.y }));
    graph.scale(0.15);
    expect(graph.layout().nodes.map((entry) => ({ x: entry.x, y: entry.y }))).toEqual(positions);
  });

  it('highlights acquisition methods and their complete item ancestry when choosing a source', async () => {
    const root = nodeFor({ itemId: 1, name: 'Madeira', quantity: '1' }, 'root');
    root.expanded = true;
    const source = {
      id: 'node:1',
      name: 'Floresta',
      territory: null,
      managerNode: null,
      contribution: 1,
      position: null,
    };
    const fixture = await renderComponent(RecipeGraph, { root, origins: new Map([[1, [source]]]) });
    fixture.nativeElement
      .querySelector('[data-node-path="root/workers/node:1"] .node-select')
      .click();
    fixture.detectChanges();
    expect(
      [...fixture.nativeElement.querySelectorAll('.graph-node.on-path')].map(
        (node: HTMLElement) => node.dataset['nodePath'],
      ),
    ).toEqual(['root', 'root/workers', 'root/workers/node:1']);
    expect(fixture.nativeElement.querySelectorAll('.graph-links path.highlight')).toHaveLength(2);
  });

  it('routes connections to lower siblings through a free corridor beside the intervening cards', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = Array.from({ length: 5 }, (_, index) =>
      nodeFor({ itemId: index + 2, name: 'Ingrediente', quantity: '1' }, `root/${index}`),
    );
    const graph = layoutRecipeGraph(root);
    const edge = graph.edges.find((entry) => entry.to === 'root/4')!;
    const target = graph.nodes.find((entry) => entry.node.path === 'root/4')!;
    const intervening = graph.nodes.find((entry) => entry.node.path === 'root/2')!;
    const corridor = edge.d.match(/L\s+([\d.]+)\s+([\d.]+)/);
    expect(corridor).not.toBeNull();
    const x = Number(corridor![1]),
      y = Number(corridor![2]);
    expect(x < intervening.x || x > intervening.x + intervening.width).toBe(true);
    expect(y).toBeLessThan(target.y);
  });

  it('centers a selected acquisition location using its measured card box', async () => {
    const root = nodeFor({ itemId: 1, name: 'Madeira', quantity: '1' }, 'root');
    root.expanded = true;
    const source = {
      id: 'node:1',
      name: 'Floresta',
      territory: null,
      managerNode: null,
      contribution: 1,
      position: null,
    };
    const fixture = await renderComponent(RecipeGraph, { root, origins: new Map([[1, [source]]]) });
    const viewport = fixture.nativeElement.querySelector('.graph-viewport');
    Object.defineProperties(viewport, {
      clientWidth: { value: 800 },
      clientHeight: { value: 600 },
    });
    const graph = fixture.componentInstance;
    graph.center('root/workers/node:1');
    const location = graph.layout().sources.find((entry) => entry.path === 'root/workers/node:1')!;
    expect((location.x + location.width / 2) * graph.zoom() + graph.pan().x).toBeCloseTo(400);
    expect((location.y + location.height / 2) * graph.zoom() + graph.pan().y).toBeCloseTo(300);
  });

  it('clears a local descendant selection when switching to a different root item', async () => {
    const root = nodeFor({ itemId: 1, name: 'Primeiro produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [nodeFor({ itemId: 2, name: 'Material', quantity: '1' }, 'root/0')];
    const fixture = await renderComponent(RecipeGraph, { root });
    fixture.nativeElement.querySelector('[data-node-path="root/0"] .node-select').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selection()).toBe('root/0');
    fixture.componentRef.setInput('root', {
      ...root,
      part: { ...root.part, itemId: 10, name: 'Novo produto' },
    });
    fixture.detectChanges();
    expect(fixture.componentInstance.selection()).toBe('root');
  });
});
