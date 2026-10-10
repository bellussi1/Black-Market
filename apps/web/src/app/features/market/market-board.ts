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
import { MarketCacheService } from '../../core/market-cache.service';
import { RegionPreferences } from '../../core/region-preferences';
import { date, number, silver } from '../../shared/formatters';
import { ItemIcon } from '../../shared/item-icon/item-icon';
import { MarketApi } from './market-api';
import { MarketRefresh } from './market-refresh';

export type StockFilterType = 'all' | 'in_stock' | 'out_of_stock' | 'with_volume';

export interface PriceTrend {
  percent: number;
  label: string;
  direction: 'up' | 'down' | 'flat';
}

export interface PriceRangePosition {
  percent: number;
  min: string;
  max: string;
}

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
  readonly cache = inject(MarketCacheService);

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

  /** Active column sorting on the board */
  readonly sortColumn = signal<string>('hot');
  readonly sortDirection = signal<'asc' | 'desc'>('desc');

  /** Quick stock / liquidity filter */
  readonly stockFilter = signal<StockFilterType>('all');

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

  /**
   * Filtered and client-sorted items for the current page view.
   */
  readonly displayItems = computed(() => {
    const rawItems = this.result()?.items ?? [];
    const filter = this.stockFilter();

    let filtered = rawItems;
    if (filter === 'in_stock') {
      filtered = rawItems.filter((i) => i.stock !== null && i.stock > 0);
    } else if (filter === 'out_of_stock') {
      filtered = rawItems.filter((i) => i.stock === 0);
    } else if (filter === 'with_volume') {
      filtered = rawItems.filter((i) => i.volume24h !== null && i.volume24h !== '0');
    }

    const col = this.sortColumn();
    const dir = this.sortDirection();
    const factor = dir === 'asc' ? 1 : -1;

    if (col === 'hot') {
      return filtered;
    }

    return [...filtered].sort((a, b) => {
      if (col === 'name') {
        return a.name.localeCompare(b.name, 'pt') * factor;
      }
      if (col === 'price') {
        const pa = BigInt(a.price ?? '0');
        const pb = BigInt(b.price ?? '0');
        if (pa === pb) return 0;
        return (pa < pb ? -1 : 1) * factor;
      }
      if (col === 'meanPrice') {
        const ma = BigInt(a.meanPrice ?? '0');
        const mb = BigInt(b.meanPrice ?? '0');
        if (ma === mb) return 0;
        return (ma < mb ? -1 : 1) * factor;
      }
      if (col === 'stock') {
        const sa = a.stock ?? -1;
        const sb = b.stock ?? -1;
        return (sa - sb) * factor;
      }
      if (col === 'volume24h') {
        const va = BigInt(a.volume24h ?? '0');
        const vb = BigInt(b.volume24h ?? '0');
        if (va === vb) return 0;
        return (va < vb ? -1 : 1) * factor;
      }
      if (col === 'volume15d') {
        const va = BigInt(a.volume15d ?? '0');
        const vb = BigInt(b.volume15d ?? '0');
        if (va === vb) return 0;
        return (va < vb ? -1 : 1) * factor;
      }
      if (col === 'volume30d') {
        const va = BigInt(a.volume30d ?? '0');
        const vb = BigInt(b.volume30d ?? '0');
        if (va === vb) return 0;
        return (va < vb ? -1 : 1) * factor;
      }
      if (col === 'trend') {
        const ta = this.calculateTrendPercent(a) ?? 0;
        const tb = this.calculateTrendPercent(b) ?? 0;
        return (ta - tb) * factor;
      }
      return 0;
    });
  });

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

    const region = this.preferences.region();
    const queryKey = `board:${region}:${this.search().trim()}:${this.category()}:${this.sort()}:${this.page()}:${this.pageSize()}`;

    this.request = this.api
      .board({
        region,
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
          this.cache.cacheBoardResponse(queryKey, response, region);
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

  clearSearch(): void {
    this.find('');
  }

  filterCategory(value: string): void {
    this.category.set(value);
    this.sort.set(this.fullCatalog() ? 'name' : 'hot');
    this.page.set(1);
    this.load();
  }

  setStockFilter(filter: StockFilterType): void {
    this.stockFilter.set(filter);
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
    this.sortColumn.set(value);
    this.sortDirection.set(value === 'name' ? 'asc' : 'desc');
    this.page.set(1);
    this.load();
  }

  toggleColumnSort(column: string): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update((dir) => (dir === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set(column === 'name' ? 'asc' : 'desc');
    }

    // Sync with backend if it's a backend-supported sort
    if (['hot', 'price', 'stock', 'name'].includes(column)) {
      this.sort.set(column as MarketBoardSort);
    }
  }

  calculateTrendPercent(item: MarketBoardItem): number | null {
    if (!item.price || !item.meanPrice) return null;
    try {
      const p = Number(BigInt(item.price));
      const m = Number(BigInt(item.meanPrice));
      if (m <= 0) return null;
      return ((p - m) / m) * 100;
    } catch {
      return null;
    }
  }

  calculateTrend(item: MarketBoardItem): PriceTrend | null {
    const pct = this.calculateTrendPercent(item);
    if (pct === null) return null;

    if (pct > 0.5) {
      return {
        percent: pct,
        label: `+${pct.toFixed(1)}%`,
        direction: 'up',
      };
    }
    if (pct < -0.5) {
      return {
        percent: pct,
        label: `${pct.toFixed(1)}%`,
        direction: 'down',
      };
    }
    return {
      percent: pct,
      label: 'Estável',
      direction: 'flat',
    };
  }

  calculatePricePosition(item: MarketBoardItem): PriceRangePosition | null {
    if (!item.price || !item.minPrice || !item.maxPrice) return null;
    try {
      const cur = Number(BigInt(item.price));
      const min = Number(BigInt(item.minPrice));
      const max = Number(BigInt(item.maxPrice));
      if (max <= min) return null;
      const pct = Math.max(0, Math.min(100, Math.round(((cur - min) / (max - min)) * 100)));
      return {
        percent: pct,
        min: silver(item.minPrice),
        max: silver(item.maxPrice),
      };
    } catch {
      return null;
    }
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
