import type { CatalogCategory, MarketItemQuote } from './index';

export type MarketBoardSort = 'hot' | 'price' | 'stock' | 'name';
export type MarketBoardPageSize = 20 | 50 | 100;

export interface MarketBoardItem extends MarketItemQuote {
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
  items: MarketBoardItem[];
  total: number;
  page: number;
  pageSize: MarketBoardPageSize;
  categories: CatalogCategory[];
}
