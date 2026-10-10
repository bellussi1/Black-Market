import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { MarketLookupResponse, ProductionCatalogResponse } from '@bdo/shared';

import { environment } from '../../environments/environment';
import { preferredDataLocale } from './locale';

@Injectable({ providedIn: 'root' })
export class ProductionApi {
  private readonly http = inject(HttpClient);
  catalog(region: string) {
    return this.http.get<ProductionCatalogResponse>(
      `${environment.apiBaseUrl}/api/v1/production/catalog`,
      {
        params: { region, preferredLocale: preferredDataLocale() },
      },
    );
  }
  quotes(region: string, ids: number[]) {
    return this.http.get<MarketLookupResponse>(
      `${environment.apiBaseUrl}/api/v1/market/production-quotes`,
      {
        params: { region, locale: preferredDataLocale(), ids: ids.join(',') },
      },
    );
  }
}
