import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { MarketLookupResponse } from '@bdo/shared';

import { environment } from '../../environments/environment';
import { CatalogApiService } from './catalog-api.service';
import { preferredDataLocale } from './locale';
import type { Region } from './region-preferences';

@Injectable({ providedIn: 'root' })
export class ProductionApi {
  private readonly http = inject(HttpClient);
  private readonly catalogApi = inject(CatalogApiService);
  catalog(region: Region) {
    return this.catalogApi.getProductionCatalog(region);
  }
  quotes(region: Region, ids: number[]) {
    return this.http.get<MarketLookupResponse>(
      `${environment.apiBaseUrl}/api/v1/market/production-quotes`,
      {
        params: { region, locale: preferredDataLocale(), ids: ids.join(',') },
      },
    );
  }
}
