import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { RoadmapResponse } from '@bdo/shared';
import { afterEach, describe, expect, it } from 'vitest';

import { IdentityService } from './identity.service';
import { RoadmapApiService } from './roadmap-api.service';

const key = makeStateKey<RoadmapResponse>('black-market-public-roadmap');
const snapshot: RoadmapResponse = { entries: [], updatedAt: null };

describe('public roadmap hydration', () => {
  afterEach(() => TestBed.resetTestingModule());

  function setup(platform = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: IdentityService, useValue: {} },
      ],
    });
    return {
      api: TestBed.inject(RoadmapApiService),
      http: TestBed.inject(HttpTestingController),
      state: TestBed.inject(TransferState),
    };
  }

  it('uses the SSR snapshot once, then allows an explicit fresh request', () => {
    const { api, http, state } = setup();
    state.set(key, snapshot);
    let received: RoadmapResponse | undefined;
    api.getPublic().subscribe((value) => (received = value));
    expect(received).toEqual(snapshot);
    http.expectNone((request) => request.url.endsWith('/api/v1/roadmap'));
    expect(state.hasKey(key)).toBe(false);

    api.getPublic().subscribe();
    http.expectOne((request) => request.url.endsWith('/api/v1/roadmap')).flush(snapshot);
    http.verify();
  });

  it('transfers only the successful public response rendered by the server', () => {
    const { api, http, state } = setup('server');
    api.getPublic().subscribe();
    http.expectOne((request) => request.url.endsWith('/api/v1/roadmap')).flush(snapshot);
    expect(state.get(key, { entries: [], updatedAt: 'missing' })).toEqual(snapshot);
    http.verify();
  });
});
