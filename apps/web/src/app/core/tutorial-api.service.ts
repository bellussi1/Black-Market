import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  type TutorialGuide,
  type TutorialGuideResponse,
  type TutorialGuideUpdateRequest,
  type TutorialManagementResponse,
  type TutorialScreenKey,
} from '@bdo/shared';
import { firstValueFrom, type Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { IdentityService } from './identity.service';

@Injectable({ providedIn: 'root' })
export class TutorialApiService {
  private readonly http = inject(HttpClient);
  private readonly identity = inject(IdentityService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/tutorials`;

  getPublished(screenKey: TutorialScreenKey, locale: string): Observable<TutorialGuideResponse> {
    return this.http.get<TutorialGuideResponse>(`${this.baseUrl}/${screenKey}`, {
      params: new HttpParams().set('locale', locale),
    });
  }

  async getManagement(): Promise<TutorialManagementResponse> {
    const headers = await this.authorization();
    return firstValueFrom(
      this.http.get<TutorialManagementResponse>(`${this.baseUrl}/manage`, { headers }),
    );
  }

  async replace(
    screenKey: TutorialScreenKey,
    locale: string,
    update: TutorialGuideUpdateRequest,
  ): Promise<TutorialGuide> {
    const headers = await this.authorization();
    return firstValueFrom(
      this.http.put<TutorialGuide>(`${this.baseUrl}/manage/${screenKey}`, update, {
        headers,
        params: new HttpParams().set('locale', locale),
      }),
    );
  }

  private async authorization(): Promise<HttpHeaders> {
    const token = await this.identity.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
