import { DOCUMENT } from '@angular/common';
import { type HttpHandlerFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { apiOriginInterceptor } from './api-origin.interceptor';

describe('API public origin interceptor', () => {
  it('uses the absolute public origin for relative browser API URLs without changing params', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: DOCUMENT, useValue: { baseURI: 'https://example.test/recipes' } },
      ],
    });
    const next = vi.fn<HttpHandlerFn>(() => of(new HttpResponse()));
    const request = new HttpRequest('GET', '/api/v1/market/board?region=sa');
    TestBed.runInInjectionContext(() => apiOriginInterceptor(request, next));
    expect(next.mock.calls[0][0].url).toBe('https://example.test/api/v1/market/board?region=sa');
    for (const url of ['https://api.test/api/v1/items', '/assets/icon.webp']) {
      const untouched = new HttpRequest('GET', url);
      TestBed.runInInjectionContext(() => apiOriginInterceptor(untouched, next));
      expect(next.mock.calls.at(-1)?.[0]).toBe(untouched);
    }
  });

  it('leaves SSR requests for the server interceptor to resolve', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const next = vi.fn<HttpHandlerFn>(() => of(new HttpResponse()));
    const request = new HttpRequest('GET', '/api/v1/recipes');
    TestBed.runInInjectionContext(() => apiOriginInterceptor(request, next));
    expect(next.mock.calls[0][0]).toBe(request);
  });
});
