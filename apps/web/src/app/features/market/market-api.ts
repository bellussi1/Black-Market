import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { MarketLookupResponse } from '@bdo/shared';

import { environment } from '../../../environments/environment';
import { preferredDataLocale } from '../../core/locale';
import type { Region } from '../../core/region-preferences';

export interface MarketHistoryPoint {
  fetchedAt: string;
  price: string | null;
  stock: number | null;
  totalTrades: string | null;
}

@Injectable({ providedIn: 'root' })
export class MarketApi {
  private readonly http = inject(HttpClient);
  history(itemId: number, region: Region, subId = 0) {
    return this.http.get<{ points: MarketHistoryPoint[] }>(
      `${environment.apiBaseUrl}/api/v1/market/items/${itemId}/history`,
      {
        params: { region, subId, locale: preferredDataLocale() },
      },
    );
  }

  getItem(itemId: string, region: Region) {
    return this.http.get<MarketLookupResponse>(
      `${environment.apiBaseUrl}/api/v1/market/items/${encodeURIComponent(itemId)}`,
      { params: { region, locale: preferredDataLocale() } },
    );
  }
}
