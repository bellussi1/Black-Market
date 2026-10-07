import { MARKET_ROLLOUT, REGION_CODES, type RegionCode } from '@bdo/shared';

export function regionLabel(region: RegionCode): string {
  const labels: Record<RegionCode, string> = {
    sa: $localize`:@@market.sa:América do Sul (SA)`,
    na: $localize`:@@market.na:América do Norte (NA)`,
    eu: $localize`:@@market.eu:Europa (EU)`,
    sea: $localize`:@@market.sea:Sudeste Asiático (SEA)`,
    kr: $localize`:@@market.kr:Coreia (KR)`,
    jp: $localize`:@@market.jp:Japão (JP)`,
    tw: $localize`:@@market.tw:Taiwan (TW)`,
  };
  return labels[region];
}

export function visibleMarkets(current: RegionCode) {
  return REGION_CODES.filter((code) => MARKET_ROLLOUT[code].enabled || code === current).map(
    (code) => ({
      code,
      label: regionLabel(code),
    }),
  );
}
