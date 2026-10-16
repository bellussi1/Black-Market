import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { RESPONSE_INIT } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import type { CatalogItemDetail, CatalogRecipesResponse } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmCard } from '@bdo/ui/card';
import { catchError, combineLatest, forkJoin, of, Subject, switchMap } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { isMvpPathEnabled, SCREENSHOT_MVP } from '../../core/mvp-scope';
import { RegionPreferences } from '../../core/region-preferences';
import { SeoService } from '../../core/seo.service';
import { recipeTypeLabel } from '../../shared/game-labels';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { referenceFields } from '../reference/reference-fields';

@Component({
  selector: 'app-item-detail-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmCard, HlmButton, RouterLink, ItemIcon],
  templateUrl: './item-detail-page.html',
  styleUrl: './item-detail-page.scss',
})
export class ItemDetailPage {
  readonly isEnabled = isMvpPathEnabled;
  readonly screenshotMvp = SCREENSHOT_MVP;
  private readonly seo = inject(SeoService);
  private readonly response = inject(RESPONSE_INIT, { optional: true });
  readonly api = inject(CatalogApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly preferences = inject(RegionPreferences);
  private readonly refresh = new Subject<void>();
  readonly item = signal<CatalogItemDetail | null>(null);
  readonly produces = signal<CatalogRecipesResponse | null>(null);
  readonly uses = signal<CatalogRecipesResponse | null>(null);
  readonly fields = signal<ReturnType<typeof referenceFields>>([]);
  readonly loading = signal(true);
  readonly message = signal('');
  readonly typeLabel = recipeTypeLabel;
  constructor() {
    combineLatest([this.route.paramMap, this.refresh])
      .pipe(
        switchMap(([params]) => {
          const id = Number(params.get('id'));
          this.item.set(null);
          this.loading.set(true);
          this.message.set('');
          if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
            this.seo.unavailable();
            if (this.response) this.response.status = 404;
            this.message.set('Item não encontrado.');
            return of(null);
          }
          return forkJoin({
            item: this.api.getItem(id),
            produces: SCREENSHOT_MVP ? of(null) : this.api.getItemRecipes(id, 'produces'),
            uses: SCREENSHOT_MVP ? of(null) : this.api.getItemRecipes(id, 'uses'),
          }).pipe(
            catchError((error: unknown) => {
              this.seo.unavailable();
              if (this.response)
                this.response.status =
                  error instanceof HttpErrorResponse && error.status === 404 ? 404 : 503;
              this.message.set(
                'Não foi possível carregar este item. Confira o endereço ou tente novamente.',
              );
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((response) => {
        this.loading.set(false);
        if (response) {
          this.item.set(response.item.item);
          this.seo.describe(
            response.item.item.name,
            response.item.item.description ??
              'Informações, imagens e receitas deste item de Black Desert Online.',
          );
          this.produces.set(response.produces);
          this.uses.set(response.uses);
          this.fields.set(
            referenceFields(
              Object.fromEntries(
                Object.entries(response.item.item.sourceData).filter(
                  ([key]) => key !== 'name' && key !== 'description',
                ),
              ),
            ),
          );
        }
      });
    effect(() => {
      this.preferences.region();
      this.refresh.next();
    });
  }
  plain(value: string | null) {
    return value?.replace(/<[^>]*>/g, '') ?? '';
  }
}
