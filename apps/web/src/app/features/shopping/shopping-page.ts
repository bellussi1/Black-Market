import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PersonalPlan } from '@bdo/calculators';
import { availableInventory } from '@bdo/calculators';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';

import { IdentityService } from '../../core/identity.service';
import { WorkspaceStore } from '../../core/workspace-store';
import { stockLocationKey } from '../../shared/recipe-tree/recipe-tree-model';

@Component({
  selector: 'app-shopping-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmCard, HlmButton, RouterLink],
  templateUrl: './shopping-page.html',
})
export class ShoppingPage {
  readonly store = inject(WorkspaceStore);
  readonly identity = inject(IdentityService);
  readonly message = signal('');
  readonly page = signal(0);
  readonly pageSize = 48;
  readonly plans = computed(() =>
    this.store
      .data()
      .personalPlans.filter(
        (plan) =>
          plan.region === this.store.data().region && plan.sourceItemId && plan.status === 'draft',
      ),
  );
  readonly rows = computed(() => {
    const state = this.store.data();
    const available = availableInventory(
      state.personalPlans,
      state.inventory.filter((row) => row.region === state.region),
    );
    const totals = new Map<
      number,
      { itemId: number; name: string; required: number; available: number; missing: number }
    >();
    for (const plan of [...this.plans()].sort(
      (a, b) => (b.excludedStockLocations?.length ?? 0) - (a.excludedStockLocations?.length ?? 0),
    ))
      for (const material of plan.materials) {
        const row = totals.get(material.itemId) ?? {
          itemId: material.itemId,
          name: material.name,
          required: 0,
          available: 0,
          missing: 0,
        };
        row.required += material.quantity;
        let missing = material.quantity;
        for (const item of available) {
          if (
            item.itemId !== material.itemId ||
            plan.excludedStockLocations?.includes(stockLocationKey(item))
          )
            continue;
          const used = Math.min(item.quantity, missing);
          item.quantity -= used;
          missing -= used;
          row.available += used;
        }
        row.missing += missing;
        totals.set(material.itemId, row);
      }
    return [...totals.values()].sort(
      (a, b) => b.missing - a.missing || a.name.localeCompare(b.name),
    );
  });
  readonly missingCount = computed(() => this.rows().filter((row) => row.missing > 0).length);
  readonly visibleRows = computed(() =>
    this.rows().slice(this.page() * this.pageSize, (this.page() + 1) * this.pageSize),
  );
  private removed: PersonalPlan | null = null;
  remove(plan: PersonalPlan) {
    if (
      this.store.update((state) => ({
        ...state,
        personalPlans: state.personalPlans.filter((row) => row.id !== plan.id),
      }))
    ) {
      this.removed = plan;
      this.message.set('Plano removido. Você pode desfazer.');
    }
  }
  undo() {
    if (!this.removed) return;
    const plan = this.removed;
    if (
      this.store.update((state) => ({
        ...state,
        personalPlans: [...state.personalPlans.filter((row) => row.id !== plan.id), plan],
      }))
    ) {
      this.removed = null;
      this.message.set('Plano restaurado.');
    }
  }
}
