import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMemoryStorage } from '../testing/test-setup';
import {
  PRIVACY_COOKIE,
  PRIVACY_KEY,
  PrivacyService,
  validPrivacyChoices,
} from './privacy.service';

function cookieValue(name: string): string | null {
  const value = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(name + '='))
    ?.slice(name.length + 1);
  return value === undefined ? null : decodeURIComponent(value);
}

describe('privacy preference persistence and expiration', () => {
  useMemoryStorage();
  afterEach(() => vi.useRealTimers());

  it('accepts only a fresh, exact versioned choice', () => {
    const now = Date.now();
    const current = { version: 1, analytics: false, updatedAt: new Date(now).toISOString() };
    expect(validPrivacyChoices(current, now)).toEqual(current);
    expect(validPrivacyChoices({ ...current, analytics: 'yes' }, now)).toBeNull();
    expect(validPrivacyChoices({ ...current, extra: 'undeclared-category' }, now)).toBeNull();
    expect(validPrivacyChoices({ ...current, updatedAt: '2026-02-31' }, now)).toBeNull();
    expect(validPrivacyChoices(current, now + 180 * 86400000)).toBeNull();
    expect(
      validPrivacyChoices({ ...current, updatedAt: new Date(now + 1000).toISOString() }, now),
    ).toBeNull();
  });

  it('persists a choice in a first-party cookie and removes the legacy preference', () => {
    const privacy = TestBed.inject(PrivacyService);
    privacy.save(false);
    expect(JSON.parse(cookieValue(PRIVACY_COOKIE)!)).toMatchObject({
      version: 1,
      analytics: false,
    });
    expect(localStorage.getItem(PRIVACY_KEY)).toBeNull();
    expect(privacy.choices()?.analytics).toBe(false);
    document.cookie = `${PRIVACY_COOKIE}=${encodeURIComponent(
      JSON.stringify({
        version: 1,
        analytics: true,
        updatedAt: new Date().toISOString(),
      }),
    )}; Path=/; SameSite=Lax`;
    window.dispatchEvent(new Event('focus'));
    expect(privacy.allowsAnalytics()).toBe(true);
  });

  it('clears preference when another tab removes its cookie', () => {
    const privacy = TestBed.inject(PrivacyService);
    privacy.save(true);
    document.cookie = `${PRIVACY_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`;
    window.dispatchEvent(new Event('focus'));
    expect(privacy.choices()).toBeNull();
    expect(privacy.allowsAnalytics()).toBe(false);
  });

  it('shows a clear warning and keeps the decision only in memory when cookies are blocked', () => {
    const privacy = TestBed.inject(PrivacyService);
    vi.spyOn(document, 'cookie', 'get').mockReturnValue('');
    vi.spyOn(document, 'cookie', 'set').mockImplementation(() => {});
    privacy.save(true);
    expect(privacy.allowsAnalytics()).toBe(true);
    expect(privacy.storageWarning()).toContain('em um cookie');
  });
});
