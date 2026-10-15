import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import type { OnDestroy } from '@angular/core';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import type {
  MarketBoardDirection,
  MarketBoardPageSize,
  MarketBoardResponse,
  MarketBoardSort,
  MarketBoardStockFilter,
  MarketItemQuote,
  MarketLookupResponse,
} from '@bdo/shared';
import {
  catchError,
  concat,
  finalize,
  from,
  map,
  mergeMap,
  type Observable,
  of,
  shareReplay,
  takeLast,
  tap,
  toArray,
} from 'rxjs';

import { MarketApi } from '../features/market/market-api';
import { type Region, RegionPreferences } from './region-preferences';

export interface MarketBoardCacheQuery {
  region: Region;
  search: string;
  categoryId: string;
  sort: MarketBoardSort;
  direction: MarketBoardDirection;
  stock: MarketBoardStockFilter;
  page: number;
  pageSize: MarketBoardPageSize;
  /** Client-side column ordering is also part of the rendered board identity. */
  clientSort?: string;
}

export interface CachedQuoteEntry {
  quote: MarketItemQuote;
  region: Region;
  fetchedAt: number;
  expiresAt: number;
}

export interface CachedBoardEntry {
  response: MarketBoardResponse;
  region: Region;
  key: string;
  fetchedAt: number;
  expiresAt: number;
}

/** Standard cache time-to-live: 5 minutes */
export const DEFAULT_MARKET_CACHE_TTL_MS = 5 * 60 * 1000;
/** Background polling interval: 6 minutes */
export const MARKET_BACKGROUND_POLL_MS = 6 * 60 * 1000;
export const MARKET_STORAGE_KEY_PREFIX = 'bm_market_cache_';

function hasPositivePrice(value: string | null | undefined): boolean {
  return !!value && /^\d{1,24}$/.test(value) && BigInt(value) > 0n;
}

function needsMaximumPrice(quote: MarketItemQuote | undefined): boolean {
  return quote?.stock === 0 && !hasPositivePrice(quote.maxPrice);
}

@Injectable({ providedIn: 'root' })
export class MarketCacheService implements OnDestroy {
  private readonly api = inject(MarketApi);
  private readonly preferences = inject(RegionPreferences);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Map of item quote entries keyed by `${region}:${itemId}:${subId}` */
  readonly quotesMap = signal<Map<string, CachedQuoteEntry>>(new Map());

  /** Map of cached market board results keyed by query string */
  readonly boardMap = signal<Map<string, CachedBoardEntry>>(new Map());

  /** Timestamp of the most recent market synchronization */
  readonly lastSyncAt = signal<Date | null>(null);

  /** True while an automated or requested market fetch is ongoing */
  readonly isSyncing = signal<boolean>(false);

  /** Count of total cached item quotes */
  readonly cachedQuotesCount = computed(() => this.quotesMap().size);

  private pollTimer?: ReturnType<typeof setInterval>;
  private storageSaveTimer?: ReturnType<typeof setTimeout>;
  private readonly boardRequests = new Map<string, Observable<CachedBoardEntry>>();

  constructor() {
    if (this.isBrowser) {
      this.hydrateFromStorage(this.preferences.region());
      this.setupBackgroundPolling();
      this.setupVisibilityListener();
    }
  }

  /**
   * Generates a canonical composite key for caching quotes.
   */
  quoteKey(itemId: number | string, region: Region, subId = 0): string {
    return `${region}:${itemId}:${subId}`;
  }

  /** Canonical key for one complete market-board query and its rendered ordering. */
  boardKey(query: MarketBoardCacheQuery): string {
    return `board:${JSON.stringify({
      region: query.region,
      search: query.search.trim(),
      categoryId: query.categoryId,
      sort: query.sort,
      direction: query.direction,
      stock: query.stock,
      page: query.page,
      pageSize: query.pageSize,
      clientSort: query.clientSort ?? null,
    })}`;
  }

  /**
   * Resolves only the matching board query. Fresh entries return immediately;
   * expired entries are emitted first while one shared refresh runs.
   */
  resolveBoard(query: MarketBoardCacheQuery, forceRefresh = false): Observable<CachedBoardEntry> {
    const key = this.boardKey(query);
    const cached = this.getCachedBoardResponse(key, query.region);
    if (cached && cached.expiresAt > Date.now() && !forceRefresh) return of(cached);

    let refresh = this.boardRequests.get(key);
    if (!refresh) {
      let request!: Observable<CachedBoardEntry>;
      request = this.api
        .board({
          region: query.region,
          q: query.search.trim(),
          categoryId: query.categoryId,
          sort: query.sort,
          direction: query.direction,
          stock: query.stock,
          page: query.page,
          pageSize: query.pageSize,
        })
        .pipe(
          tap((response) => {
            this.cacheBoardResponse(key, response, query.region);
            this.lastSyncAt.set(new Date());
          }),
          map(() => {
            const entry = this.getCachedBoardResponse(key, query.region);
            if (!entry) throw new Error('A resposta do mercado não foi armazenada.');
            return entry;
          }),
          finalize(() => {
            if (this.boardRequests.get(key) === request) this.boardRequests.delete(key);
          }),
          shareReplay({ bufferSize: 1, refCount: true }),
        );
      this.boardRequests.set(key, request);
      refresh = request;
    }

    return cached ? concat(of(cached), refresh) : refresh;
  }

  /**
   * Retrieves an item quote synchronously from cache if present and unexpired.
   */
  getCachedQuote(
    itemId: number | string,
    region: Region = this.preferences.region(),
    subId = 0,
  ): MarketItemQuote | null {
    const key = this.quoteKey(itemId, region, subId);
    const entry = this.quotesMap().get(key);
    if (!entry) return null;
    return entry.quote;
  }

  /** Retrieves the cached quote and its freshness timestamps, including stale entries. */
  getCachedQuoteEntry(
    itemId: number | string,
    region: Region = this.preferences.region(),
    subId = 0,
  ): CachedQuoteEntry | null {
    return this.quotesMap().get(this.quoteKey(itemId, region, subId)) ?? null;
  }

  /**
   * Resolves an item quote automatically: returns cached if fresh,
   * otherwise queries the API in background and caches results without manual clicks.
   */
  resolveQuote(
    itemId: number | string,
    region: Region = this.preferences.region(),
    subId = 0,
    forceRefresh = false,
  ): Observable<MarketItemQuote | null> {
    const key = this.quoteKey(itemId, region, subId);
    const existing = this.quotesMap().get(key);
    const isFresh = existing && Date.now() < existing.expiresAt && !forceRefresh;

    if (isFresh) {
      return of(existing.quote);
    }

    this.isSyncing.set(true);
    return this.refreshQuote(itemId, region, subId, existing ?? null).pipe(
      finalize(() => this.isSyncing.set(false)),
    );
  }

  private refreshQuote(
    itemId: number | string,
    region: Region,
    subId: number,
    existing: CachedQuoteEntry | null,
  ): Observable<MarketItemQuote | null> {
    return this.api.getItem(String(itemId), region).pipe(
      map((response: MarketLookupResponse) => {
        this.cacheLookupResponse(response, region);
        this.lastSyncAt.set(new Date());
        return response.items.find((i) => i.subId === subId) ?? response.items[0] ?? null;
      }),
      catchError((_error) => {
        // If network error occurred but we have stale cache, return stale as fallback
        return of(existing?.quote ?? null);
      }),
    );
  }

  /**
   * Resolves quotes for multiple items concurrently, using cached entries whenever available.
   */
  resolveQuotesBatch(
    itemIds: (number | string)[],
    region: Region = this.preferences.region(),
    forceRefresh = false,
  ): Observable<Map<number, MarketItemQuote>> {
    const uniqueIds = [...new Set(itemIds.map((id) => Number(id)).filter((id) => id > 0))];
    if (!uniqueIds.length) {
      return of(new Map());
    }

    const cachedMap = new Map<number, MarketItemQuote>();
    const entriesById = new Map<number, CachedQuoteEntry>();
    const missingOrExpired: number[] = [];

    for (const id of uniqueIds) {
      const entry = this.getCachedQuoteEntry(id, region, 0);
      if (entry) {
        entriesById.set(id, entry);
        cachedMap.set(id, entry.quote);
      }
      const isFresh = entry && Date.now() < entry.expiresAt && !forceRefresh;

      if (!isFresh) {
        missingOrExpired.push(id);
      }
    }

    if (!missingOrExpired.length) {
      return of(cachedMap);
    }

    this.isSyncing.set(true);
    const refresh$ = from(missingOrExpired).pipe(
      mergeMap(
        (id) =>
          this.refreshQuote(id, region, 0, entriesById.get(id) ?? null).pipe(
            map((quote) => ({ id, quote })),
          ),
        6,
      ),
      toArray(),
      map((results) => {
        const resultMap = new Map(cachedMap);
        for (const { id, quote } of results) {
          if (quote) {
            resultMap.set(id, quote);
          }
        }
        return resultMap;
      }),
      finalize(() => this.isSyncing.set(false)),
    );

    return cachedMap.size ? concat(of(new Map(cachedMap)), refresh$) : refresh$;
  }

  /**
   * Resolves quotes for crafting/production materials using the bulk production-quotes endpoint.
   * Uses requests of at most 100 materials, caches all returned quotes, and enriches zero-stock
   * summaries with the individual endpoint when it omitted the maximum market price.
   */
  resolveProductionQuotes(
    itemIds: (number | string)[],
    region: Region = this.preferences.region(),
    forceRefresh = false,
  ): Observable<Map<number, MarketItemQuote>> {
    const uniqueIds = [...new Set(itemIds.map((id) => Number(id)).filter((id) => id > 0))];
    if (!uniqueIds.length) {
      return of(new Map());
    }

    const cachedMap = new Map<number, MarketItemQuote>();
    const missingOrExpired: number[] = [];

    for (const id of uniqueIds) {
      const entry = this.getCachedQuoteEntry(id, region, 0);
      if (entry) {
        cachedMap.set(id, entry.quote);
      }
      const isFresh = entry && Date.now() < entry.expiresAt && !forceRefresh;
      if (!isFresh) {
        missingOrExpired.push(id);
      }
    }

    if (!missingOrExpired.length) {
      const missingMaximum = uniqueIds.filter((id) => needsMaximumPrice(cachedMap.get(id)));
      if (!missingMaximum.length) return of(cachedMap);
      return this.resolveQuotesBatch(missingMaximum, region, true).pipe(takeLast(1));
    }

    this.isSyncing.set(true);
    const batches = Array.from({ length: Math.ceil(missingOrExpired.length / 100) }, (_, index) =>
      missingOrExpired.slice(index * 100, (index + 1) * 100),
    );
    const refreshedMap = new Map(cachedMap);
    const resolvedIds = new Set<number>();
    const bulk$ = from(batches).pipe(
      mergeMap((ids) => this.api.productionQuotes(ids, region), 2),
      tap((response) => {
        this.cacheLookupResponse(response, region);
        for (const item of response.items) {
          refreshedMap.set(item.itemId, item);
          resolvedIds.add(item.itemId);
        }
        this.lastSyncAt.set(new Date());
      }),
      toArray(),
      mergeMap(() => {
        const remaining = missingOrExpired.filter((id) => !resolvedIds.has(id));
        const fillOmitted$ = remaining.length
          ? this.resolveQuotesBatch(remaining, region, forceRefresh).pipe(
              takeLast(1),
              tap((fallbacks) => {
                for (const [id, quote] of fallbacks) refreshedMap.set(id, quote);
              }),
            )
          : of(refreshedMap);
        return fillOmitted$.pipe(
          mergeMap(() => {
            const missingMaximum = missingOrExpired.filter((id) => {
              const quote = refreshedMap.get(id);
              return resolvedIds.has(id) && needsMaximumPrice(quote);
            });
            if (!missingMaximum.length) return of(refreshedMap);
            return this.resolveQuotesBatch(missingMaximum, region, true).pipe(
              takeLast(1),
              map((details) => {
                for (const [id, quote] of details) refreshedMap.set(id, quote);
                return refreshedMap;
              }),
            );
          }),
        );
      }),
      catchError(() => {
        const remaining = missingOrExpired.filter((id) => !resolvedIds.has(id));
        // Arsha's bulk search can be unavailable while its per-item endpoint still works.
        // Resolve omitted items through the bounded individual lookup path instead of
        // leaving the entire recipe tree without current quotes.
        return this.resolveQuotesBatch(remaining, region, forceRefresh).pipe(
          takeLast(1),
          map((fallbacks) => {
            for (const [id, quote] of fallbacks) refreshedMap.set(id, quote);
            return refreshedMap;
          }),
          mergeMap(() => {
            const missingMaximum = missingOrExpired.filter((id) => {
              const quote = refreshedMap.get(id);
              return resolvedIds.has(id) && needsMaximumPrice(quote);
            });
            if (!missingMaximum.length) return of(refreshedMap);
            return this.resolveQuotesBatch(missingMaximum, region, true).pipe(
              takeLast(1),
              map((details) => {
                for (const [id, quote] of details) refreshedMap.set(id, quote);
                return refreshedMap;
              }),
            );
          }),
        );
      }),
      finalize(() => this.isSyncing.set(false)),
    );

    return cachedMap.size ? concat(of(new Map(cachedMap)), bulk$) : bulk$;
  }

  /**
   * Preloads and caches the top hot items or board items for the active region.
   */
  preloadHotItems(
    region: Region = this.preferences.region(),
  ): Observable<MarketBoardResponse | null> {
    const cacheKey = `board:hot:${region}`;
    const cachedBoard = this.boardMap().get(cacheKey);

    if (cachedBoard && Date.now() < cachedBoard.expiresAt) {
      return of(cachedBoard.response);
    }

    this.isSyncing.set(true);
    return this.api
      .board({
        region,
        q: '',
        categoryId: '',
        sort: 'hot',
        page: 1,
        pageSize: 50,
      })
      .pipe(
        tap((response) => {
          this.cacheBoardResponse(cacheKey, response, region);
          this.isSyncing.set(false);
          this.lastSyncAt.set(new Date());
        }),
        catchError(() => {
          this.isSyncing.set(false);
          return of(cachedBoard ? cachedBoard.response : null);
        }),
      );
  }

  /**
   * Stores item lookup quotes in the memory map and schedules local storage persistence.
   */
  cacheLookupResponse(response: MarketLookupResponse, region: Region): void {
    const now = Date.now();
    const expiresAt = now + DEFAULT_MARKET_CACHE_TTL_MS;
    const responseFetchedAt = Date.parse(response.fetchedAt);
    const fetchedAt = Number.isFinite(responseFetchedAt) ? responseFetchedAt : now;
    const current = new Map(this.quotesMap());

    for (const item of response.items) {
      const key = this.quoteKey(item.itemId, region, item.subId);
      current.set(key, {
        quote: item,
        region,
        fetchedAt,
        expiresAt,
      });
    }

    this.quotesMap.set(current);
    this.scheduleStorageSave(region);
  }

  /**
   * Stores market board responses in cache and registers individual quotes.
   */
  cacheBoardResponse(key: string, response: MarketBoardResponse, region: Region): void {
    const now = Date.now();
    const expiresAt = now + DEFAULT_MARKET_CACHE_TTL_MS;

    const boards = new Map(this.boardMap());
    boards.set(key, {
      response,
      region,
      key,
      fetchedAt: now,
      expiresAt,
    });
    this.boardMap.set(boards);

    // Also populate individual item quotes from the board
    const quotes = new Map(this.quotesMap());
    for (const item of response.items) {
      const qKey = this.quoteKey(item.itemId, region, item.subId);
      const quote: MarketItemQuote = {
        itemId: item.itemId,
        subId: item.subId,
        name: item.name,
        price: item.price,
        stock: item.stock ?? 0,
        totalTrades: item.totalTrades ?? '0',
        minPrice: item.minPrice,
        maxPrice: item.maxPrice,
        lastSoldPrice: item.lastSoldPrice,
        lastSoldAt: item.lastSoldAt,
      };
      quotes.set(qKey, {
        quote,
        region,
        fetchedAt: now,
        expiresAt,
      });
    }
    this.quotesMap.set(quotes);
    this.scheduleStorageSave(region);
  }

  /** Reads a board response by exact query key, including expired entries for stale display. */
  getCachedBoardResponse(key: string, region: Region): CachedBoardEntry | null {
    const entry = this.boardMap().get(key);
    return entry?.key === key && entry.region === region ? entry : null;
  }

  /** Aliases a cached board view for a local sort without extending its freshness or quote TTL. */
  cacheBoardAlias(key: string, source: CachedBoardEntry): void {
    const boards = new Map(this.boardMap());
    boards.set(key, { ...source, key });
    this.boardMap.set(boards);
  }

  /**
   * Hydrates cached quotes from localStorage on startup or region change.
   */
  hydrateFromStorage(region: Region = this.preferences.region()): void {
    if (!this.isBrowser) return;
    try {
      const key = `${MARKET_STORAGE_KEY_PREFIX}${region}`;
      const raw = localStorage.getItem(key);
      if (!raw) return;

      const parsed = JSON.parse(raw) as CachedQuoteEntry[];
      if (!Array.isArray(parsed)) return;

      const now = Date.now();
      const map = new Map<string, CachedQuoteEntry>();
      // Retain items if they aren't more than 24 hours old (as stale fallback)
      const maxStaleMs = 24 * 60 * 60 * 1000;

      for (const entry of parsed) {
        if (entry && entry.quote && entry.quote.itemId && now - entry.fetchedAt < maxStaleMs) {
          const k = this.quoteKey(entry.quote.itemId, region, entry.quote.subId ?? 0);
          map.set(k, entry);
        }
      }

      if (map.size > 0) {
        this.quotesMap.set(map);
      }
    } catch {
      // Storage errors are gracefully ignored
    }
  }

  /**
   * Debounced persistence to localStorage.
   */
  private scheduleStorageSave(region: Region): void {
    if (!this.isBrowser) return;
    if (this.storageSaveTimer) clearTimeout(this.storageSaveTimer);

    this.storageSaveTimer = setTimeout(() => {
      try {
        const key = `${MARKET_STORAGE_KEY_PREFIX}${region}`;
        const entries = Array.from(this.quotesMap().values()).filter((e) => e.region === region);
        // Retain at most 300 recent entries to avoid exceeding quota
        const trimmed = entries.slice(-300);
        localStorage.setItem(key, JSON.stringify(trimmed));
      } catch {
        // Storage quota errors safely handled
      }
    }, 600);
  }

  /**
   * Starts periodic polling in background every 6 minutes.
   */
  private setupBackgroundPolling(): void {
    if (!this.isBrowser) return;
    this.pollTimer = setInterval(() => {
      if (this.document.visibilityState === 'visible') {
        this.preloadHotItems().subscribe();
      }
    }, MARKET_BACKGROUND_POLL_MS);
  }

  /**
   * Refreshes cache when tab regains visibility if cache is stale.
   */
  private setupVisibilityListener(): void {
    if (!this.isBrowser) return;
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible') {
        const last = this.lastSyncAt();
        if (!last || Date.now() - last.getTime() > DEFAULT_MARKET_CACHE_TTL_MS) {
          this.preloadHotItems().subscribe();
        }
      }
    });
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.storageSaveTimer) clearTimeout(this.storageSaveTimer);
  }
}
