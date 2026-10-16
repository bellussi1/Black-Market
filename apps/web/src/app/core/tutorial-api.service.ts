import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type {
  TutorialGuide,
  TutorialGuideResponse,
  TutorialGuideUpdateRequest,
  TutorialManagementResponse,
  TutorialScreenKey,
} from '@bdo/shared';
import { firstValueFrom, type Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { IdentityService } from './identity.service';
import { uiLocale } from './locale';

@Injectable({ providedIn: 'root' })
export class TutorialApiService {
  private readonly http = inject(HttpClient);
  private readonly identity = inject(IdentityService);
  private readonly baseUrl = `${environment.apiBaseUrl}/api/v1/tutorials`;

  getPublished(
    screenKey: TutorialScreenKey,
    locale = uiLocale(),
  ): Observable<TutorialGuideResponse> {
    const params = new HttpParams().set('locale', locale);
    return this.http.get<TutorialGuideResponse>(
      `${this.baseUrl}/${encodeURIComponent(screenKey)}`,
      { params },
    );
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
    const params = new HttpParams().set('locale', locale);
    return firstValueFrom(
      this.http.put<TutorialGuide>(
        `${this.baseUrl}/manage/${encodeURIComponent(screenKey)}`,
        update,
        { headers, params },
      ),
    );
  }

  private async authorization(): Promise<HttpHeaders> {
    const token = await this.identity.token();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
