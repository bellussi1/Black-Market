import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface PrivacyChoices {
  version: 1;
  analytics: boolean;
  updatedAt: string;
}
export const PRIVACY_KEY = 'black-market.privacy.v1';
export const PRIVACY_LIFETIME = 180 * 86400000;
export function validPrivacyChoices(raw: unknown, now = Date.now()): PrivacyChoices | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (
    Object.keys(value).length !== 3 ||
    value['version'] !== 1 ||
    typeof value['analytics'] !== 'boolean' ||
    typeof value['updatedAt'] !== 'string'
  )
    return null;
  const timestamp = Date.parse(value['updatedAt']);
  const age = now - timestamp;
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString() !== value['updatedAt'] ||
    age < 0 ||
    age >= PRIVACY_LIFETIME
  )
    return null;
  return { version: 1, analytics: value['analytics'], updatedAt: value['updatedAt'] };
}

@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<PrivacyChoices | null>(null);
  private readonly changed = new Subject<PrivacyChoices | null>();
  readonly changes = this.changed.asObservable();
  readonly choices = this.state.asReadonly();
  readonly open = signal(false);
  readonly optionalAvailable = signal(false);
  readonly storageWarning = signal<string | null>(null);
  private sessionOnly = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const destroy = inject(DestroyRef);
    if (this.browser) {
      this.load();
      const storage = (event: StorageEvent) => {
        if (event.key === PRIVACY_KEY || event.key === null) {
          this.sessionOnly = false;
          this.load();
        }
      };
      const refresh = () => {
        if (this.sessionOnly) this.update(validPrivacyChoices(this.state()));
        else this.load();
      };
      const visible = () => {
        if (this.document.visibilityState === 'visible') refresh();
      };
      window.addEventListener('storage', storage);
      window.addEventListener('focus', refresh);
      this.document.addEventListener('visibilitychange', visible);
      destroy.onDestroy(() => {
        window.removeEventListener('storage', storage);
        window.removeEventListener('focus', refresh);
        this.document.removeEventListener('visibilitychange', visible);
        clearTimeout(this.timer);
        this.changed.complete();
      });
    }
  }
  private load() {
    let choice: PrivacyChoices | null = null;
    try {
      choice = validPrivacyChoices(JSON.parse(localStorage.getItem(PRIVACY_KEY) ?? 'null'));
    } catch {
      /* Fail closed when a saved choice cannot be read. */
    }
    this.update(choice);
  }
  private update(choice: PrivacyChoices | null) {
    clearTimeout(this.timer);
    this.state.set(choice);
    // Consumers cancel optional requests synchronously, without waiting for an Angular effect.
    this.changed.next(choice);
    if (choice && this.browser) {
      const remaining = Date.parse(choice.updatedAt) + PRIVACY_LIFETIME - Date.now();
      this.timer = setTimeout(
        () => this.update(validPrivacyChoices(this.state())),
        Math.min(86400000, Math.max(0, remaining)),
      );
    }
  }
  save(analytics: boolean) {
    const value: PrivacyChoices = { version: 1, analytics, updatedAt: new Date().toISOString() };
    this.storageWarning.set(null);
    if (this.browser) {
      try {
        localStorage.setItem(PRIVACY_KEY, JSON.stringify(value));
        this.sessionOnly = false;
      } catch {
        this.sessionOnly = true;
        this.storageWarning.set(
          'Não foi possível guardar sua escolha. Ela vale enquanto esta página estiver aberta.',
        );
      }
    }
    this.update(value);
    // Keep the panel open to explain a session-only choice when browser storage is blocked.
    this.open.set(this.storageWarning() !== null);
  }
  allowsAnalytics() {
    return validPrivacyChoices(this.state())?.analytics === true;
  }
  needsChoice() {
    return this.optionalAvailable() && !validPrivacyChoices(this.state());
  }
}
