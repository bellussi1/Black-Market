import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import type { Subject } from 'rxjs';
import { afterEach, describe, expect, it } from 'vitest';

import { environment } from '../../environments/environment';
import { useMemoryStorage } from '../testing/test-setup';
import { AnalyticsService, cleanProperties } from './analytics.service';
import {
  ANALYTICS_ID_COOKIE,
  ANALYTICS_ID_KEY,
  PRIVACY_COOKIE,
  PRIVACY_KEY,
  PrivacyService,
} from './privacy.service';

function cookieValue(name: string): string | null {
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + '='))
    ?.slice(name.length + 1);
  return value === undefined ? null : decodeURIComponent(value);
}

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
    expect(cookieValue(ANALYTICS_ID_COOKIE)).toBeNull();
    expect(localStorage.getItem(ANALYTICS_ID_KEY)).toBeNull();
    http.verify();
  });
  it('accepts selectively, deduplicates navigation, sanitizes properties and revokes in-flight events', () => {
    const { service, http, privacy } = setup();
    localStorage.setItem(ANALYTICS_ID_KEY, 'private@email.invalid');
    privacy.save(true);
    TestBed.tick();
    const first = http.expectOne('https://eu.i.posthog.com/i/v0/e/');
    expect(first.request.body.event).toBe('page_viewed');
    expect(cookieValue(ANALYTICS_ID_COOKIE)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
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
    expect(localStorage.getItem(ANALYTICS_ID_KEY)).toBeNull();
    expect(cookieValue(ANALYTICS_ID_COOKIE)).toBeNull();
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
    document.cookie = `${PRIVACY_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    window.dispatchEvent(new Event('focus'));
    expect(privacy.allowsAnalytics()).toBe(false);
    expect(pending.cancelled).toBe(true);
    expect(cookieValue(ANALYTICS_ID_COOKIE)).toBeNull();
    expect(localStorage.getItem(ANALYTICS_ID_KEY)).toBeNull();
    http.verify({ ignoreCancelled: true });
  });
  it('persists preference and expires invalid or older choices', () => {
    localStorage.setItem(
      PRIVACY_KEY,
      JSON.stringify({ version: 1, analytics: true, updatedAt: new Date().toISOString() }),
    );
    const privacy = TestBed.inject(PrivacyService);
    expect(privacy.allowsAnalytics()).toBe(true);
    expect(localStorage.getItem(PRIVACY_KEY)).toBeNull();
    expect(JSON.parse(cookieValue(PRIVACY_COOKIE)!).analytics).toBe(true);
    privacy.save(false);
    expect(JSON.parse(cookieValue(PRIVACY_COOKIE)!).analytics).toBe(false);
    document.cookie = `${PRIVACY_COOKIE}=${encodeURIComponent(
      JSON.stringify({ version: 1, analytics: true, updatedAt: '2020-01-01' }),
    )}; Path=/; SameSite=Lax`;
    window.dispatchEvent(new Event('focus'));
    expect(privacy.choices()).toBeNull();
  });
  it('uses only allowlisted properties', () => {
    expect(
      cleanProperties({
        feature: 'market',
        action: 'search',
        result: 'matches',
        token: 'private',
        email: 'private',
        stock: 999,
      } as never),
    ).toEqual({ feature: 'market', action: 'search', result: 'matches' });
    expect(
      cleanProperties({
        feature: 'catalog',
        result: 'no_matches',
        search: 'Fármaco da Harmonia',
        itemId: 3400,
        silver: '999999',
      } as never),
    ).toEqual({ feature: 'catalog', result: 'no_matches' });
  });
  it('captures a detail view and aggregate search outcome without user data', () => {
    const { service, http, privacy } = setup();
    privacy.save(true);
    TestBed.tick();
    http.expectOne('https://eu.i.posthog.com/i/v0/e/').flush({ status: 1 });
    service.capture('journey_completed', {
      feature: 'catalog',
      action: 'search',
      status: 'success',
      result: 'no_matches',
    });
    const search = http.expectOne('https://eu.i.posthog.com/i/v0/e/');
    expect(search.request.body.event).toBe('journey_completed');
    expect(search.request.body.properties).toMatchObject({
      feature: 'catalog',
      action: 'search',
      result: 'no_matches',
      $ip: null,
    });
    expect(JSON.stringify(search.request.body)).not.toMatch(/itemId|silver|Fármaco|email/i);
    search.flush({ status: 1 });
    service.capture('item_detail_opened', { feature: 'catalog' });
    const detail = http.expectOne('https://eu.i.posthog.com/i/v0/e/');
    expect(detail.request.body.event).toBe('item_detail_opened');
    detail.flush({ status: 1 });
    service.capture('journey_failed', {
      feature: 'market',
      action: 'search',
      status: 'failed',
    });
    const failure = http.expectOne('https://eu.i.posthog.com/i/v0/e/');
    expect(failure.request.body).toMatchObject({
      event: 'journey_failed',
      properties: { feature: 'market', action: 'search', status: 'failed' },
    });
    failure.flush({ status: 1 });
    http.verify();
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
