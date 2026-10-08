import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '../../environments/environment';
import { preferredDataLocale } from './locale';
import { RegionPreferences } from './region-preferences';
export interface ReferenceEntry {
  id: string;
  name: string;
  kind?: string;
  data?: Record<string, unknown>;
  updatedAt?: string | null;
}
@Injectable({ providedIn: 'root' })
export class ReferenceApi {
  private readonly http = inject(HttpClient);
  private readonly preferences = inject(RegionPreferences);
  private readonly url = environment.apiBaseUrl + '/api/v1/reference';
  kinds() {
    return this.http.get<{
      kinds: { kind: string; label: string; total: number }[];
      updatedAt: string | null;
    }>(this.url, {
      params: { region: this.preferences.region(), preferredLocale: preferredDataLocale() },
    });
  }
  list(kind: string, q = '', page = 1, pageSize = 24) {
    return this.http.get<{
      items: ReferenceEntry[];
      total: number;
      page: number;
      pageSize: number;
      updatedAt: string | null;
    }>(this.url + '/' + encodeURIComponent(kind), {
      params: {
        region: this.preferences.region(),
        preferredLocale: preferredDataLocale(),
        q,
        page,
        pageSize,
      },
    });
  }
  detail(kind: string, id: string) {
    return this.http.get<ReferenceEntry>(
      this.url + '/' + encodeURIComponent(kind) + '/' + encodeURIComponent(id),
      { params: { region: this.preferences.region(), preferredLocale: preferredDataLocale() } },
    );
  }
}
