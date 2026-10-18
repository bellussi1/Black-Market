import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

import { AUTH_RETURN_URL_KEY, safeInternalReturnUrl } from './auth-return-url';

/** Navigation intent only: no identity, router, dialog or settings dependency. */
@Injectable({ providedIn: 'root' })
export class LoginIntentService {
  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  readonly opened = signal(false);
  readonly returnUrl = signal<string | null>(null);
  private trigger: HTMLElement | null = null;

  request(destination: string): void {
    this.trigger = this.browser ? (this.document.activeElement as HTMLElement | null) : null;
    this.restore(destination);
    this.opened.set(true);
  }

  restore(requested: string | null): void {
    let destination = safeInternalReturnUrl(requested);
    try {
      const storage = this.browser ? this.document.defaultView?.sessionStorage : undefined;
      if (requested === null)
        destination = safeInternalReturnUrl(storage?.getItem(AUTH_RETURN_URL_KEY) ?? null);
      if (destination) storage?.setItem(AUTH_RETURN_URL_KEY, destination);
      else storage?.removeItem(AUTH_RETURN_URL_KEY);
    } catch {
      /* Keep the validated in-memory intent when storage is unavailable. */
    }
    this.returnUrl.set(destination);
  }

  clear(): void {
    this.returnUrl.set(null);
    try {
      if (this.browser) this.document.defaultView?.sessionStorage.removeItem(AUTH_RETURN_URL_KEY);
    } catch {
      /* Private browsing. */
    }
  }

  close(): void {
    this.opened.set(false);
    this.clear();
    const trigger = this.trigger;
    this.trigger = null;
    if (trigger?.isConnected) trigger.focus({ preventScroll: true });
  }
}
