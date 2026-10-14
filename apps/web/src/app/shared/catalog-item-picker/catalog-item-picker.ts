import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { CatalogCategory, CatalogItem, CatalogPage } from '@bdo/shared';
import { HlmButton } from '@bdo/ui/button';
import { HlmInput } from '@bdo/ui/input';
import type { Subscription } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { RegionPreferences } from '../../core/region-preferences';
import { BdoSelect } from '../../ui/native-select/bdo-select';
import { ItemIcon } from '../item-icon/item-icon';

@Component({
  selector: 'app-catalog-item-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HlmInput, HlmButton, BdoSelect, ItemIcon],
  templateUrl: './catalog-item-picker.html',
  styleUrl: './catalog-item-picker.scss',
})
export class CatalogItemPicker implements OnDestroy {
  private readonly api = inject(CatalogApiService);
  private readonly preferences = inject(RegionPreferences);
  private region = this.preferences.region();
  private request?: Subscription;
  private categoryRequest?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;
  private categoriesLoaded = false;
  private previousScope: 'life-skill' | undefined;
  readonly searchId = `catalog-${crypto.randomUUID()}`;
  readonly selectionName = input('');
  readonly label = input($localize`Buscar item do jogo`);
  readonly compact = input(false);
  readonly scope = input<'life-skill' | undefined>(undefined);
  readonly selected = output<CatalogItem | null>();
  readonly query = signal('');
  readonly category = signal('');
  readonly categories = signal<CatalogCategory[]>([]);
  readonly result = signal<CatalogPage | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly open = signal(false);

  constructor() {
    effect(() => {
      const scope = this.scope();
      untracked(() => {
        if (scope === this.previousScope) return;
        this.previousScope = scope;
        this.request?.unsubscribe();
        this.categoryRequest?.unsubscribe();
        this.categoryRequest = undefined;
        this.categoriesLoaded = false;
        this.categories.set([]);
        this.category.set('');
        if (this.timer) clearTimeout(this.timer);
        this.result.set(null);
        this.loading.set(false);
        this.error.set('');
        this.open.set(false);
      });
    });
    effect(() => {
      const region = this.preferences.region();
      untracked(() => {
        if (region === this.region) return;
        this.region = region;
        this.request?.unsubscribe();
        this.categoryRequest?.unsubscribe();
        this.categoryRequest = undefined;
        if (this.timer) clearTimeout(this.timer);
        this.categoriesLoaded = false;
        this.categories.set([]);
        this.category.set('');
        this.query.set('');
        this.result.set(null);
        this.loading.set(false);
        this.open.set(false);
        this.selected.emit(null);
      });
    });
  }

  loadCategories(): void {
    if (this.categoriesLoaded || this.categoryRequest) return;
    this.categoryRequest = this.api.getCategories(this.scope()).subscribe({
      next: (response) => {
        this.categories.set(response.categories);
        this.categoriesLoaded = true;
      },
      error: () => {
        this.categoryRequest = undefined;
      },
    });
  }

  search(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value.slice(0, 80));
    this.loadCategories();
    this.schedule();
  }

  filter(event: Event): void {
    this.category.set((event.target as HTMLSelectElement).value);
    this.schedule();
  }

  private schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.result.set(null);
    this.error.set('');
    this.open.set(true);
    if (this.query().trim().length < 2 && !this.category()) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.timer = setTimeout(() => this.find(), 300);
  }

  find(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .getItems({
        q: this.query().trim() || undefined,
        categoryId: this.category() || undefined,
        scope: this.scope(),
        page: 1,
        pageSize: 12,
      })
      .subscribe({
        next: (response) => {
          this.result.set(response);
          this.loading.set(false);
        },
        error: () => {
          this.error.set($localize`Não foi possível consultar o catálogo. Tente novamente.`);
          this.loading.set(false);
        },
      });
  }

  choose(item: CatalogItem): void {
    if (this.timer) clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.loading.set(false);
    this.selected.emit(item);
    this.query.set('');
    this.open.set(false);
  }

  clear(): void {
    if (this.timer) clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.loading.set(false);
    this.selected.emit(null);
    this.query.set('');
    this.open.set(false);
  }

  iconUrl(item: CatalogItem): string | null {
    return this.api.resolveIconUrl(item);
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.categoryRequest?.unsubscribe();
    if (this.timer) clearTimeout(this.timer);
  }
}
