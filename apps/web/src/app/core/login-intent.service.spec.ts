import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';

import { AUTH_RETURN_URL_KEY } from './auth-return-url';
import { LoginIntentService } from './login-intent.service';

describe('LoginIntentService', () => {
  afterEach(() => {
    sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
    TestBed.resetTestingModule();
  });

  it('preserves the safe destination, then clears it and restores focus on cancellation', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const focus = vi.spyOn(trigger, 'focus');
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    const service = TestBed.inject(LoginIntentService);
    service.request('/plans?tab=active#first');
    expect(service.opened()).toBe(true);
    expect(service.returnUrl()).toBe('/plans?tab=active#first');
    expect(sessionStorage.getItem(AUTH_RETURN_URL_KEY)).toBe('/plans?tab=active#first');
    service.close();
    expect(service.opened()).toBe(false);
    expect(service.returnUrl()).toBeNull();
    expect(sessionStorage.getItem(AUTH_RETURN_URL_KEY)).toBeNull();
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    trigger.remove();
  });

  it('never persists an external destination', () => {
    const service = TestBed.inject(LoginIntentService);
    service.request('//attacker.example/plans');
    expect(service.returnUrl()).toBeNull();
  });

  it('keeps intent request-scoped without accessing browser storage during SSR', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const service = TestBed.inject(LoginIntentService);
    service.request('/storage');
    expect(service.returnUrl()).toBe('/storage');
    expect(sessionStorage.getItem(AUTH_RETURN_URL_KEY)).toBeNull();
  });
});
