import { HttpErrorResponse } from '@angular/common/http';
import { RESPONSE_INIT } from '@angular/core';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { CatalogRecipe, RecipeListResponse } from '@bdo/shared';
import { catchError, combineLatest, type Observable, of, Subject, switchMap } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { RegionPreferences } from '../../core/region-preferences';
import { SeoService } from '../../core/seo.service';
import { recipeTypeLabel } from '../../shared/game-labels';
import { ItemIcon } from '../../shared/item-icon/item-icon';

@Component({
  selector: 'app-recipes-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, ItemIcon],
  templateUrl: './recipes-page.html',
})
export class RecipesPage {
  private readonly seo = inject(SeoService);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly preferences = inject(RegionPreferences);
  private readonly refresh = new Subject<void>();
  readonly result = signal<RecipeListResponse | null>(null);
  readonly recipe = signal<CatalogRecipe | null>(null);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly typeLabel = recipeTypeLabel;
  q = '';
  page = 1;
  constructor() {
    combineLatest([this.route.paramMap, this.refresh])
      .pipe(
        switchMap(([params]) => {
          this.loading.set(true);
          this.message.set('');
          this.recipe.set(null);
          this.result.set(null);
          const key = params.get('key');
          const request: Observable<{ recipe: CatalogRecipe } | RecipeListResponse> = key
            ? this.api.getRecipe(key)
            : this.api.getRecipes(this.q, this.page);
          return request.pipe(
            catchError((error: unknown) => {
              this.seo.unavailable();
              if (this.response)
                this.response.status =
                  key && error instanceof HttpErrorResponse && error.status === 404 ? 404 : 503;
              this.message.set('Não foi possível carregar as receitas. Tente novamente.');
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        this.loading.set(false);
        if (response) {
          if ('recipe' in response) {
            this.recipe.set(response.recipe);
            this.seo.describe(
              response.recipe.outputs[0]?.name ?? 'Receita',
              'Materiais e resultados desta receita de Black Desert Online.',
            );
          } else this.result.set(response);
        }
      });
    effect(() => {
      this.preferences.region();
      this.refresh.next();
    });
  }
  search() {
    this.page = 1;
    this.refresh.next();
  }
  move(delta: number) {
    this.page += delta;
    this.refresh.next();
  }
}
