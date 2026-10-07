export const DEFAULT_REGION = 'sa';
export const DEFAULT_UI_LOCALE = 'pt-BR';
export const DEFAULT_DATA_LOCALE = 'pt';
export const CATALOG_FALLBACK_LOCALE = 'en';

export const REGION_CODES = ['sa', 'na', 'eu', 'sea', 'kr', 'jp', 'tw'] as const;
export type RegionCode = (typeof REGION_CODES)[number];
export const MARKET_PROVIDER_REGIONS = ['sa', 'na', 'eu'] as const;
export const DATA_LOCALES = ['pt', 'en', 'sp', 'de', 'fr'] as const;
export type DataLocale = (typeof DATA_LOCALES)[number];

/** Product availability is independent of provider coverage and stored regional data. */
export const MARKET_ROLLOUT: Record<RegionCode, { enabled: boolean }> = {
  sa: { enabled: true },
  na: { enabled: false },
  eu: { enabled: false },
  sea: { enabled: false },
  kr: { enabled: false },
  jp: { enabled: false },
  tw: { enabled: false },
};

/** Providers/extraction use short language codes; UI builds use BCP 47 identifiers. */
export function dataLocaleForUi(locale: string): string {
  const language = locale.trim().toLowerCase().split('-')[0];
  return language === 'es' ? 'sp' : language;
}
