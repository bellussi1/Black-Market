export interface DataProvenance {
  source: string;
  observedAt: string | null;
  fetchedAt: string | null;
}

export * from './life-skills';
export * from './market-board';
export * from './markets';
export * from './platform';
export * from './roadmap';
export * from './staging-test-profile';
export * from './tutorials';

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ActiveDatasetSummary {
  version: string;
  region: string;
  locale: string;
  checksum: string | null;
  itemCount: number;
  recipeCount: number;
  importedAt: string;
}

export interface CatalogCategory {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
}

export interface CatalogItem {
  id: number;
  name: string;
  description: string | null;
  grade: string | null;
  weight: string | null;
  category: string | null;
  icon: string | null;
  iconUrl?: string | null;
  categories: CatalogCategory[];
}

export interface CatalogItemDetail extends CatalogItem {
  sourceData: Record<string, unknown>;
}

export interface CatalogPage {
  items: CatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  dataset: ActiveDatasetSummary | null;
}

export interface CatalogCategoriesResponse {
  categories: CatalogCategory[];
  dataset: ActiveDatasetSummary | null;
}

export interface CatalogRecipePart {
  itemId: number;
  name: string;
  quantity: string | null;
  iconUrl?: string | null;
}

export interface CatalogRecipe {
  key: string;
  type: string;
  station: string | null;
  byproductOfItemId?: number | null;
  inputs: CatalogRecipePart[];
  outputs: CatalogRecipePart[];
}

export interface CatalogRecipesResponse {
  recipes: CatalogRecipe[];
  total: number;
  direction: 'produces' | 'uses' | 'byproducts';
  dataset: ActiveDatasetSummary | null;
  page?: number;
  pageSize?: number;
}

export interface ProductionCatalogResponse {
  recipes: CatalogRecipe[];
  items: CatalogItemDetail[];
  dataset: ActiveDatasetSummary | null;
}

export interface RecipeListResponse {
  recipes: {
    key: string;
    type: string;
    station: string | null;
    itemId: number;
    name: string;
    quantity: string | null;
    iconUrl: string | null;
  }[];
  total: number;
  page: number;
  pageSize: number;
  dataset: ActiveDatasetSummary | null;
}

/** NPC purchase prices extracted from the active catalog item data. */
export interface NpcPurchasePrice {
  itemId: number;
  unitPrice: string;
  vendor: string;
  verifiedAt: string;
}

export interface NpcPurchasePricesResponse {
  prices: NpcPurchasePrice[];
  dataset: ActiveDatasetSummary | null;
}

/** A data-derived marketable form for a recipe material that cannot be bought directly. */
export interface RecipeMarketEquivalent {
  sourceItemId: number;
  itemId: number;
  name: string;
  iconUrl: string | null;
  /** Number of equivalent market units required for one unit of the recipe material. */
  quantityRatio: number;
}

export interface RecipeMarketEquivalentsResponse {
  equivalents: RecipeMarketEquivalent[];
  dataset: ActiveDatasetSummary | null;
}

export interface ApiProblem {
  statusCode: number;
  code: string;
  message: string;
}
export interface MarketItemQuote {
  itemId: number;
  subId: number;
  name: string;
  price: string | null;
  stock: number;
  totalTrades: string;
  minPrice: string | null;
  maxPrice: string | null;
  lastSoldPrice: string | null;
  lastSoldAt: string | null;
}

export interface MarketLookupResponse {
  source: 'arsha';
  region: string;
  locale: string;
  fetchedAt: string;
  cacheStatus: 'fetched' | 'cached' | 'stale';
  upstreamCacheMinutes: number;
  items: MarketItemQuote[];
}

export { isMvpPathEnabled, isMvpPathSuspended, SCREENSHOT_MVP } from './mvp-scope';
