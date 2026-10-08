import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
export interface PrivacyChoices {
  version: 1;
  analytics: boolean;
  updatedAt: string;
}
const KEY = 'black-market.privacy.v1';
@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly choices = signal<PrivacyChoices | null>(null);
  readonly open = signal(false);
  readonly optionalAvailable = signal(false);
  constructor() {
    const destroy = inject(DestroyRef);
    if (this.browser) {
      this.load();
      const listener = (event: StorageEvent) => {
        if (event.key === KEY) this.load();
      };
      window.addEventListener('storage', listener);
      destroy.onDestroy(() => window.removeEventListener('storage', listener));
    }
  }
  private load() {
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as unknown;
      this.choices.set(null);
      if (
        raw &&
        typeof raw === 'object' &&
        'version' in raw &&
        raw.version === 1 &&
        'analytics' in raw &&
        typeof raw.analytics === 'boolean' &&
        'updatedAt' in raw &&
        typeof raw.updatedAt === 'string'
      ) {
        const age = Date.now() - Date.parse(raw.updatedAt);
        if (age >= 0 && age < 180 * 86400000)
          this.choices.set({ version: 1, analytics: raw.analytics, updatedAt: raw.updatedAt });
      }
    } catch {
      this.choices.set(null);
    }
  }
  save(analytics: boolean) {
    const value: PrivacyChoices = { version: 1, analytics, updatedAt: new Date().toISOString() };
    this.choices.set(value);
    this.open.set(false);
    if (this.browser) {
      try {
        localStorage.setItem(KEY, JSON.stringify(value));
      } catch {
        /* Session choice still applies. */
      }
    }
  }
  allowsAnalytics() {
    return this.choices()?.analytics === true;
  }
  needsChoice() {
    return this.optionalAvailable() && !this.choices();
  }
}
