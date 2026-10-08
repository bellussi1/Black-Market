import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';
import { useMemoryStorage } from '../testing/test-setup';
import { OperationalErrors } from './operational-errors';
describe('minimal operational telemetry', () => {
  useMemoryStorage();
  const original = environment.production;
  afterEach(() => {
    environment.production = original;
  });
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    return {
      errors: TestBed.inject(OperationalErrors),
      http: TestBed.inject(HttpTestingController),
    };
  }
  it('reports bounded context without raw errors or invalid correlation data', () => {
    environment.production = true;
    const { errors, http } = setup();
    for (let i = 0; i < 6; i++) errors.report('http', 503, 'private-token');
    const requests = http.match(environment.apiBaseUrl + '/api/v1/telemetry/errors');
    expect(requests.length).toBe(5);
    expect(requests[0].request.body).toEqual({ kind: 'http', area: 'other', status: 503 });
    for (const request of requests) request.flush({ received: true });
    http.verify();
  });
  it('does not send operational telemetry in development', () => {
    environment.production = false;
    const { errors, http } = setup();
    errors.report('runtime');
    http.verify();
  });
});
