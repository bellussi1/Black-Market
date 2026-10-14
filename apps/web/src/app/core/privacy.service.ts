import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { Subject } from 'rxjs';

export interface PrivacyChoices {
  version: 1;
  analytics: boolean;
  updatedAt: string;
}

/** Legacy key kept only to migrate and remove the previous localStorage preference. */
export const PRIVACY_KEY = 'black-market.privacy.v1';
export const ANALYTICS_ID_KEY = 'black-market.analytics.v1';
export const PRIVACY_COOKIE = 'black-market-privacy';
export const ANALYTICS_ID_COOKIE = 'black-market-analytics-id';
export const PRIVACY_LIFETIME = 180 * 86400000;

const ANALYTICS_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVACY_CHANNEL = 'black-market-privacy';

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

function readCookie(document: Document, name: string): string | null {
  const prefix = `${name}=`;
  const value = (document.cookie ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (value === undefined) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function writeCookie(document: Document, name: string, value: string, maxAge: number): boolean {
  try {
    const secure = document.location?.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
    return readCookie(document, name) === value;
  } catch {
    return false;
  }
}

function removeCookie(document: Document, name: string): void {
  try {
    const secure = document.location?.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
  } catch {
    /* Cookie access can be disabled by the browser. */
  }
}

@Injectable({ providedIn: 'root' })
export class PrivacyService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly state = signal<PrivacyChoices | null>(null);
  private readonly changed = new Subject<PrivacyChoices | null>();
  private channel: BroadcastChannel | null = null;
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
      const refresh = () => {
        if (this.sessionOnly) this.update(validPrivacyChoices(this.state()));
        else this.load();
      };
      const visible = () => {
        if (this.document.visibilityState === 'visible') refresh();
      };
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(PRIVACY_CHANNEL);
        this.channel.addEventListener('message', refresh);
      }
      window.addEventListener('focus', refresh);
      this.document.addEventListener('visibilitychange', visible);
      destroy.onDestroy(() => {
        this.channel?.close();
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
      const cookieChoice = readCookie(this.document, PRIVACY_COOKIE);
      choice = cookieChoice ? validPrivacyChoices(JSON.parse(cookieChoice)) : null;
      if (choice) {
        this.removeLegacyPreference();
        this.sessionOnly = false;
        this.update(choice);
        return;
      }

      removeCookie(this.document, PRIVACY_COOKIE);
      const legacy = validPrivacyChoices(JSON.parse(localStorage.getItem(PRIVACY_KEY) ?? 'null'));
      this.removeLegacyPreference();
      if (
        legacy &&
        writeCookie(
          this.document,
          PRIVACY_COOKIE,
          JSON.stringify(legacy),
          Math.floor(this.remaining(legacy) / 1000),
        )
      ) {
        this.sessionOnly = false;
        this.update(legacy);
        return;
      }
    } catch {
      /* Fail closed when a saved choice cannot be read or persisted. */
      this.removeLegacyPreference();
    }
    this.sessionOnly = false;
    this.update(null);
  }

  private removeLegacyPreference() {
    try {
      localStorage.removeItem(PRIVACY_KEY);
    } catch {
      /* Legacy storage may be blocked; it is never used to enable analytics. */
    }
  }

  private remaining(choice: PrivacyChoices): number {
    return Math.max(0, Date.parse(choice.updatedAt) + PRIVACY_LIFETIME - Date.now());
  }

  private update(choice: PrivacyChoices | null) {
    clearTimeout(this.timer);
    this.state.set(choice);
    if (!choice) removeCookie(this.document, PRIVACY_COOKIE);
    if (choice?.analytics !== true) this.clearAnalyticsIdentifier();
    // Consumers cancel optional requests synchronously, without waiting for an Angular effect.
    this.changed.next(choice);
    if (choice && this.browser) {
      const remaining = this.remaining(choice);
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
      this.sessionOnly = !writeCookie(
        this.document,
        PRIVACY_COOKIE,
        JSON.stringify(value),
        PRIVACY_LIFETIME / 1000,
      );
      this.removeLegacyPreference();
      if (this.sessionOnly) {
        this.storageWarning.set(
          'Não foi possível guardar sua escolha em um cookie. Ela vale enquanto esta página estiver aberta.',
        );
      }
    }
    this.update(value);
    this.channel?.postMessage('preferences-changed');
    // Keep the panel open to explain a session-only choice when browser storage is blocked.
    this.open.set(this.storageWarning() !== null);
  }

  ensureAnalyticsIdentifier(): string | null {
    if (!this.browser || !this.allowsAnalytics()) return null;
    const existing = readCookie(this.document, ANALYTICS_ID_COOKIE);
    if (existing && ANALYTICS_ID_PATTERN.test(existing)) return existing;
    removeCookie(this.document, ANALYTICS_ID_COOKIE);

    let identifier: string | null = null;
    try {
      const legacy = localStorage.getItem(ANALYTICS_ID_KEY) ?? '';
      if (ANALYTICS_ID_PATTERN.test(legacy)) identifier = legacy;
      localStorage.removeItem(ANALYTICS_ID_KEY);
    } catch {
      /* Continue with a new in-memory ID if legacy storage is blocked. */
    }
    identifier ??= crypto.randomUUID();
    const choice = this.state();
    const maxAge = choice ? Math.floor(this.remaining(choice) / 1000) : 0;
    if (maxAge > 0) writeCookie(this.document, ANALYTICS_ID_COOKIE, identifier, maxAge);
    return identifier;
  }

  clearAnalyticsIdentifier() {
    if (this.browser) {
      removeCookie(this.document, ANALYTICS_ID_COOKIE);
      try {
        localStorage.removeItem(ANALYTICS_ID_KEY);
      } catch {
        /* The old localStorage identifier is not read without explicit consent. */
      }
    }
  }

  allowsAnalytics() {
    return validPrivacyChoices(this.state())?.analytics === true;
  }

  needsChoice() {
    return this.optionalAvailable() && !validPrivacyChoices(this.state());
  }
}
