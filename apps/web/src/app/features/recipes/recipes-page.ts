import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, RESPONSE_INIT, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type {
  ActiveDatasetSummary,
  CatalogItem,
  CatalogItemDetail,
  CatalogRecipe,
  CatalogRecipesResponse,
  RecipeListResponse,
} from '@bdo/shared';
import {
  catchError,
  combineLatest,
  forkJoin,
  map,
  type Observable,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';

import { CatalogApiService, type CatalogItemResponse } from '../../core/catalog-api.service';
import { RegionPreferences } from '../../core/region-preferences';
import { SeoService } from '../../core/seo.service';
import { CatalogItemPicker } from '../../shared/catalog-item-picker/catalog-item-picker';
import { recipeTypeLabel } from '../../shared/game-labels';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { RecipeTree } from '../../shared/recipe-tree/recipe-tree';
@Component({
  selector: 'app-recipes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, CatalogItemPicker, ItemIcon, RecipeTree],
  templateUrl: './recipes-page.html',
  styleUrl: './recipes-page.scss',
})
export class RecipesPage {
  private readonly seo = inject(SeoService);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly preferences = inject(RegionPreferences);
  private readonly refresh = new Subject<void>();
  readonly result = signal<RecipeListResponse | null>(null);
  readonly recipe = signal<CatalogRecipe | null>(null);
  readonly item = signal<CatalogItemDetail | null>(null);
  readonly alternatives = signal<CatalogRecipe[]>([]);
  readonly dataset = signal<ActiveDatasetSummary | null>(null);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly typeLabel = recipeTypeLabel;
  methodLabel(method: CatalogRecipe) {
    return (
      (method.byproductOfItemId ? 'Subproduto · ' : '') +
      this.typeLabel(method.type) +
      ' · ' +
      method.inputs.map((part) => (part.quantity ?? '?') + ' ' + part.name).join(' + ')
    );
  }
  page = 1;
  constructor() {
    combineLatest([
      this.route.paramMap,
      this.route.queryParamMap,
      toObservable(this.preferences.region),
      this.refresh.pipe(startWith(undefined)),
    ])
      .pipe(
        switchMap(([params, query]) => {
          this.loading.set(true);
          this.message.set('');
          this.recipe.set(null);
          this.item.set(null);
          this.result.set(null);
          this.alternatives.set([]);
          const key = params.get('key'),
            rawId = params.get('id') ?? query.get('item'),
            id = rawId ? Number(rawId) : null;
          if (
            (key && !/^[a-f0-9]{64}$/i.test(key)) ||
            (rawId && (!Number.isSafeInteger(id) || id! < 1 || id! > 2147483647))
          ) {
            this.message.set('Item ou receita não encontrado.');
            this.seo.unavailable();
            if (this.response) this.response.status = 404;
            return of(null);
          }
          const itemRequest = (itemId: number, selectedKey: string | null) =>
            forkJoin({
              item: this.api.getItem(itemId),
              recipes: this.api.getItemRecipes(itemId, 'produces'),
            }).pipe(map((data) => ({ kind: 'item' as const, ...data, selectedKey })));
          const request: Observable<
            | {
                kind: 'item';
                item: CatalogItemResponse;
                recipes: CatalogRecipesResponse;
                selectedKey: string | null;
              }
            | { kind: 'list'; list: RecipeListResponse }
            | null
          > = key
            ? this.api
                .getRecipe(key)
                .pipe(
                  switchMap((data) =>
                    data.recipe.outputs[0]
                      ? itemRequest(data.recipe.outputs[0].itemId, key)
                      : of(null),
                  ),
                )
            : id
              ? itemRequest(id, query.get('recipe'))
              : this.api
                  .getRecipes('', this.page)
                  .pipe(map((list) => ({ kind: 'list' as const, list })));
          return request.pipe(
            catchError((error: unknown) => {
              this.seo.unavailable();
              if (this.response)
                this.response.status =
                  error instanceof HttpErrorResponse && error.status === 404 ? 404 : 503;
              this.message.set('Não foi possível carregar esta consulta. Tente novamente.');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((data) => {
        this.loading.set(false);
        if (!data) return;
        if (data.kind === 'list') {
          this.result.set(data.list);
          this.dataset.set(data.list.dataset);
          return;
        }
        if (data.recipes.dataset?.version !== data.item.dataset.version) {
          this.message.set(
            'O catálogo mudou durante a consulta. Tente novamente para usar a mesma versão dos dados.',
          );
          return;
        }
        this.item.set(data.item.item);
        this.dataset.set(data.item.dataset);
        this.alternatives.set(data.recipes.recipes);
        this.recipe.set(
          data.recipes.recipes.find((r) => r.key === data.selectedKey) ??
            data.recipes.recipes[0] ??
            null,
        );
        this.seo.describe(
          data.item.item.name + ' · Receitas e obtenção',
          'Explore ingredientes, fontes conhecidas, estoque e custos de ' +
            data.item.item.name +
            ' em Black Desert Online.',
        );
      });
  }
  select(item: CatalogItem | null) {
    if (item) void this.router.navigate(['/recipes/items', item.id]);
  }
  choose(event: Event) {
    const key = (event.target as HTMLSelectElement).value;
    this.recipe.set(this.alternatives().find((r) => r.key === key) ?? null);
  }
  move(delta: number) {
    this.page += delta;
    this.refresh.next();
  }
  retry() {
    this.refresh.next();
  }
}
