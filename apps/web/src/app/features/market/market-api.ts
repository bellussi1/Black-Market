import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { MarketLookupResponse } from '@bdo/shared';

import { environment } from '../../../environments/environment';
import { preferredDataLocale } from '../../core/locale';
import type { Region } from '../../core/region-preferences';

@Injectable({ providedIn: 'root' })
export class MarketApi {
  private readonly http = inject(HttpClient);

  getItem(itemId: string, region: Region) {
    return this.http.get<MarketLookupResponse>(
      `${environment.apiBaseUrl}/api/v1/market/items/${encodeURIComponent(itemId)}`,
      { params: { region, locale: preferredDataLocale() } },
    );
  }
}
