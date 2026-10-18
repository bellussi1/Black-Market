import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { TUTORIAL_SCREEN_REGISTRY, type TutorialScreenKey } from '@bdo/shared';

export type TutorialSeenStatus = 'completed' | 'dismissed';

export const TUTORIAL_ONBOARDING_STORAGE_KEY = 'bm_tutorial_onboarding_progress_v1';

type TutorialProgress = Record<string, TutorialSeenStatus>;

const REGISTERED_SCREEN_KEYS = new Set(TUTORIAL_SCREEN_REGISTRY.map((screen) => screen.screenKey));

@Injectable({ providedIn: 'root' })
export class TutorialOnboardingStateService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly progress: TutorialProgress = {};
  private hydrated = false;

  hasSeen(screenKey: TutorialScreenKey, guideRevision: string): boolean {
    this.hydrate();
    return this.storageKey(screenKey, guideRevision) in this.progress;
  }

  markSeen(screenKey: TutorialScreenKey, guideRevision: string, status: TutorialSeenStatus): void {
    this.hydrate();
    const key = this.storageKey(screenKey, guideRevision);
    this.progress[key] = status;
    this.persist();
  }

  resetAll(): void {
    this.hydrated = true;
    for (const key of Object.keys(this.progress)) delete this.progress[key];
    if (!this.browser) return;
    try {
      globalThis.localStorage.removeItem(TUTORIAL_ONBOARDING_STORAGE_KEY);
    } catch {
      // The in-memory reset still applies for this application session.
    }
  }

  private hydrate(): void {
    if (this.hydrated) return;
    this.hydrated = true;
    if (!this.browser) return;

    try {
      const serialized = globalThis.localStorage.getItem(TUTORIAL_ONBOARDING_STORAGE_KEY);
      if (!serialized) return;
      const parsed: unknown = JSON.parse(serialized);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return;

      for (const [key, status] of Object.entries(parsed)) {
        if (
          (status === 'completed' || status === 'dismissed') &&
          this.isRegisteredProgressKey(key)
        ) {
          this.progress[key] = status;
        }
      }
    } catch {
      // Storage can be blocked or contain invalid data; onboarding stays optional.
    }
  }

  private persist(): void {
    if (!this.browser) return;
    try {
      globalThis.localStorage.setItem(
        TUTORIAL_ONBOARDING_STORAGE_KEY,
        JSON.stringify(this.progress),
      );
    } catch {
      // The in-memory map prevents repeat tours for this application session.
    }
  }

  private storageKey(screenKey: TutorialScreenKey, guideRevision: string): string {
    return JSON.stringify([screenKey, guideRevision]);
  }

  private isRegisteredProgressKey(key: string): boolean {
    try {
      const parsed: unknown = JSON.parse(key);
      return (
        Array.isArray(parsed) &&
        parsed.length === 2 &&
        typeof parsed[0] === 'string' &&
        REGISTERED_SCREEN_KEYS.has(parsed[0] as TutorialScreenKey) &&
        typeof parsed[1] === 'string' &&
        parsed[1].length > 0 &&
        parsed[1].length <= 160
      );
    } catch {
      return false;
    }
  }
}
