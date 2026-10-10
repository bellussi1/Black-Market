import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import type { OnDestroy } from '@angular/core';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import type { MarketBoardResponse, MarketItemQuote, MarketLookupResponse } from '@bdo/shared';
import { catchError, forkJoin, map, type Observable, of, tap } from 'rxjs';

import { MarketApi } from '../features/market/market-api';
import { type Region, RegionPreferences } from './region-preferences';

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
    return this.api.getItem(String(itemId), region).pipe(
      map((response: MarketLookupResponse) => {
        this.cacheLookupResponse(response, region);
        this.isSyncing.set(false);
        this.lastSyncAt.set(new Date());
        return response.items.find((i) => i.subId === subId) ?? response.items[0] ?? null;
      }),
      catchError((_error) => {
        this.isSyncing.set(false);
        // If network error occurred but we have stale cache, return stale as fallback
        if (existing) {
          return of(existing.quote);
        }
        return of(null);
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

    const resultMap = new Map<number, MarketItemQuote>();
    const missingOrExpired: number[] = [];

    for (const id of uniqueIds) {
      const cached = this.getCachedQuote(id, region, 0);
      const key = this.quoteKey(id, region, 0);
      const entry = this.quotesMap().get(key);
      const isFresh = entry && Date.now() < entry.expiresAt && !forceRefresh;

      if (isFresh && cached) {
        resultMap.set(id, cached);
      } else {
        missingOrExpired.push(id);
      }
    }

    if (!missingOrExpired.length) {
      return of(resultMap);
    }

    this.isSyncing.set(true);
    const requests = missingOrExpired.map((id) =>
      this.resolveQuote(id, region, 0, forceRefresh).pipe(
        map((quote) => ({ id, quote })),
        catchError(() => of({ id, quote: null })),
      ),
    );

    return forkJoin(requests).pipe(
      map((results) => {
        this.isSyncing.set(false);
        for (const { id, quote } of results) {
          if (quote) {
            resultMap.set(id, quote);
          }
        }
        return resultMap;
      }),
    );
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
    const current = new Map(this.quotesMap());

    for (const item of response.items) {
      const key = this.quoteKey(item.itemId, region, item.subId);
      current.set(key, {
        quote: item,
        region,
        fetchedAt: now,
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
