import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import type { TutorialGuideUpdateRequest, TutorialManagementResponse } from '@bdo/shared';
import { describe, expect, it, vi } from 'vitest';

import { environment } from '../../environments/environment';
import { IdentityService } from './identity.service';
import { TutorialApiService } from './tutorial-api.service';

const flushAsyncWork = async () => {
  for (let index = 0; index < 4; index++) await Promise.resolve();
};

describe('TutorialApiService', () => {
  it('loads public content with the UI locale and without identity', () => {
    const token = vi.fn().mockRejectedValue(new Error('Public guides do not need identity'));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IdentityService, useValue: { token } },
      ],
    });

    const api = TestBed.inject(TutorialApiService);
    const http = TestBed.inject(HttpTestingController);
    let response: unknown;
    api.getPublished('recipes', 'pt-BR').subscribe((value) => (response = value));

    const request = http.expectOne(
      `${environment.apiBaseUrl}/api/v1/tutorials/recipes?locale=pt-BR`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({ guide: null });

    expect(response).toEqual({ guide: null });
    expect(token).not.toHaveBeenCalled();
    http.verify();
  });

  it('adds a Firebase bearer token to management read and replacement', async () => {
    const token = vi.fn().mockResolvedValue('verified-session');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IdentityService, useValue: { token } },
      ],
    });

    const api = TestBed.inject(TutorialApiService);
    const http = TestBed.inject(HttpTestingController);
    const managementResponse: TutorialManagementResponse = {
      screens: [],
      locales: ['pt-BR'],
      guides: [],
    };
    const management = api.getManagement();
    await flushAsyncWork();

    const readRequest = http.expectOne(`${environment.apiBaseUrl}/api/v1/tutorials/manage`);
    expect(readRequest.request.method).toBe('GET');
    expect(readRequest.request.headers.get('Authorization')).toBe('Bearer verified-session');
    readRequest.flush(managementResponse);
    await expect(management).resolves.toEqual(managementResponse);

    const update: TutorialGuideUpdateRequest = {
      expectedUpdatedAt: null,
      enabled: true,
      steps: [{ sortOrder: 0, anchorKey: null, title: 'Guia', body: 'Texto simples.' }],
    };
    const replacement = api.replace('recipes', 'pt-BR', update);
    await flushAsyncWork();

    const writeRequest = http.expectOne(
      `${environment.apiBaseUrl}/api/v1/tutorials/manage/recipes?locale=pt-BR`,
    );
    expect(writeRequest.request.method).toBe('PUT');
    expect(writeRequest.request.headers.get('Authorization')).toBe('Bearer verified-session');
    expect(writeRequest.request.body).toEqual(update);
    const saved = {
      id: 'guide-1',
      screenKey: 'recipes',
      locale: 'pt-BR',
      enabled: true,
      updatedAt: '2026-10-15T12:00:00.000Z',
      steps: [
        { id: 'step-1', sortOrder: 0, anchorKey: null, title: 'Guia', body: 'Texto simples.' },
      ],
    };
    writeRequest.flush(saved);
    await expect(replacement).resolves.toEqual(saved);
    expect(token).toHaveBeenCalledTimes(2);
    http.verify();
  });
});
