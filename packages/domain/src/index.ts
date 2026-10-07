import type { DataProvenance } from '@bdo/shared';

export type ItemId = number;
export type RegionCode = string;

export interface DatasetIdentity {
  source: string;
  version: string;
  checksum: string | null;
}

export interface MarketObservation extends DataProvenance {
  itemId: ItemId;
  region: RegionCode;
  minimumPrice: string | null;
  maximumPrice: string | null;
  lastSoldPrice: string | null;
  dailyVolume: number | null;
  stock: number | null;
}
