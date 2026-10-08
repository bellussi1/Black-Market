import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';
import { useMemoryStorage } from '../testing/test-setup';
import { operationalErrorInterceptor, OperationalErrors } from './operational-errors';
describe('minimal operational telemetry', () => {
  useMemoryStorage();
  const original = environment.production;
  afterEach(() => {
    environment.production = original;
  });
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([operationalErrorInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    return {
      errors: TestBed.inject(OperationalErrors),
      http: TestBed.inject(HttpTestingController),
    };
  }
  it('reports bounded context without raw errors or invalid correlation data', () => {
    environment.production = true;
    const { errors, http } = setup();
    for (let i = 0; i < 6; i++) errors.report('http', 503 + i, 'private-token');
    const requests = http.match(environment.apiBaseUrl + '/api/v1/telemetry/errors');
    expect(requests.length).toBe(5);
    expect(requests[0].request.body).toEqual({ kind: 'http', area: 'home', status: 503 });
    for (const request of requests) request.flush({ received: true });
    http.verify();
  });
  it('deduplicates failures and reports the world feature without navigation details', () => {
    environment.production = true;
    const { errors, http } = setup();
    Object.defineProperty(TestBed.inject(Router), 'url', {
      value: '/world?token=private',
    });
    errors.report('runtime');
    errors.report('runtime');
    errors.report('http', -1, '------------------------------------');
    const requests = http.match(environment.apiBaseUrl + '/api/v1/telemetry/errors');
    expect(requests.length).toBe(2);
    expect(requests[0].request.body).toEqual({ kind: 'runtime', area: 'world' });
    expect(requests[1].request.body).toEqual({ kind: 'http', area: 'world' });
    for (const request of requests) request.flush({ received: true });
    http.verify();
  });
  it('does not send operational telemetry in development', () => {
    environment.production = false;
    const { errors, http } = setup();
    errors.report('runtime');
    http.verify();
  });
  it('captures server failures without recursively reporting failed telemetry', () => {
    environment.production = true;
    const { http } = setup();
    TestBed.inject(HttpClient)
      .get(environment.apiBaseUrl + '/api/v1/items?search=private')
      .subscribe({ error: () => undefined });
    http.expectOne(environment.apiBaseUrl + '/api/v1/items?search=private').flush(
      { secret: 'private' },
      {
        status: 503,
        statusText: 'Unavailable',
        headers: {
          'X-Request-ID': 'b1b7c9b4-8cc3-48a9-ae63-f960c37164bc',
        },
      },
    );
    const report = http.expectOne(environment.apiBaseUrl + '/api/v1/telemetry/errors');
    expect(report.request.body).toEqual({
      kind: 'http',
      area: 'home',
      status: 503,
      requestId: 'b1b7c9b4-8cc3-48a9-ae63-f960c37164bc',
    });
    expect(JSON.stringify(report.request.body)).not.toContain('private');
    report.flush({}, { status: 503, statusText: 'Unavailable' });
    http.verify();
  });
  it('does not report ordinary validation errors as outages', () => {
    environment.production = true;
    const { http } = setup();
    TestBed.inject(HttpClient)
      .get(environment.apiBaseUrl + '/api/v1/items')
      .subscribe({ error: () => undefined });
    http
      .expectOne(environment.apiBaseUrl + '/api/v1/items')
      .flush({}, { status: 400, statusText: 'Bad Request' });
    http.verify();
  });
});
