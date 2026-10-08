import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMemoryStorage } from '../testing/test-setup';
import { PRIVACY_KEY, PrivacyService, validPrivacyChoices } from './privacy.service';

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

  it('persists a choice and restores it when preferences refresh in the same browser session', () => {
    const privacy = TestBed.inject(PrivacyService);
    privacy.save(false);
    expect(JSON.parse(localStorage.getItem(PRIVACY_KEY)!)).toMatchObject({
      version: 1,
      analytics: false,
    });
    expect(privacy.choices()?.analytics).toBe(false);
    localStorage.setItem(
      PRIVACY_KEY,
      JSON.stringify({
        version: 1,
        analytics: true,
        updatedAt: new Date().toISOString(),
      }),
    );
    window.dispatchEvent(new StorageEvent('storage', { key: PRIVACY_KEY }));
    expect(privacy.allowsAnalytics()).toBe(true);
  });

  it('clears preference after localStorage.clear in another tab', () => {
    const privacy = TestBed.inject(PrivacyService);
    privacy.save(true);
    localStorage.removeItem(PRIVACY_KEY);
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(privacy.choices()).toBeNull();
    expect(privacy.allowsAnalytics()).toBe(false);
  });

  it('shows a clear warning and keeps the decision only in memory when persistence is blocked', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
      removeItem: () => {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
    const privacy = TestBed.inject(PrivacyService);
    privacy.save(true);
    expect(privacy.allowsAnalytics()).toBe(true);
    expect(privacy.storageWarning()).toContain('enquanto esta página estiver aberta');
  });
});
