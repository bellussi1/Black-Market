import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import type { CatalogItemDetail, CatalogRecipe } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { catchError, combineLatest, forkJoin, of, switchMap } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { RegionPreferences } from '../../core/region-preferences';
import { recipeTypeLabel } from '../../shared/game-labels';
import { LoadingSkeleton } from '../../shared/loading-skeleton/loading-skeleton';
import { recipeFamilies } from '../../shared/recipe-tree/recipe-equivalents';
import { RecipeTree } from '../../shared/recipe-tree/recipe-tree';
import { BdoSelect } from '../../ui/native-select/bdo-select';

@Component({
  selector: 'app-market-production',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RecipeTree, RouterLink, HlmButton, BdoSelect, LoadingSkeleton],
  template: `
    <section aria-labelledby="market-production-title" class="grid min-w-0 gap-4">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="market-production-title">Produzir para vender</h2>
        <a hlmBtn variant="outline" [routerLink]="['/recipes/items', itemId()]"
          >Abrir árvore e insumos</a
        >
      </header>
      @if (loading()) {
        <app-loading-skeleton
          variant="recipe"
          [count]="4"
          label="Carregando fórmulas de produção"
        />
      } @else if (message()) {
        <p role="status">{{ message() }}</p>
      } @else if (recipe()) {
        <app-recipe-tree
          [summaryOnly]="true"
          [recipe]="recipe()"
          [recipes]="recipes()"
          [selectedItem]="item()"
          [datasetVersion]="version()"
          (rootMethod)="recipe.set($event)"
        >
          <label recipe-method class="grid gap-2"
            >Fórmula de produção
            <select appBdoSelect [value]="recipe()?.key" (change)="choose($event)">
              @for (method of methods(); track method.key) {
                <option [value]="method.key">
                  {{ typeLabel(method.type) }} · método {{ $index + 1 }}
                </option>
              }
            </select>
          </label>
        </app-recipe-tree>
      }
    </section>
  `,
})
export class MarketProduction {
  readonly itemId = input('');
  readonly subId = input(0);
  readonly item = signal<CatalogItemDetail | null>(null);
  readonly recipe = signal<CatalogRecipe | null>(null);
  readonly recipes = signal<CatalogRecipe[]>([]);
  readonly methods = computed(() => recipeFamilies(this.recipes()).map((family) => family[0]));
  readonly version = signal('');
  readonly loading = signal(true);
  readonly message = signal('');
  readonly typeLabel = recipeTypeLabel;
  private readonly api = inject(CatalogApiService);
  private readonly preferences = inject(RegionPreferences);

  constructor() {
    combineLatest([
      toObservable(this.itemId),
      toObservable(this.subId),
      toObservable(this.preferences.region),
    ])
      .pipe(
        switchMap(([rawId, subId]) => {
          this.item.set(null);
          this.recipe.set(null);
          this.recipes.set([]);
          this.loading.set(false);
          this.message.set('');
          const id = Number(rawId);
          if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) return of(null);
          if (subId !== 0) {
            this.message.set(
              'Esta variante aprimorada exige custos de aprimoramento. O lucro da fórmula base não representa esta venda.',
            );
            return of(null);
          }
          this.loading.set(true);
          return forkJoin({
            item: this.api.getItem(id),
            recipes: this.api.getItemRecipes(id, 'produces'),
          }).pipe(
            catchError(() => {
              this.message.set(
                'Não foi possível carregar as fórmulas. Selecione o item novamente para tentar.',
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        this.loading.set(false);
        if (!data) return;
        if (data.item.dataset.version !== data.recipes.dataset?.version) {
          this.message.set('O catálogo mudou durante a consulta. Selecione o item novamente.');
          return;
        }
        this.item.set(data.item.item);
        this.version.set(data.item.dataset.version);
        this.recipes.set(data.recipes.recipes);
        this.recipe.set(this.methods()[0] ?? null);
        if (!this.recipe())
          this.message.set(
            'Sem fórmula de produção vinculada no catálogo. Lucro por hora indisponível para este item.',
          );
      });
  }

  choose(event: Event): void {
    this.recipe.set(
      this.methods().find((method) => method.key === (event.target as HTMLSelectElement).value) ??
        null,
    );
  }
}
