import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import type { EnvironmentProviders, Provider, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, vi } from 'vitest';

/** Install fresh storage per test without sharing state between suites. */
export function useMemoryStorage(): void {
  beforeEach(() => {
    document.cookie = 'black-market-region=; Max-Age=0; path=/';
    const values = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
}

/** Render real Angular templates; HTTP requests remain controlled by each test. */
export async function renderComponent<T>(
  component: Type<T>,
  inputs: Record<string, unknown> = {},
  providers: (Provider | EnvironmentProviders)[] = [],
) {
  await TestBed.configureTestingModule({
    imports: [component],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), ...providers],
  }).compileComponents();
  const fixture = TestBed.createComponent(component);
  for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}
