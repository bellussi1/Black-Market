import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { environment } from '../../../environments/environment';
import { MarketApi } from './market-api';

describe('MarketApi', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
  });

  it('queries the application API with the requested region', () => {
    let result: unknown;
    TestBed.inject(MarketApi)
      .getItem('676', 'eu')
      .subscribe((value) => (result = value));
    const request = TestBed.inject(HttpTestingController).expectOne(
      `${environment.apiBaseUrl}/api/v1/market/items/676?region=eu&locale=pt`,
    );
    expect(request.request.method).toBe('GET');
    request.flush({ source: 'arsha', region: 'eu', items: [] });
    expect(result).toEqual({ source: 'arsha', region: 'eu', items: [] });
  });
  it('omits the empty category so the default market query passes API validation', () => {
    TestBed.inject(MarketApi)
      .board({ region: 'sa', q: '', categoryId: '', sort: 'hot', page: 1, pageSize: 20 })
      .subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne((entry) =>
      entry.url.endsWith('/market/board'),
    );
    expect(request.request.params.has('categoryId')).toBe(false);
    expect(request.request.params.get('pageSize')).toBe('20');
    request.flush({ items: [], total: 0 });
  });
});
