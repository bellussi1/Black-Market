import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  RESPONSE_INIT,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import type {
  ActiveDatasetSummary,
  CatalogItem,
  CatalogItemDetail,
  CatalogRecipe,
  CatalogRecipesResponse,
  LifeSkillRecipeGroup,
  RecipeListResponse,
} from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
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
import {
  batchAlternatives,
  recipeFamilies,
  withVerifiedIngredientSubstitutions,
} from '../../shared/recipe-tree/recipe-equivalents';
import { RecipeTree } from '../../shared/recipe-tree/recipe-tree';
import { BdoSelect } from '../../ui/native-select/bdo-select';
@Component({
  selector: 'app-recipes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmButton, BdoSelect, RouterLink, CatalogItemPicker, ItemIcon, RecipeTree],
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
  readonly methodFamilies = computed(() => recipeFamilies(this.alternatives()));
  readonly methods = computed(() => this.methodFamilies().map((family) => family[0]));
  readonly selectedMethodKey = computed(
    () =>
      this.methodFamilies().find((family) => family.some((r) => r.key === this.recipe()?.key))?.[0]
        ?.key ?? '',
  );
  readonly rootBatchOptions = computed(() => {
    const selected = this.recipe();
    if (!selected) return [];
    const family = this.methodFamilies().find((recipes) =>
      recipes.some((candidate) => candidate.key === selected.key),
    );
    return batchAlternatives(selected, family ?? [selected]);
  });
  readonly dataset = signal<ActiveDatasetSummary | null>(null);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly advanced = signal(false);
  readonly typeLabel = recipeTypeLabel;
  readonly recipeGroup = signal<LifeSkillRecipeGroup | ''>('');
  methodLabel(method: CatalogRecipe) {
    return (
      (method.byproductOfItemId ? 'Subproduto · ' : '') +
      this.typeLabel(method.type) +
      ' · método ' +
      (this.methods().findIndex((row) => row.key === method.key) + 1) +
      ' · ' +
      method.inputs.length +
      ' materiais'
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
          // Keep the existing page mounted while fetching the next page, preserving scroll geometry.
          if (params.get('key') || params.get('id') || query.get('item')) this.result.set(null);
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
                  .getRecipes('', this.page, this.recipeGroup() || undefined)
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
        const alternatives = withVerifiedIngredientSubstitutions(data.recipes.recipes);
        this.alternatives.set(alternatives);
        this.recipe.set(
          data.selectedKey === 'external'
            ? null
            : (alternatives.find((r) => r.key === data.selectedKey) ?? this.methods()[0] ?? null),
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
    this.setMethod(this.alternatives().find((r) => r.key === key) ?? null);
  }
  chooseBatch(event: Event) {
    const key = (event.target as HTMLSelectElement).value;
    this.setMethod(
      this.rootBatchOptions().find((batch) => batch.recipe.key === key)?.recipe ?? null,
    );
  }
  setMethod(recipe: CatalogRecipe | null) {
    this.recipe.set(recipe);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { recipe: recipe?.key ?? 'external' },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
  move(delta: number) {
    if (this.loading()) return;
    this.page += delta;
    this.refresh.next();
  }
  filterGroup(event: Event) {
    const group = (event.target as HTMLSelectElement).value;
    if (!['', 'cooking', 'alchemy', 'processing', 'imperial'].includes(group)) return;
    this.recipeGroup.set(group as LifeSkillRecipeGroup | '');
    this.page = 1;
    this.refresh.next();
  }
  retry() {
    this.refresh.next();
  }
}
