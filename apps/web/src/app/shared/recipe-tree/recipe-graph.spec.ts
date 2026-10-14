import { describe, expect, it, vi } from 'vitest';

import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
import { RecipeGraph } from './recipe-graph';
import { layoutRecipeGraph } from './recipe-graph-model';
import { nodeFor } from './recipe-tree-model';
describe('Accessible graph controls', () => {
  useMemoryStorage();
  it('reserves all shallow ingredients before spending the node limit on earlier branches', () => {
    const root = nodeFor({ itemId: 1, name: 'Raiz', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [2, 3, 4, 5, 6].map((id, i) => ({
      ...nodeFor({ itemId: id, name: 'Fármaco', quantity: '10' }, `root/${i}`),
      expanded: true,
      children: Array.from({ length: 50 }, (_, j) =>
        nodeFor({ itemId: 100 + j, name: 'Ingrediente', quantity: '1' }, `root/${i}/${j}`),
      ),
    }));
    const layout = layoutRecipeGraph(root);
    expect(layout.nodes).toHaveLength(200);
    expect(layout.truncated).toBe(true);
    expect(
      root.children.every((child) => layout.nodes.some((entry) => entry.node.path === child.path)),
    ).toBe(true);
  });
  it('shows available variants on the card and emits the chosen recipe key', async () => {
    const root = nodeFor({ itemId: 1389, name: 'Fármaco da Raiva', quantity: '10' }, 'root');
    root.options = ['base', 'superior'].map((key) => ({
      key,
      type: key === 'base' ? 'SIMPLE_ALCHEMY' : 'ALCHEMY',
      station: null,
      inputs: [],
      outputs: [root.part],
    }));
    const fixture = await renderComponent(RecipeGraph, { root });
    const emit = vi.spyOn(fixture.componentInstance.action, 'emit');
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    expect(select).not.toBeNull();
    select.value = 'superior';
    select.dispatchEvent(new Event('change'));
    expect(emit).toHaveBeenCalledWith({ path: 'root', action: 'choose', value: 'superior' });
    expect(fixture.nativeElement.textContent).toContain('Escolher método de produção');
  });

  it('shows icons and item names for every equivalent ingredient in the graph', async () => {
    const alternatives = [
      {
        recipeKey: 'lion-meat',
        part: {
          itemId: 902,
          name: 'Carne de Leão',
          quantity: '2',
          iconUrl: '/icons/lion-meat.png',
        },
      },
      {
        recipeKey: 'goat-meat',
        part: {
          itemId: 901,
          name: 'Carne de Cabra',
          quantity: '3',
          iconUrl: '/icons/goat-meat.png',
        },
      },
    ];
    const root = nodeFor({ itemId: 100, name: 'Receita', quantity: '1' }, 'root');
    root.expanded = true;
    const ingredient = nodeFor(alternatives[0]!.part, 'root/0');
    ingredient.substitutions = alternatives;
    root.children = [ingredient];

    const fixture = await renderComponent(RecipeGraph, { root });
    const choices = fixture.nativeElement.querySelectorAll('.ingredient-alternative');

    expect(choices).toHaveLength(2);
    expect(choices[0].textContent).toContain('Carne de Leão');
    expect(choices[0].querySelector('app-item-icon')?.getAttribute('title')).toContain(
      'Carne de Leão',
    );
    expect(choices[1].textContent).toContain('Carne de Cabra');
    expect(choices[1].querySelector('app-item-icon')?.getAttribute('title')).toContain(
      'Carne de Cabra',
    );
    const emit = vi.spyOn(fixture.componentInstance.action, 'emit');
    const goatChoice = choices[1].querySelector('input') as HTMLInputElement;
    goatChoice.checked = true;
    goatChoice.dispatchEvent(new Event('change'));
    expect(emit).toHaveBeenCalledWith({ path: 'root', action: 'choose', value: 'goat-meat' });
  });
  it('aligns each tier below its tallest card and keeps sibling branch spans separate', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [2, 3].map((id, i) => ({
      ...nodeFor({ itemId: id, name: 'Material', quantity: '1' }, `root/${i}`),
      expanded: true,
      children: Array.from({ length: i === 0 ? 3 : 2 }, (_, j) =>
        nodeFor({ itemId: 10 + i * 3 + j, name: 'Insumo', quantity: '1' }, `root/${i}/${j}`),
      ),
    }));
    const graph = layoutRecipeGraph(root, '', new Map(), {
      positions: new Map(),
      sizes: new Map([['root/0', { width: 248, height: 480 }]]),
    });
    for (const depth of [0, 1, 2])
      expect(
        new Set(graph.nodes.filter((node) => node.depth === depth).map((node) => node.y)).size,
      ).toBe(1);
    const first = graph.nodes.find((node) => node.node.path === 'root/0')!;
    expect(graph.nodes.find((node) => node.node.path === 'root/0/0')!.y).toBeGreaterThanOrEqual(
      first.y + 480 + 96,
    );
    const left = graph.nodes.filter((node) => node.node.path.startsWith('root/0/'));
    const right = graph.nodes.filter((node) => node.node.path.startsWith('root/1/'));
    expect(Math.max(...left.map((node) => node.x + node.width))).toBeLessThan(
      Math.min(...right.map((node) => node.x)),
    );
  });
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
    expect(selected).not.toHaveBeenCalledWith({ path: 'root', action: 'source' });
    expect(selected).not.toHaveBeenCalledWith({ path: 'root', action: 'expand' });
    fixture.nativeElement.querySelector('.node-details').click();
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
  it('keeps tier rows and restores branch placement when hiding and reopening dependencies', async () => {
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
  it('anchors the selected card on screen when a tier expands horizontally', async () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = [2, 3].map((id, i) =>
      nodeFor({ itemId: id, name: 'Material', quantity: '1' }, `root/${i}`),
    );
    const fixture = await renderComponent(RecipeGraph, { root, selected: 'root/0' });
    const viewport = fixture.nativeElement.querySelector('.graph-viewport');
    Object.defineProperties(viewport, {
      clientWidth: { value: 800 },
      clientHeight: { value: 600 },
    });
    await new Promise((resolve) => setTimeout(resolve, 40));
    fixture.detectChanges();
    const graph = fixture.componentInstance;
    graph.zoom.set(0.7);
    graph.pan.set({ x: 100, y: 20 });
    const before = graph.layout().nodes.find((entry) => entry.node.path === 'root/0')!;
    const screenX = before.x * graph.zoom() + graph.pan().x;
    fixture.componentRef.setInput('root', {
      ...root,
      children: root.children.map((node, i) =>
        i
          ? node
          : {
              ...node,
              expanded: true,
              children: [4, 5].map((id, j) =>
                nodeFor({ itemId: id, name: 'Insumo', quantity: '1' }, `${node.path}/${j}`),
              ),
            },
      ),
    });
    fixture.detectChanges();
    const after = graph.layout().nodes.find((entry) => entry.node.path === 'root/0')!;
    expect(after.x).not.toBe(before.x);
    expect(after.x * graph.zoom() + graph.pan().x).toBeCloseTo(screenX);
    expect(graph.zoom()).toBe(0.7);
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
    expect(actions).toEqual([]);
    fixture.nativeElement.querySelector('.expand-node').click();
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

  it('places all siblings on one tier with their parent centered above them', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = Array.from({ length: 5 }, (_, index) =>
      nodeFor({ itemId: index + 2, name: 'Ingrediente', quantity: '1' }, `root/${index}`),
    );
    const graph = layoutRecipeGraph(root);
    const parent = graph.nodes[0];
    expect(new Set(graph.nodes.slice(1).map((entry) => entry.y)).size).toBe(1);
    expect(parent.x + parent.width / 2).toBe((graph.nodes[1].x + graph.nodes.at(-1)!.x + 248) / 2);
    for (const child of graph.nodes.slice(1)) {
      expect(child.y).toBeGreaterThanOrEqual(parent.y + parent.height + 64);
      expect(child.y).toBe(graph.nodes[1].y);
    }
    expect(graph.bounds.height).toBeLessThan(600);
  });
  it('lays out a wide tier without wrapping siblings or overlapping cards', () => {
    const root = nodeFor({ itemId: 1, name: 'Produto', quantity: '1' }, 'root');
    root.expanded = true;
    root.children = Array.from({ length: 9 }, (_, index) =>
      nodeFor({ itemId: index + 2, name: 'Ingrediente', quantity: '1' }, `root/${index}`),
    );
    const balanced = layoutRecipeGraph(root, '', new Map(), {
      positions: new Map(),
      sizes: new Map(),
    });
    expect(new Set(balanced.nodes.slice(1).map((entry) => entry.y)).size).toBe(1);
    expect(balanced.bounds.width).toBeGreaterThan(2000);
    expect(balanced.bounds.height).toBeLessThan(600);
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
      { positions, sizes: new Map() },
    );
    const method = graph.sources.find((node) => node.path === 'root/0/workers')!;
    const location = graph.sources.find((node) => node.path === 'root/1/workers/b')!;
    expect(location.y).toBeGreaterThanOrEqual(method.y + method.height + 48);
  });

  it('places expanded ingredients together on the next tier while preserving zoom', async () => {
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
      y: parent.y,
    });
    const nodes = graph.layout().nodes;
    expect(graph.layout().bounds.width).toBeLessThanOrEqual(1800);
    for (const child of nodes.filter((entry) => entry.node.path.startsWith('root/0/'))) {
      expect(child.y).toBeGreaterThanOrEqual(parent.y + parent.height + 64);
      const movedParent = graph.layout().nodes.find((entry) => entry.node.path === 'root/0')!;
      expect(Math.abs(child.x - movedParent.x)).toBeLessThanOrEqual(600);
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

  it('keeps sibling tiers intact in a narrow viewport and during zoom', async () => {
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
    expect(
      new Set(
        graph
          .layout()
          .nodes.filter((entry) => entry.depth === 1)
          .map((entry) => entry.y),
      ).size,
    ).toBe(1);
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

  it('routes fan-out through the empty gutter above the entire child tier', () => {
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
    const y = Number(corridor![2]);
    expect(y).toBeLessThan(intervening.y);
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
