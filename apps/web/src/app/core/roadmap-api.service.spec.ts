import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { IdentityService } from './identity.service';
import { RoadmapApiService } from './roadmap-api.service';

const flushAsyncWork = async () => {
  for (let index = 0; index < 4; index++) await Promise.resolve();
};

describe('RoadmapApiService', () => {
  it('loads public content without requiring an identity token', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const api = TestBed.inject(RoadmapApiService);
    const http = TestBed.inject(HttpTestingController);
    const result: unknown[] = [];
    api.getPublic().subscribe((response) => result.push(response));
    const request = http.expectOne((candidate) => candidate.url.endsWith('/api/v1/roadmap'));
    expect(request.request.method).toBe('GET');
    request.flush({ entries: [], updatedAt: null });
    expect(result).toEqual([{ entries: [], updatedAt: null }]);
    http.verify();
  });

  it('uses a Supabase bearer token for management requests and saves', async () => {
    const token = vi.fn().mockResolvedValue('verified-session');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: IdentityService, useValue: { token } },
      ],
    });
    const api = TestBed.inject(RoadmapApiService);
    const http = TestBed.inject(HttpTestingController);
    const managed = api.getManaged();
    await flushAsyncWork();
    const readRequest = http.expectOne((candidate) => candidate.url.endsWith('/roadmap/manage'));
    expect(readRequest.request.headers.get('Authorization')).toBe('Bearer verified-session');
    readRequest.flush({ entries: [], updatedAt: null });
    await expect(managed).resolves.toEqual({ entries: [], updatedAt: null });

    const saved = api.replace({ expectedUpdatedAt: null, entries: [] });
    await flushAsyncWork();
    const writeRequest = http.expectOne((candidate) => candidate.url.endsWith('/roadmap/manage'));
    expect(writeRequest.request.method).toBe('PUT');
    expect(writeRequest.request.headers.get('Authorization')).toBe('Bearer verified-session');
    writeRequest.flush({ entries: [], updatedAt: null });
    await expect(saved).resolves.toEqual({ entries: [], updatedAt: null });
    expect(token).toHaveBeenCalledTimes(2);
    http.verify();
  });
});
