import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import type { Subject } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';
import { useMemoryStorage } from '../testing/test-setup';
import { AnalyticsService, cleanProperties } from './analytics.service';
import { PRIVACY_KEY, PrivacyService } from './privacy.service';

describe('privacy and product analytics', () => {
  useMemoryStorage();
  const originalProduction = environment.production;
  afterEach(() => {
    environment.production = originalProduction;
  });
  function setup(enabled = true) {
    environment.production = true;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const service = TestBed.inject(AnalyticsService);
    const http = TestBed.inject(HttpTestingController);
    const privacy = TestBed.inject(PrivacyService);
    service.start();
    http
      .expectOne(environment.apiBaseUrl + '/api/v1/analytics/config')
      .flush({ enabled, key: 'phc_public_test_only', host: 'https://eu.i.posthog.com' });
    TestBed.tick();
    return { service, http, privacy };
  }
  it('rejects optional events before and after explicit rejection; no scripts loaded', () => {
    const { service, http, privacy } = setup();
    expect(service.capture('journey_completed', { feature: 'profile', action: 'save' })).toBe(
      false,
    );
    privacy.save(false);
    TestBed.tick();
    expect(service.capture('page_viewed', { feature: 'home' })).toBe(false);
    http.expectNone('https://eu.i.posthog.com/i/v0/e/');
    expect(document.querySelector('script[src*="posthog"]')).toBeNull();
    expect(localStorage.getItem('black-market.analytics.v1')).toBeNull();
    http.verify();
  });
  it('accepts selectively, deduplicates navigation, sanitizes properties and revokes in-flight events', () => {
    const { service, http, privacy } = setup();
    localStorage.setItem('black-market.analytics.v1', 'private@email.invalid');
    privacy.save(true);
    TestBed.tick();
    const first = http.expectOne('https://eu.i.posthog.com/i/v0/e/');
    expect(first.request.body.event).toBe('page_viewed');
    expect(JSON.stringify(first.request.body)).not.toContain('private@email');
    expect(first.request.body.properties.$ip).toBeNull();
    first.flush({ status: 1 });
    const router = TestBed.inject(Router);
    (router.events as Subject<unknown>).next(new NavigationEnd(1, '/', '/'));
    http.expectNone('https://eu.i.posthog.com/i/v0/e/');
    service.capture('journey_completed', { feature: 'scans', action: 'import', status: 'success' });
    const pending = http.expectOne('https://eu.i.posthog.com/i/v0/e/');
    privacy.save(false);
    expect(pending.cancelled).toBe(true);
    expect(localStorage.getItem('black-market.analytics.v1')).toBeNull();
    expect(service.capture('journey_completed', { feature: 'scans' })).toBe(false);
    http.verify({ ignoreCancelled: true });
  });
  it('revokes analytics immediately when another tab clears saved preferences', () => {
    const { service, http, privacy } = setup();
    privacy.save(true);
    TestBed.tick();
    http.expectOne('https://eu.i.posthog.com/i/v0/e/').flush({ status: 1 });
    service.capture('journey_completed', { feature: 'market', action: 'search' });
    const pending = http.expectOne('https://eu.i.posthog.com/i/v0/e/');
    localStorage.removeItem(PRIVACY_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(privacy.allowsAnalytics()).toBe(false);
    expect(pending.cancelled).toBe(true);
    expect(localStorage.getItem('black-market.analytics.v1')).toBeNull();
    http.verify({ ignoreCancelled: true });
  });
  it('persists preference and expires invalid or older choices', () => {
    localStorage.setItem(
      'black-market.privacy.v1',
      JSON.stringify({ version: 1, analytics: true, updatedAt: new Date().toISOString() }),
    );
    const privacy = TestBed.inject(PrivacyService);
    expect(privacy.allowsAnalytics()).toBe(true);
    privacy.save(false);
    expect(JSON.parse(localStorage.getItem('black-market.privacy.v1')!).analytics).toBe(false);
    localStorage.setItem(
      'black-market.privacy.v1',
      JSON.stringify({ version: 1, analytics: true, updatedAt: '2020-01-01' }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: 'black-market.privacy.v1' }));
    expect(privacy.choices()).toBeNull();
  });
  it('uses only allowlisted properties', () => {
    expect(
      cleanProperties({
        feature: 'market',
        action: 'search',
        token: 'private',
        email: 'private',
        stock: 999,
      } as never),
    ).toEqual({ feature: 'market', action: 'search' });
  });
  it('does not initialize analytics in development', () => {
    environment.production = false;
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    TestBed.inject(AnalyticsService).start();
    TestBed.inject(HttpTestingController).verify();
  });
});
