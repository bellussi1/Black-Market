import type { ElementRef } from '@angular/core';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { inject } from '@angular/core';
import type { calculateProduction } from '@bdo/calculators';

import { CatalogApiService } from '../../core/catalog-api.service';
import { recipeTypeLabel } from '../game-labels';
import { ItemIcon } from '../item-icon/item-icon';
import type { BranchAction } from './recipe-branch';
import { isGraphAncestor, layoutRecipeGraph } from './recipe-graph-model';
import type { ItemSources } from './recipe-knowledge';
import type { RecipeNode } from './recipe-tree-model';
@Component({
  selector: 'app-recipe-graph',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemIcon],
  templateUrl: './recipe-graph.html',
  styleUrl: './recipe-graph.scss',
})
export class RecipeGraph {
  constructor() {
    afterNextRender(() => this.center());
    effect(() => {
      const focus = this.focus();
      if (focus && !layoutRecipeGraph(this.root()).nodes.some((entry) => entry.node.path === focus))
        this.focus.set('');
    });
  }
  readonly root = input.required<RecipeNode>();
  readonly allocations = input<ReturnType<typeof calculateProduction>['allocations']>([]);
  readonly selected = input('root');
  readonly action = output<BranchAction>();
  readonly origins = input<ReadonlyMap<number, ItemSources['nodes']>>(new Map());
  readonly locationSelected = output<{ path: string; source: ItemSources['nodes'][number] }>();
  readonly catalog = inject(CatalogApiService);
  readonly zoom = signal(1);
  readonly pan = signal({ x: 24, y: 24 });
  readonly focus = signal('');
  readonly layout = computed(() => layoutRecipeGraph(this.root(), this.focus(), this.origins()));
  readonly transform = computed(
    () => `translate(${this.pan().x}px, ${this.pan().y}px) scale(${this.zoom()})`,
  );
  readonly viewport = viewChild<ElementRef<HTMLElement>>('viewport');
  readonly ancestor = isGraphAncestor;
  readonly typeLabel = recipeTypeLabel;
  private keyboardNavigation = false;
  focusNode(path: string) {
    if (this.keyboardNavigation) this.center(path);
  }
  private drag: { x: number; y: number; px: number; py: number; pointer: number } | null = null;
  allocation(path: string) {
    return this.allocations().find((row) => row.path === path);
  }
  emit(path: string, action: BranchAction['action']) {
    this.action.emit({ path, action });
  }
  scale(delta: number) {
    this.zoom.update((value) =>
      Math.max(0.35, Math.min(1.75, Math.round((value + delta) * 100) / 100)),
    );
  }
  center(path = 'root') {
    const node = this.layout().nodes.find((row) => row.node.path === path);
    const el = this.viewport()?.nativeElement;
    if (node && el)
      this.pan.set({
        x: el.clientWidth / 2 - (node.x + 110) * this.zoom(),
        y: 50 - node.y * this.zoom(),
      });
  }
  fit() {
    this.zoom.set(
      Math.min(
        1,
        Math.max(0.35, (this.viewport()?.nativeElement.clientWidth ?? 800) / this.layout().width),
      ),
    );
    this.center();
  }
  focusBranch() {
    this.focus.set(this.focus() ? '' : this.selected());
    this.center(this.selected());
  }
  start(event: PointerEvent) {
    this.keyboardNavigation = false;
    if (event.button !== 0 || (event.target as HTMLElement).closest('button,a,input,select'))
      return;
    this.drag = {
      x: event.clientX,
      y: event.clientY,
      px: this.pan().x,
      py: this.pan().y,
      pointer: event.pointerId,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  move(event: PointerEvent) {
    if (this.drag?.pointer !== event.pointerId) return;
    this.pan.set({
      x: this.drag.px + event.clientX - this.drag.x,
      y: this.drag.py + event.clientY - this.drag.y,
    });
  }
  end() {
    this.drag = null;
  }
  key(event: KeyboardEvent) {
    if (event.key === 'Tab') this.keyboardNavigation = true;
    const delta = {
      ArrowLeft: [40, 0],
      ArrowRight: [-40, 0],
      ArrowUp: [0, 40],
      ArrowDown: [0, -40],
    }[event.key];
    if (event.target !== event.currentTarget || !delta) return;
    event.preventDefault();
    this.pan.update((p) => ({ x: p.x + delta[0], y: p.y + delta[1] }));
  }
}
