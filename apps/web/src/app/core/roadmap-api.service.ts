import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import type { RoadmapResponse, RoadmapUpdateRequest } from '@bdo/shared';
import { firstValueFrom, type Observable, of, tap } from 'rxjs';

import { environment } from '../../environments/environment';
import { IdentityService } from './identity.service';

const PUBLIC_ROADMAP_KEY = makeStateKey<RoadmapResponse>('black-market-public-roadmap');

@Injectable({ providedIn: 'root' })
export class RoadmapApiService {
  private readonly http = inject(HttpClient);
  private readonly identity = inject(IdentityService);
  private readonly transfer = inject(TransferState);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/roadmap`;

  getPublic(): Observable<RoadmapResponse> {
    if (this.browser && this.transfer.hasKey(PUBLIC_ROADMAP_KEY)) {
      const response = this.transfer.get(PUBLIC_ROADMAP_KEY, { entries: [], updatedAt: null });
      this.transfer.remove(PUBLIC_ROADMAP_KEY);
      return of(response);
    }
    return this.http.get<RoadmapResponse>(this.baseUrl).pipe(
      tap((response) => {
        if (!this.browser) this.transfer.set(PUBLIC_ROADMAP_KEY, response);
      }),
    );
  }

  async getManaged(): Promise<RoadmapResponse> {
    const headers = await this.authorization();
    return firstValueFrom(this.http.get<RoadmapResponse>(`${this.baseUrl}/manage`, { headers }));
  }

  async replace(update: RoadmapUpdateRequest): Promise<RoadmapResponse> {
    const headers = await this.authorization();
    return firstValueFrom(
      this.http.put<RoadmapResponse>(`${this.baseUrl}/manage`, update, { headers }),
    );
  }

  private async authorization(): Promise<HttpHeaders> {
    const token = await this.identity.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
