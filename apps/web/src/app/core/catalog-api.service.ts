import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type {
  ActiveDatasetSummary,
  CatalogCategoriesResponse,
  CatalogItem,
  CatalogPage,
  CatalogRecipesResponse,
} from '@bdo/shared';
import { environment } from '../../environments/environment';
import { WorkspaceStore } from './workspace-store';

export interface CatalogSearchParams {
  q?: string;
  categoryId?: string;
  grade?: string;
  page: number;
  pageSize: number;
}

export interface CatalogItemResponse {
  item: CatalogItem;
  dataset: ActiveDatasetSummary;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly workspace = inject(WorkspaceStore);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1`;

  getItems(params: CatalogSearchParams) {
    let httpParams = new HttpParams()
      .set('region', this.workspace.data().region)
      .set('page', String(params.page))
      .set('pageSize', String(params.pageSize));
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.categoryId) httpParams = httpParams.set('categoryId', params.categoryId);
    if (params.grade) httpParams = httpParams.set('grade', params.grade);
    return this.http.get<CatalogPage>(`${this.baseUrl}/items`, { params: httpParams });
  }

  getCategories() {
    return this.http.get<CatalogCategoriesResponse>(`${this.baseUrl}/categories`, { params: { region: this.workspace.data().region } });
  }

  getItem(id: number) {
    return this.http.get<CatalogItemResponse>(`${this.baseUrl}/items/${id}`, { params: { region: this.workspace.data().region } });
  }

  getItemRecipes(id: number, direction: 'produces' | 'uses') {
    const params = new HttpParams().set('direction', direction).set('region', this.workspace.data().region);
    return this.http.get<CatalogRecipesResponse>(
      `${this.baseUrl}/items/${id}/recipes`,
      { params },
    );
  }
}
