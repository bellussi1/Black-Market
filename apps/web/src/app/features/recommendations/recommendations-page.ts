import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  calculateMarket,
  defaultTax,
  personalPlanSchema,
  recommend,
  type Recommendation,
} from '@bdo/calculators';

import { WorkspaceStore } from '../../core/workspace-store';
import { silver } from '../../shared/formatters';
@Component({
  selector: 'app-recommendations-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink],
  templateUrl: './recommendations-page.html',
})
export class RecommendationsPage {
  readonly store = inject(WorkspaceStore);
  readonly selected = signal('');
  readonly message = signal('');
  readonly silver = silver;
  readonly profiles = computed(() =>
    this.store.data().characters.filter((row) => row.region === this.store.data().region),
  );
  readonly profile = computed(
    () => this.profiles().find((row) => row.id === this.selected()) ?? this.profiles()[0],
  );
  readonly suggestions = computed(() => {
    const profile = this.profile();
    return profile ? recommend(this.store.data(), profile) : [];
  });
  valuePack = false;
  saleOptions() {
    const state = this.store.data();
    return state.inventory
      .filter((row) => row.region === state.region && row.itemId)
      .map((item) => {
        const reserved = state.personalPlans
          .filter((plan) => plan.region === state.region && plan.status === 'reserved')
          .flatMap((plan) => plan.materials)
          .filter((part) => part.itemId === item.itemId)
          .reduce((sum, part) => sum + part.quantity, 0);
        const all = state.inventory.filter(
          (row) => row.region === state.region && row.itemId === item.itemId,
        );
        const quantity = Math.max(0, all.reduce((sum, row) => sum + row.quantity, 0) - reserved);
        const quote = state.quotes.find(
          (row) => row.region === state.region && row.itemId === item.itemId && !row.subId,
        );
        const price = quote?.price ?? item.price;
        return {
          id: item.itemId!,
          name: item.name,
          quantity,
          net:
            quantity && price !== '0'
              ? calculateMarket({
                  ...defaultTax,
                  valuePack: this.valuePack,
                  price,
                  quantity,
                  cost: '0',
                }).net
              : null,
          observedAt: quote?.observedAt ?? null,
        };
      })
      .filter(
        (row, index, list) =>
          list.findIndex((other) => other.id === row.id) === index && row.quantity > 0,
      );
  }
  createPlan(row: Recommendation) {
    const plan = personalPlanSchema.parse({
      id: crypto.randomUUID(),
      name: row.name,
      region: this.store.data().region,
      createdAt: new Date().toISOString(),
      estimatedProfit: row.profit,
      minutes: row.minutes,
      materials: row.materials,
      tasks: [
        {
          id: crypto.randomUUID(),
          label: 'Conferir preços e materiais antes de começar',
          done: false,
        },
        {
          id: crypto.randomUUID(),
          label:
            row.kind === 'activity'
              ? 'Realizar a atividade e registrar uma sessão'
              : 'Separar materiais e realizar a produção',
          done: false,
        },
      ],
    });
    if (this.store.update((state) => ({ ...state, personalPlans: [...state.personalPlans, plan] })))
      this.message.set(
        'Plano criado. Confira os materiais e ative reservas em Meus planos, se necessário.',
      );
  }
}
