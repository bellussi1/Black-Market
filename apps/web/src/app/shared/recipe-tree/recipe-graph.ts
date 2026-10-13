import type { ElementRef } from '@angular/core';
import {
  afterEveryRender,
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { calculateProduction } from '@bdo/calculators';

import { CatalogApiService } from '../../core/catalog-api.service';
import { recipeTypeLabel } from '../game-labels';
import { ItemIcon } from '../item-icon/item-icon';
import type { BranchAction } from './recipe-branch';
import { batchAlternatives, recipeFamilies } from './recipe-equivalents';
import { fixedRecipeYield } from './recipe-fixed-yields';
import { type GraphLayoutState, isGraphAncestor, layoutRecipeGraph } from './recipe-graph-model';
import { RecipeIngredientAlternatives } from './recipe-ingredient-alternatives';
import type { ItemSources } from './recipe-knowledge';
import type { RecipeNode } from './recipe-tree-model';

@Component({
  selector: 'app-recipe-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemIcon, RecipeIngredientAlternatives],
  templateUrl: './recipe-graph.html',
  styleUrl: './recipe-graph.scss',
})
export class RecipeGraph {
  readonly root = input.required<RecipeNode>();
  readonly allocations = input<ReturnType<typeof calculateProduction>['allocations']>([]);
  readonly selected = input('root');
  private readonly localSelection = signal<{ path: string; ownerPath: string } | null>(null);
  readonly selection = computed(() => this.localSelection()?.path ?? this.selected());
  readonly advanced = input(false);
  readonly action = output<BranchAction>();
  readonly origins = input<ReadonlyMap<number, ItemSources['nodes']>>(new Map());
  readonly locationSelected = output<{ path: string; source: ItemSources['nodes'][number] }>();
  readonly catalog = inject(CatalogApiService);
  readonly zoom = signal(1);
  readonly pan = signal({ x: 24, y: 24 });
  readonly focus = signal('');
  readonly dragging = signal(false);
  readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  readonly ancestor = isGraphAncestor;
  readonly typeLabel = recipeTypeLabel;
  readonly families = (node: RecipeNode) => recipeFamilies(node.options).map((family) => family[0]);
  readonly batches = (node: RecipeNode) =>
    node.recipe ? batchAlternatives(node.recipe, node.options) : [];
  readonly batchSize = (node: RecipeNode) => {
    const output = node.recipe?.outputs.find((part) => part.itemId === node.part.itemId);
    return output?.quantity && Number(output.quantity) > 0
      ? Number(output.quantity)
      : node.recipe
        ? fixedRecipeYield(node.recipe, node.part.itemId)
        : null;
  };
  methodKey(node: RecipeNode) {
    return (
      recipeFamilies(node.options).find((family) =>
        family.some((recipe) => recipe.key === node.recipe?.key),
      )?.[0]?.key ?? ''
    );
  }
  parentPath(path: string) {
    return path.slice(0, path.lastIndexOf('/'));
  }
  substitutionKey(node: RecipeNode) {
    return (
      node.substitutions?.find(
        (c) => c.part.itemId === node.part.itemId && c.part.quantity === node.part.quantity,
      )?.recipeKey ?? ''
    );
  }
  private readonly destroyRef = inject(DestroyRef);
  private readonly sizes = signal<GraphLayoutState['sizes']>(new Map());
  private readonly positions: GraphLayoutState['positions'] = new Map();
  private rootIdentity = '';
  private selectionRootIdentity = '';
  private initialFitPending = true;
  readonly layout = computed(() => {
    const root = this.root();
    const identity = root.part.itemId + ':' + (root.recipe?.key ?? '');
    if (identity !== this.rootIdentity) {
      this.positions.clear();
      this.rootIdentity = identity;
      this.initialFitPending = true;
    }
    return layoutRecipeGraph(root, this.focus(), this.origins(), {
      positions: this.positions,
      sizes: this.sizes(),
    });
  });
  readonly transform = computed(
    () => `translate(${this.pan().x}px, ${this.pan().y}px) scale(${this.zoom()})`,
  );
  private readonly allocationIndex = computed(
    () => new Map(this.allocations().map((row) => [row.path, row])),
  );
  private keyboardNavigation = false;
  private observer?: ResizeObserver;
  private observed = new Set<Element>();
  private measureFrame = 0;
  private wheelFrame = 0;
  private pendingWheel = { delta: 0, x: 0, y: 0 };
  private suppressClick = false;
  private pointers = new Map<number, { x: number; y: number }>();
  private pinch: { distance: number; zoom: number; worldX: number; worldY: number } | null = null;
  private drag: {
    x: number;
    y: number;
    px: number;
    py: number;
    pointer: number;
    target: HTMLElement;
  } | null = null;

  constructor() {
    let previous: ReturnType<typeof layoutRecipeGraph> | null = null;
    let previousIdentity = '';
    effect(() => {
      const layout = this.layout();
      const identity = this.root().part.itemId + ':' + (this.root().recipe?.key ?? '');
      const selected = this.localSelection()?.ownerPath ?? this.selected();
      if (
        previous &&
        previous !== layout &&
        previousIdentity === identity &&
        !this.initialFitPending
      ) {
        const before =
          previous.nodes.find((entry) => entry.node.path === selected) ??
          previous.sources.find((entry) => entry.path === selected);
        const after =
          layout.nodes.find((entry) => entry.node.path === selected) ??
          layout.sources.find((entry) => entry.path === selected);
        if (before && after)
          untracked(() =>
            this.pan.update((pan) => ({
              x: pan.x + (before.x - after.x) * this.zoom(),
              y: pan.y + (before.y - after.y) * this.zoom(),
            })),
          );
      }
      previous = layout;
      previousIdentity = identity;
    });
    effect(() => {
      const root = this.root();
      const identity = root.part.itemId + ':' + (root.recipe?.key ?? '');
      if (this.selectionRootIdentity && identity !== this.selectionRootIdentity)
        this.localSelection.set(null);
      this.selectionRootIdentity = identity;
    });
    effect(() => {
      const selected = this.selected();
      const local = untracked(this.localSelection);
      if (local && local.ownerPath !== selected) this.localSelection.set(null);
    });
    afterNextRender(() => {
      const viewport = this.viewport()?.nativeElement;
      if (!viewport) return;
      viewport.addEventListener('wheel', this.wheel, { passive: false });
      viewport.addEventListener('click', this.clickCapture, true);
      if (typeof ResizeObserver !== 'undefined') {
        this.observer = new ResizeObserver(() => this.scheduleMeasure());
        this.observer.observe(viewport);
      }
      this.refreshObservedNodes();
      this.fit();
      this.destroyRef.onDestroy(() => {
        viewport.removeEventListener('wheel', this.wheel);
        viewport.removeEventListener('click', this.clickCapture, true);
        this.observer?.disconnect();
        cancelAnimationFrame(this.measureFrame);
        cancelAnimationFrame(this.wheelFrame);
        this.end();
      });
    });
    afterEveryRender(() => this.refreshObservedNodes());
    effect(() => {
      const focus = this.focus();
      if (focus && !this.layout().nodes.some((entry) => entry.node.path === focus))
        this.focus.set('');
    });
  }
  private refreshObservedNodes() {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) return;
    const nodes = new Set(viewport.querySelectorAll<HTMLElement>('[data-node-path]'));
    for (const node of this.observed)
      if (!nodes.has(node as HTMLElement)) {
        this.observer?.unobserve(node);
        this.observed.delete(node);
      }
    for (const node of nodes)
      if (!this.observed.has(node)) {
        this.observer?.observe(node);
        this.observed.add(node);
      }
    this.scheduleMeasure();
  }
  private scheduleMeasure() {
    if (this.measureFrame) return;
    this.measureFrame = requestAnimationFrame(() => {
      this.measureFrame = 0;
      const sizes = new Map(this.sizes());
      let changed = false;
      for (const el of this.observed) {
        const node = el as HTMLElement;
        const path = node.dataset['nodePath'];
        if (!path || !node.offsetWidth || !node.offsetHeight) continue;
        const previous = sizes.get(path);
        if (previous?.width !== node.offsetWidth || previous?.height !== node.offsetHeight) {
          sizes.set(path, { width: node.offsetWidth, height: node.offsetHeight });
          changed = true;
        }
      }
      if (changed) this.sizes.set(sizes);
      if (this.initialFitPending && this.viewport()?.nativeElement.clientWidth) {
        this.initialFitPending = false;
        this.fit();
      }
    });
  }
  allocation(path: string) {
    return this.allocationIndex().get(path);
  }
  focusNode(path: string) {
    if (this.keyboardNavigation) this.center(path);
  }
  chooseRecipe(path: string, value: string, selectionPath = path) {
    this.localSelection.set({ path: selectionPath, ownerPath: selectionPath });
    this.action.emit({ path, action: 'choose', value });
  }
  emit(path: string, action: BranchAction['action'], selectionPath = path) {
    this.localSelection.set({ path: selectionPath, ownerPath: path });
    this.action.emit({ path, action });
  }
  selectLocation(path: string, itemPath: string, source: ItemSources['nodes'][number]) {
    this.localSelection.set({ path, ownerPath: itemPath });
    this.locationSelected.emit({ path: itemPath, source });
  }
  activate(node: RecipeNode) {
    this.localSelection.set({ path: node.path, ownerPath: node.path });
    this.focusNode(node.path);
  }
  private zoomAt(next: number, x: number, y: number) {
    const zoom = Math.max(0.005, Math.min(1.75, next));
    const previous = this.zoom();
    const pan = this.pan();
    this.pan.set({
      x: x - ((x - pan.x) / previous) * zoom,
      y: y - ((y - pan.y) / previous) * zoom,
    });
    this.zoom.set(zoom);
  }
  scale(delta: number) {
    this.initialFitPending = false;
    const viewport = this.viewport()?.nativeElement;
    this.zoomAt(
      this.zoom() * Math.pow(1.2, delta / 0.15),
      (viewport?.clientWidth ?? 800) / 2,
      (viewport?.clientHeight ?? 600) / 2,
    );
  }
  private wheel = (event: WheelEvent) => {
    if ((event.target as HTMLElement).closest('input,select,textarea,[data-scrollable]')) return;
    event.preventDefault();
    this.initialFitPending = false;
    const viewport = this.viewport()?.nativeElement;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const multiplier =
      event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.clientHeight : 1;
    this.pendingWheel.delta += event.deltaY * multiplier;
    this.pendingWheel.x = event.clientX - rect.left;
    this.pendingWheel.y = event.clientY - rect.top;
    if (this.wheelFrame) return;
    this.wheelFrame = requestAnimationFrame(() => {
      this.wheelFrame = 0;
      const { delta, x, y } = this.pendingWheel;
      this.pendingWheel.delta = 0;
      this.zoomAt(this.zoom() * Math.exp(-Math.max(-400, Math.min(400, delta)) * 0.0018), x, y);
    });
  };
  center(path = 'root') {
    const layout = this.layout();
    const node =
      layout.nodes.find((row) => row.node.path === path) ??
      layout.sources.find((row) => row.path === path);
    const viewport = this.viewport()?.nativeElement;
    if (node && viewport?.clientWidth && viewport.clientHeight)
      this.pan.set({
        x: viewport.clientWidth / 2 - (node.x + node.width / 2) * this.zoom(),
        y: viewport.clientHeight / 2 - (node.y + node.height / 2) * this.zoom(),
      });
  }
  fit() {
    const viewport = this.viewport()?.nativeElement;
    if (!viewport?.clientWidth || !viewport.clientHeight) return;
    const box = this.layout().bounds;
    const zoom = Math.min(
      1,
      (viewport.clientWidth - 48) / box.width,
      (viewport.clientHeight - 48) / box.height,
    );
    // The same floor is used by wheel, buttons, pinch and fit, including wide trees.
    this.zoom.set(Math.max(0.005, zoom));
    this.pan.set({
      x: (viewport.clientWidth - box.width * this.zoom()) / 2 - box.x * this.zoom(),
      y: (viewport.clientHeight - box.height * this.zoom()) / 2 - box.y * this.zoom(),
    });
  }
  reset() {
    this.zoom.set(1);
    this.focus.set('');
    this.center();
  }
  focusBranch() {
    const owner = this.localSelection()?.ownerPath ?? this.selected();
    this.focus.set(this.focus() ? '' : owner);
  }
  start(event: PointerEvent) {
    this.keyboardNavigation = false;
    this.initialFitPending = false;
    const target = event.target as HTMLElement;
    if (event.button !== 0 || target.closest('a,input,select,textarea,.node-details')) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      this.pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom: this.zoom(),
        worldX: ((a.x + b.x) / 2 - rect.left - this.pan().x) / this.zoom(),
        worldY: ((a.y + b.y) / 2 - rect.top - this.pan().y) / this.zoom(),
      };
      this.drag = null;
      this.suppressClick = true;
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
      return;
    }
    this.suppressClick = false;
    this.drag = {
      x: event.clientX,
      y: event.clientY,
      px: this.pan().x,
      py: this.pan().y,
      pointer: event.pointerId,
      target: event.currentTarget as HTMLElement,
    };
    // Capture touch immediately so both pinch pointers keep arriving; mouse after threshold.
    if (event.pointerType === 'touch') this.drag.target.setPointerCapture?.(event.pointerId);
  }
  move(event: PointerEvent) {
    if (this.pointers.has(event.pointerId))
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (this.pinch && this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const zoom = Math.max(
        0.005,
        Math.min(
          1.75,
          (this.pinch.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, this.pinch.distance),
        ),
      );
      this.zoom.set(zoom);
      this.pan.set({
        x: (a.x + b.x) / 2 - rect.left - this.pinch.worldX * zoom,
        y: (a.y + b.y) / 2 - rect.top - this.pinch.worldY * zoom,
      });
      this.dragging.set(true);
      return;
    }
    if (this.drag?.pointer !== event.pointerId) return;
    const dx = event.clientX - this.drag.x,
      dy = event.clientY - this.drag.y;
    if (!this.dragging() && Math.hypot(dx, dy) < 5) return;
    if (!this.dragging()) this.drag.target.setPointerCapture?.(event.pointerId);
    this.dragging.set(true);
    this.suppressClick = true;
    event.preventDefault();
    this.pan.set({ x: this.drag.px + dx, y: this.drag.py + dy });
  }
  end(event?: PointerEvent) {
    if (event) {
      this.pointers.delete(event.pointerId);
      const viewport = event.currentTarget as HTMLElement;
      if (viewport?.hasPointerCapture?.(event.pointerId))
        viewport.releasePointerCapture(event.pointerId);
    } else this.pointers.clear();
    this.pinch = null;
    this.drag = null;
    this.dragging.set(false);
  }
  private clickCapture = (event: Event) => this.captureClick(event);
  captureClick(event: Event) {
    if (!this.suppressClick) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.suppressClick = false;
  }
  key(event: KeyboardEvent) {
    if (event.key === 'Tab') this.keyboardNavigation = true;
    if (event.target !== event.currentTarget) return;
    const delta = {
      ArrowLeft: [40, 0],
      ArrowRight: [-40, 0],
      ArrowUp: [0, 40],
      ArrowDown: [0, -40],
    }[event.key];
    if (delta) {
      event.preventDefault();
      this.pan.update((p) => ({ x: p.x + delta[0], y: p.y + delta[1] }));
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      this.scale(0.15);
    } else if (event.key === '-') {
      event.preventDefault();
      this.scale(-0.15);
    } else if (event.key === '0') {
      event.preventDefault();
      this.fit();
    }
  }
}
