import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { RegionPreferences } from './region-preferences';
import { useMemoryStorage } from '../testing/test-setup';

describe('RegionPreferences', () => {
  useMemoryStorage();

  it('restores a supported saved region', () => {
    localStorage.setItem('black-market.region', 'eu');
    expect(TestBed.inject(RegionPreferences).region()).toBe('eu');
  });

  it('ignores invalid regions and notifies only subscribed listeners', () => {
    const preferences = TestBed.inject(RegionPreferences);
    const listener = vi.fn();
    const unsubscribe = preferences.onRegionChange(listener);
    preferences.setRegion('invalid');
    expect(preferences.region()).toBe('sa');
    preferences.setRegion('na');
    expect(listener).toHaveBeenCalledWith('na');
    expect(localStorage.getItem('black-market.region')).toBe('na');
    unsubscribe();
    preferences.setRegion('eu');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('preserves the current region while recovery blocks changes', () => {
    const preferences = TestBed.inject(RegionPreferences);
    preferences.blocked.set(true);
    preferences.setRegion('eu');
    expect(preferences.region()).toBe('sa');
    expect(localStorage.getItem('black-market.region')).toBeNull();
  });
});
