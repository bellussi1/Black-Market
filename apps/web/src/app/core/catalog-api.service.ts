import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  ActiveDatasetSummary,
  CatalogCategoriesResponse,
  CatalogItem,
  CatalogItemDetail,
  CatalogPage,
  CatalogRecipesResponse,
} from '@bdo/shared';

import { environment } from '../../environments/environment';
import { preferredDataLocale } from './locale';
import { RegionPreferences } from './region-preferences';

export interface CatalogSearchParams {
  ids?: readonly number[];
  q?: string;
  categoryId?: string;
  grade?: string;
  page: number;
  pageSize: number;
}

export interface CatalogItemResponse {
  item: CatalogItemDetail;
  dataset: ActiveDatasetSummary;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly preferences = inject(RegionPreferences);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

  resolveIconUrl(item: CatalogItem): string | null {
    return item.iconUrl ? new URL(item.iconUrl, environment.apiBaseUrl).href : null;
  }

  itemIconUrl(id: number, dataset: ActiveDatasetSummary | null | undefined): string | null {
    return dataset?.checksum
      ? `${this.baseUrl}/items/${id}/icon?dataset=${dataset.checksum}`
      : null;
  }

  getItems(params: CatalogSearchParams) {
    let httpParams = new HttpParams()
      .set('region', this.preferences.region())
      .set('preferredLocale', preferredDataLocale())
      .set('page', String(params.page))
      .set('pageSize', String(params.pageSize));
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.ids?.length) httpParams = httpParams.set('ids', params.ids.join(','));
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.grade) httpParams = httpParams.set('grade', params.grade);
    return this.http.get<CatalogPage>(`${this.baseUrl}/items`, { params: httpParams });
  }

  getCategories() {
    return this.http.get<CatalogCategoriesResponse>(`${this.baseUrl}/categories`, {
      params: { region: this.preferences.region(), preferredLocale: preferredDataLocale() },
    });
  }

  getItem(id: number) {
    return this.http.get<CatalogItemResponse>(`${this.baseUrl}/items/${id}`, {
      params: { region: this.preferences.region(), preferredLocale: preferredDataLocale() },
    });
  }

  getItemRecipes(id: number, direction: 'produces' | 'uses') {
    const params = new HttpParams()
      .set('direction', direction)
      .set('region', this.preferences.region())
      .set('preferredLocale', preferredDataLocale());
    return this.http.get<CatalogRecipesResponse>(`${this.baseUrl}/items/${id}/recipes`, { params });
  }
}
