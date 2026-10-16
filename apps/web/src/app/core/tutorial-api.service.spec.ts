import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { IdentityService } from './identity.service';
import { TutorialApiService } from './tutorial-api.service';

describe('TutorialApiService', () => {
  it('loads public content with ui locale without identity', () => {
    const identity = { token: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IdentityService, useValue: identity },
      ],
    });
    const service = TestBed.inject(TutorialApiService);
    const http = TestBed.inject(HttpTestingController);

    let result: unknown;
    service.getPublished('market').subscribe((response) => {
      result = response;
    });

    const req = http.expectOne(
      (request) =>
        request.url === `${environment.apiBaseUrl}/api/v1/tutorials/market` &&
        request.params.get('locale') === 'pt-BR',
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({ guide: null });

    expect(result).toEqual({ guide: null });
    expect(identity.token).not.toHaveBeenCalled();
    http.verify();
  });

  it('adds a verified bearer token to management read and replacement', async () => {
    const identity = { token: vi.fn().mockResolvedValue('verified-firebase-token') };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IdentityService, useValue: identity },
      ],
    });
    const service = TestBed.inject(TutorialApiService);
    const http = TestBed.inject(HttpTestingController);

    const managementPromise = service.getManagement();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const getReq = http.expectOne(`${environment.apiBaseUrl}/api/v1/tutorials/manage`);
    expect(getReq.request.method).toBe('GET');
    expect(getReq.request.headers.get('Authorization')).toBe('Bearer verified-firebase-token');
    getReq.flush({ screens: [], locales: ['pt-BR'], guides: [] });
    await expect(managementPromise).resolves.toEqual({
      screens: [],
      locales: ['pt-BR'],
      guides: [],
    });

    const replacePromise = service.replace('market', 'pt-BR', {
      expectedUpdatedAt: null,
      enabled: true,
      steps: [
        {
          sortOrder: 0,
          anchorKey: 'market.search',
          title: 'Buscar',
          body: 'Pesquise um item.',
        },
      ],
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const putReq = http.expectOne(
      (request) =>
        request.url === `${environment.apiBaseUrl}/api/v1/tutorials/manage/market` &&
        request.params.get('locale') === 'pt-BR',
    );
    expect(putReq.request.method).toBe('PUT');
    expect(putReq.request.headers.get('Authorization')).toBe('Bearer verified-firebase-token');
    const savedGuide = {
      id: 'guide-1',
      screenKey: 'market' as const,
      locale: 'pt-BR' as const,
      enabled: true,
      updatedAt: '2026-10-15T12:00:00.000Z',
      steps: [
        {
          id: 'step-1',
          sortOrder: 0,
          anchorKey: 'market.search',
          title: 'Buscar',
          body: 'Pesquise um item.',
        },
      ],
    };
    putReq.flush(savedGuide);
    await expect(replacePromise).resolves.toEqual(savedGuide);
    expect(identity.token).toHaveBeenCalledTimes(2);
    http.verify();
  });
});
