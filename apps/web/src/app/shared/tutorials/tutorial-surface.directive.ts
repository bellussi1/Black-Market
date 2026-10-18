import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  PLATFORM_ID,
} from '@angular/core';
import type { TutorialPublicGuide, TutorialScreenKey } from '@bdo/shared';
import { type Subscription } from 'rxjs';

import { TutorialService } from '../../core/tutorial.service';
import { hasVisibleTutorialTarget } from '../../core/tutorial-anchor-resolver';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { TutorialOnboardingStateService } from '../../core/tutorial-onboarding-state.service';

export const TUTORIAL_TARGET_WAIT_MS = 4000;
export const TUTORIAL_TARGET_POLL_MS = 150;

@Directive({
  selector: '[appTutorialSurface]',
  standalone: true,
})
export class TutorialSurfaceDirective {
  readonly appTutorialSurface = input.required<TutorialScreenKey>();
  readonly ready = input(true, { alias: 'appTutorialSurfaceReady' });

  private readonly document = inject(DOCUMENT);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly api = inject(TutorialApiService);
  private readonly runtime = inject(TutorialService);
  private readonly onboardingState = inject(TutorialOnboardingStateService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  private targetWait?: ReturnType<typeof setInterval>;
  private targetTimeout?: ReturnType<typeof setTimeout>;
  private targetObserver?: MutationObserver;
  private generation = 0;

  constructor() {
    effect(() => {
      this.activate(this.appTutorialSurface(), this.ready());
    });
    this.destroyRef.onDestroy(() => this.cancel());
  }

  private activate(screenKey: TutorialScreenKey, ready: boolean): void {
    const generation = ++this.generation;
    this.request?.unsubscribe();
    this.request = undefined;
    this.stopWaitingForTarget();
    this.runtime.destroyTour('navigation');

    if (!this.browser || !ready) return;

    try {
      this.request = this.api.getPublished(screenKey).subscribe({
        next: ({ guide }) => {
          if (generation !== this.generation || !guide) return;
          if (this.onboardingState.hasSeen(screenKey, guide.updatedAt)) return;
          this.waitForTarget(screenKey, guide, generation);
        },
        error: () => {
          // Onboarding is optional and must not add a page-level error state.
        },
      });
    } catch {
      // An unavailable tutorial must never block the underlying screen.
    }
  }

  private waitForTarget(
    screenKey: TutorialScreenKey,
    guide: TutorialPublicGuide,
    generation: number,
  ): void {
    const tryStart = () => {
      if (generation !== this.generation) return true;
      if (!hasVisibleTutorialTarget(this.document, screenKey, guide.steps)) return false;

      this.stopWaitingForTarget();
      void this.runtime.startTour(guide, this.host.nativeElement).catch(() => {
        // Keep the screen usable if the optional Driver.js chunk cannot load.
      });
      return true;
    };

    if (tryStart()) return;

    const Observer = this.document.defaultView?.MutationObserver;
    if (Observer && this.document.body) {
      this.targetObserver = new Observer(() => {
        tryStart();
      });
      this.targetObserver.observe(this.document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['aria-hidden', 'class', 'data-tour', 'hidden', 'style'],
      });
    }
    this.targetWait = setInterval(tryStart, TUTORIAL_TARGET_POLL_MS);
    this.targetTimeout = setTimeout(() => this.stopWaitingForTarget(), TUTORIAL_TARGET_WAIT_MS);
  }

  private stopWaitingForTarget(): void {
    if (this.targetWait) clearInterval(this.targetWait);
    if (this.targetTimeout) clearTimeout(this.targetTimeout);
    this.targetWait = undefined;
    this.targetTimeout = undefined;
    this.targetObserver?.disconnect();
    this.targetObserver = undefined;
  }

  private cancel(): void {
    ++this.generation;
    this.request?.unsubscribe();
    this.request = undefined;
    this.stopWaitingForTarget();
    this.runtime.destroyTour('navigation');
  }
}
