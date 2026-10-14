import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { RoadmapResponse, RoadmapUpdateRequest } from '@bdo/shared';
import { firstValueFrom, type Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { IdentityService } from './identity.service';

@Injectable({ providedIn: 'root' })
export class RoadmapApiService {
  private readonly http = inject(HttpClient);
  private readonly identity = inject(IdentityService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/roadmap`;

  getPublic(): Observable<RoadmapResponse> {
    return this.http.get<RoadmapResponse>(this.baseUrl);
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
