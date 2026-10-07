import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { MarketLookupResponse } from '@bdo/shared';
import type { Region } from '../../core/region-preferences';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MarketApi {
  private readonly http = inject(HttpClient);

  getItem(itemId: string, region: Region) {
    return this.http.get<MarketLookupResponse>(
      `${environment.apiBaseUrl}/api/v1/market/items/${encodeURIComponent(itemId)}`,
      { params: { region } },
    );
  }
}
