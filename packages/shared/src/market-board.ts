import type { CatalogCategory, MarketItemQuote } from './index';

export type MarketBoardSort = 'hot' | 'price' | 'stock' | 'name';
export type MarketBoardDirection = 'asc' | 'desc';
export type MarketBoardStockFilter = 'all' | 'in_stock' | 'out_of_stock';
export type MarketBoardPageSize = 20 | 50 | 100;

export interface MarketBoardItem extends Omit<MarketItemQuote, 'stock' | 'totalTrades'> {
  stock: number | null;
  totalTrades: string | null;
  /** Search/category quotes are per-item summaries, without an enhancement variant. */
  quoteScope?: 'variant' | 'summary';
  /** False means no usable provider quote; stock is unknown, not zero. */
  marketAvailable?: boolean;
  iconUrl: string | null;
  categories: CatalogCategory[];
  /** Arithmetic mean of locally observed prices in the last 30 days; not a trade average. */
  meanPrice: string | null;
  /** Counter differences require endpoint observations and uninterrupted coverage. */
  volume24h: string | null;
  volume15d: string | null;
  volume30d: string | null;
  observationCount: number;
  observedFrom: string | null;
  observedTo: string | null;
}

export interface MarketBoardResponse {
  source: 'arsha';
  region: string;
  locale: string;
  fetchedAt: string;
  cacheStatus: 'fetched' | 'cached' | 'stale';
  upstreamCacheMinutes: number;
  refreshMinutes?: number;
  /** Catalog remains available when quotes cannot be fetched; existing quotes may be stale. */
  quotesUnavailable?: boolean;
  scope?: 'hot' | 'search' | 'category';
  /** Catalog search uses name ordering before pagination. */
  sort?: MarketBoardSort;
  items: MarketBoardItem[];
  total: number;
  page: number;
  pageSize: MarketBoardPageSize;
  categories: CatalogCategory[];
}
