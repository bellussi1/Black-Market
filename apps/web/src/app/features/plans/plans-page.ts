import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { availableInventory, type PersonalPlan, personalPlanSchema } from '@bdo/calculators';
import type { CatalogItem } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { HlmInput } from '@bdo/ui/input';
import { catchError, EMPTY } from 'rxjs';

import { AnalyticsService } from '../../core/analytics.service';
import { CatalogApiService } from '../../core/catalog-api.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { validationMessage } from '../../shared/calculation-feedback';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { silver } from '../../shared/formatters';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { TutorialSurfaceDirective } from '../../shared/tutorials/tutorial-surface.directive';
@Component({
  selector: 'app-plans-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    HlmInput,
    HlmCard,
    HlmButton,
    FormsModule,
    RouterLink,
    CatalogItemPicker,
    ItemIcon,
    TutorialSurfaceDirective,
  ],
  templateUrl: './plans-page.html',
})
export class PlansPage {
  private readonly analytics = inject(AnalyticsService);
  readonly catalog = inject(CatalogApiService);
  readonly items = signal(new Map<number, CatalogItem>());
  private catalogRegion = '';
  constructor() {
    effect(() => {
      const region = this.store.data().region;
      untracked(() => {
        if (this.draft.region !== region) {
          this.draft = this.empty();
          this.message.set('Região alterada. Escolha ou crie um plano deste mercado.');
        }
      });
    });
    effect((cleanup) => {
      const region = this.store.data().region;
      if (region !== this.catalogRegion) {
        this.catalogRegion = region;
        this.items.set(new Map());
      }
      const ids = [...new Set(this.plans().flatMap((plan) => plan.materials.map((m) => m.itemId)))];
      if (!ids.length) return;
      const current = untracked(() => this.items());
      const missingIds = ids.filter((id) => !current.has(id));
      if (!missingIds.length) return;
      const sub = this.catalog
        .getItems({ ids: missingIds.slice(0, 100), page: 1, pageSize: 100 })
        .pipe(catchError(() => EMPTY))
        .subscribe((result) => {
          this.items.update((prev) => {
            const next = new Map(prev);
            for (const item of result.items) next.set(item.id, item);
            return next;
          });
        });
      cleanup(() => sub.unsubscribe());
    });
  }
  readonly store = inject(WorkspaceStore);
  readonly message = signal('');
  readonly silver = silver;
  readonly plans = computed(() =>
    this.store.data().personalPlans.filter((row) => row.region === this.store.data().region),
  );
  draft: PersonalPlan = this.empty();
  quantity = 1;
  task = '';
  empty() {
    return personalPlanSchema.parse({
      id: crypto.randomUUID(),
      name: 'Meu plano',
      region: this.store.data().region,
      createdAt: new Date().toISOString(),
    });
  }
  add(item: CatalogItem | null) {
    if (!item) return;
    this.items.update((prev) => new Map(prev).set(item.id, item));
    const held = this.draft.materials.find((row) => row.itemId === item.id);
    if (held) held.quantity += this.quantity;
    else this.draft.materials.push({ itemId: item.id, name: item.name, quantity: this.quantity });
  }
  addTask() {
    if (!this.task.trim()) return;
    this.draft.tasks.push({ id: crypto.randomUUID(), label: this.task.trim(), done: false });
    this.task = '';
  }
  removeMaterial(id: number) {
    this.draft.materials = this.draft.materials.filter((row) => row.itemId !== id);
  }
  save() {
    const parsed = personalPlanSchema.safeParse({
      ...this.draft,
      region: this.store.data().region,
    });
    if (!parsed.success) {
      this.message.set(validationMessage(parsed.error));
      return;
    }
    if (
      this.store.update((state) => ({
        ...state,
        personalPlans: [
          ...state.personalPlans.filter((row) => row.id !== parsed.data.id),
          parsed.data,
        ],
      }))
    ) {
      this.draft = this.empty();
      this.analytics.capture('journey_completed', {
        feature: 'plans',
        action: 'save',
        status: 'success',
      });
      this.message.set('Plano salvo. A reserva precisa ser ativada separadamente.');
    }
  }
  edit(plan: PersonalPlan) {
    this.draft = structuredClone(plan);
  }
  status(plan: PersonalPlan, status: PersonalPlan['status']) {
    if (
      this.store.update((state) => ({
        ...state,
        personalPlans: state.personalPlans.map((row) =>
          row.id === plan.id ? { ...row, status } : row,
        ),
      }))
    )
      this.message.set(
        status === 'reserved'
          ? 'Materiais reservados. Outros planos não poderão reservar as mesmas quantidades.'
          : 'Plano atualizado. Concluir ou cancelar libera reservas, sem alterar quantidades do armazém.',
      );
  }
  toggle(plan: PersonalPlan, id: string) {
    this.store.update((state) => ({
      ...state,
      personalPlans: state.personalPlans.map((row) =>
        row.id === plan.id
          ? {
              ...row,
              tasks: row.tasks.map((task) =>
                task.id === id ? { ...task, done: !task.done } : task,
              ),
            }
          : row,
      ),
    }));
  }
  stock(plan: PersonalPlan, id: number) {
    return availableInventory(
      this.store.data().personalPlans.filter((row) => row.id !== plan.id),
      this.store.data().inventory,
    )
      .filter((row) => row.region === plan.region && row.itemId === id)
      .reduce((sum, row) => sum + row.quantity, 0);
  }
  statusLabel(status: string) {
    return (
      {
        draft: 'Rascunho',
        reserved: 'Materiais reservados',
        completed: 'Concluído',
        cancelled: 'Cancelado',
      } as Record<string, string>
    )[status];
  }
}
