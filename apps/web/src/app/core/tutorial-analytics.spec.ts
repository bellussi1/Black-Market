import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';
import { useMemoryStorage } from '../testing/test-setup';
import { AnalyticsService } from './analytics.service';
import { PrivacyService } from './privacy.service';
const revision = '2026-10-15T12:00:00.000Z';
describe('Tutorial aggregate analytics', () => {
  useMemoryStorage();
  const original = environment.production;
  afterEach(() => {
    environment.production = original;
  });
  function setup(enabled = true) {
    environment.production = true;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const service = TestBed.inject(AnalyticsService),
      http = TestBed.inject(HttpTestingController),
      privacy = TestBed.inject(PrivacyService);
    service.start();
    http
      .expectOne(environment.apiBaseUrl + '/api/v1/analytics/config')
      .flush({ enabled, key: 'phc_test', host: 'https://eu.i.posthog.com' });
    TestBed.tick();
    return { service, http, privacy };
  }
  it('sends only allowlisted tutorial properties after consent', () => {
    const { service, http, privacy } = setup();
    privacy.save(true);
    TestBed.tick();
    http.expectOne('https://eu.i.posthog.com/i/v0/e/').flush({});
    service.captureTutorial('tutorial_started', 'market', revision);
    const request = http.expectOne('https://eu.i.posthog.com/i/v0/e/');
    expect(Object.keys(request.request.body.properties).sort()).toEqual([
      '$ip',
      '$process_person_profile',
      'distinct_id',
      'guideUpdatedAt',
      'screenKey',
    ]);
    expect(request.request.body.properties.screenKey).toBe('market');
    request.flush({});
    expect(service.captureTutorial('tutorial_started', 'private-route' as never, revision)).toBe(
      false,
    );
    expect(service.captureTutorial('tutorial_step' as never, 'market', revision)).toBe(false);
    http.verify();
  });
  it('does not send tutorial events without consent or when analytics is disabled', () => {
    const { service, http } = setup(false);
    expect(service.captureTutorial('tutorial_started', 'market', revision)).toBe(false);
    http.expectNone('https://eu.i.posthog.com/i/v0/e/');
    http.verify();
  });
  it('stops tutorial events immediately when analytics consent is revoked', () => {
    const { service, http, privacy } = setup();
    expect(service.captureTutorial('tutorial_started', 'market', revision)).toBe(false);
    privacy.save(true);
    TestBed.tick();
    http.expectOne('https://eu.i.posthog.com/i/v0/e/').flush({});
    service.captureTutorial('tutorial_started', 'market', revision);
    const pending = http.expectOne('https://eu.i.posthog.com/i/v0/e/');
    privacy.save(false);
    expect(pending.cancelled).toBe(true);
    expect(service.captureTutorial('tutorial_completed', 'market', revision)).toBe(false);
    http.verify({ ignoreCancelled: true });
  });
});
