import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TutorialOnboardingStateService } from './tutorial-onboarding-state.service';

describe('TutorialOnboardingStateService', () => {
  let values: Map<string, string>;
  let service: TutorialOnboardingStateService;

  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    service = TestBed.inject(TutorialOnboardingStateService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('starts unseen surface and suppresses completed or dismissed revision', () => {
    expect(service.hasSeen('market', 'revision-1')).toBe(false);
    service.markSeen('market', 'revision-1', 'completed');
    service.markSeen('recipes', 'revision-1', 'dismissed');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    service = TestBed.inject(TutorialOnboardingStateService);

    expect(service.hasSeen('market', 'revision-1')).toBe(true);
    expect(service.hasSeen('recipes', 'revision-1')).toBe(true);
  });

  it('allows a new published revision to start once', () => {
    service.markSeen('market', 'revision-1', 'completed');

    expect(service.hasSeen('market', 'revision-2')).toBe(false);
  });

  it('resetAll clears only tutorial progress', () => {
    localStorage.setItem('black-market-privacy', 'necessary');
    service.markSeen('market', 'revision-1', 'dismissed');

    service.resetAll();

    expect(service.hasSeen('market', 'revision-1')).toBe(false);
    expect(localStorage.getItem('black-market-privacy')).toBe('necessary');
  });

  it('uses in-memory progress when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
      removeItem: () => {
        throw new Error('blocked');
      },
    });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    service = TestBed.inject(TutorialOnboardingStateService);

    service.markSeen('storage', 'revision-1', 'completed');

    expect(service.hasSeen('storage', 'revision-1')).toBe(true);
  });

  it('does not access browser storage during server rendering', () => {
    const getItem = vi.fn(() => {
      throw new Error('browser storage must not be read on the server');
    });
    const setItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem, setItem });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    service = TestBed.inject(TutorialOnboardingStateService);

    expect(service.hasSeen('settings', 'revision-1')).toBe(false);
    service.markSeen('settings', 'revision-1', 'dismissed');
    expect(service.hasSeen('settings', 'revision-1')).toBe(true);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
});
