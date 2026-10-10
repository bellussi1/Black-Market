import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import type { OnDestroy } from '@angular/core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type {
  MarketBoardItem,
  MarketBoardPageSize,
  MarketBoardResponse,
  MarketBoardSort,
} from '@bdo/shared';
import type { Subscription } from 'rxjs';

import { CatalogApiService } from '../../core/catalog-api.service';
import { RegionPreferences } from '../../core/region-preferences';
import { date, number, silver } from '../../shared/formatters';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { MarketApi } from './market-api';
import { MarketRefresh } from './market-refresh';

@Component({
  selector: 'app-market-board',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ItemIcon],
  templateUrl: './market-board.html',
  styleUrl: './market-board.scss',
})
export class MarketBoard implements OnDestroy {
  private readonly api = inject(MarketApi);
  readonly catalog = inject(CatalogApiService);
  readonly preferences = inject(RegionPreferences);
  readonly selected = output<MarketBoardItem>();
  readonly active = input(true);
  readonly fullCatalog = computed(() => !!this.search().trim() || !!this.category());
  readonly result = signal<MarketBoardResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly category = signal('');
  readonly page = signal(1);
  readonly pageSize = signal<MarketBoardPageSize>(20);
  readonly sort = signal<MarketBoardSort>('hot');
  readonly search = signal('');
  readonly silver = silver;
  readonly number = number;
  readonly date = date;
  readonly categoryRoots = computed(() => {
    const categories = this.result()?.categories ?? [];
    return categories.filter(
      (entry) => !entry.parentId || !categories.some((parent) => parent.id === entry.parentId),
    );
  });
  readonly selectedCategoryParent = computed(() => {
    const entry = this.result()?.categories.find((category) => category.id === this.category());
    return entry?.parentId ?? entry?.id ?? '';
  });
  childrenOf(id: string) {
    return this.result()?.categories.filter((entry) => entry.parentId === id) ?? [];
  }
  readonly pageCount = computed(() =>
    Math.max(1, Math.ceil((this.result()?.total ?? 0) / this.pageSize())),
  );
  readonly firstItem = computed(() =>
    this.result()?.total ? (this.page() - 1) * this.pageSize() + 1 : 0,
  );
  readonly lastItem = computed(() =>
    Math.min(this.page() * this.pageSize(), this.result()?.total ?? 0),
  );
  private request?: Subscription;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly refresh = isPlatformBrowser(inject(PLATFORM_ID))
    ? new MarketRefresh(inject(DOCUMENT), () => this.load(true))
    : null;

  constructor() {
    effect(() => {
      const active = this.active();
      untracked(() => this.refresh?.setActive(active));
    });
    effect(() => {
      this.preferences.region();
      untracked(() => {
        this.page.set(1);
        this.category.set('');
        this.result.set(null);
        this.load();
      });
    });
  }

  load(preserve = false): void {
    this.refresh?.markRefreshed();
    if (this.timer) clearTimeout(this.timer);
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .board({
        region: this.preferences.region(),
        q: this.search().trim(),
        categoryId: this.category(),
        sort: this.sort(),
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (response) => {
          this.refresh?.markRefreshed();
          this.result.set(response);
          if (response.sort) this.sort.set(response.sort);
          this.loading.set(false);
          if (this.page() > this.pageCount()) {
            this.page.set(this.pageCount());
            this.load();
          }
        },
        error: () => {
          if (!preserve) this.result.set(null);
          this.loading.set(false);
          this.error.set('Não foi possível carregar o mercado. Tente novamente.');
        },
      });
  }

  find(value: string): void {
    this.search.set(value.slice(0, 80));
    if (this.fullCatalog()) this.sort.set('name');
    else this.sort.set('hot');
    this.page.set(1);
    this.request?.unsubscribe();
    this.loading.set(true);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.load(), 300);
  }
  filterCategory(value: string): void {
    this.category.set(value);
    this.sort.set(this.fullCatalog() ? 'name' : 'hot');
    this.page.set(1);
    this.load();
  }
  setPageSize(value: string): void {
    const size = Number(value);
    if (size !== 20 && size !== 50 && size !== 100) return;
    this.pageSize.set(size);
    this.page.set(1);
    this.load();
  }
  setSort(value: string): void {
    if (!['hot', 'price', 'stock', 'name'].includes(value)) return;
    this.sort.set(value as MarketBoardSort);
    this.page.set(1);
    this.load();
  }
  move(delta: number): void {
    const page = this.page() + delta;
    if (this.loading() || page < 1 || page > this.pageCount()) return;
    this.page.set(page);
    this.load();
  }
  ngOnDestroy(): void {
    this.refresh?.destroy();
    this.request?.unsubscribe();
    if (this.timer) clearTimeout(this.timer);
  }
}
