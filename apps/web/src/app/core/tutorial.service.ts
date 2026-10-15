import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import type { TutorialPublicGuide, TutorialScreenKey } from '@bdo/shared';
import type { Driver, DriveStep, PopoverDOM } from 'driver.js';
import { filter } from 'rxjs';

import { AnalyticsService } from './analytics.service';
import { type ResolvedTutorialStep, resolveTutorialSteps } from './tutorial-anchor-resolver';

export const ANCHOR_RECHECK_DELAY_MS = 150;

export type TutorialCloseReason = 'completed' | 'dismissed' | 'navigation';
export type TutorialStartResult = 'started' | 'needs-update' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly document = inject(DOCUMENT);
  private readonly analytics = inject(AnalyticsService);
  private activeAnalytics: { screenKey: TutorialScreenKey; guideUpdatedAt: string } | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private activeDriver: Driver | null = null;
  private activeSteps: ResolvedTutorialStep[] = [];
  private activeScreenKey: TutorialScreenKey | null = null;
  private returnFocusTarget: HTMLButtonElement | null = null;
  private launchPending = false;
  private advancePending = false;
  private escapeListener: ((event: KeyboardEvent) => void) | null = null;
  private recheckTimer: ReturnType<typeof setTimeout> | null = null;
  private resolveRecheck: (() => void) | null = null;
  private navigationRevision = 0;

  constructor() {
    if (!this.browser) return;

    this.router.events
      .pipe(
        filter((event): event is NavigationStart => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => {
        this.navigationRevision++;
        this.destroyTour('navigation');
      });
  }

  async startTour(
    guide: TutorialPublicGuide,
    launcher: HTMLButtonElement,
  ): Promise<TutorialStartResult> {
    if (!this.browser || !launcher.isConnected) return 'unavailable';
    if (this.launchPending || this.activeDriver) return 'unavailable';

    this.launchPending = true;
    try {
      const resolution = resolveTutorialSteps(this.document, guide.screenKey, guide.steps);
      if (resolution.steps.length === 0) return 'needs-update';

      const navigationRevision = this.navigationRevision;
      // Keep Driver.js out of the initial client and server bundles until an explicit launch.
      const { driver } = await import('driver.js');
      if (
        !this.browser ||
        !launcher.isConnected ||
        navigationRevision !== this.navigationRevision
      ) {
        return 'unavailable';
      }

      const reducedMotion = this.document.defaultView?.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      this.activeSteps = resolution.steps;
      this.activeScreenKey = guide.screenKey;
      this.returnFocusTarget = launcher;
      this.advancePending = false;

      const instance = driver({
        steps: this.toDriverSteps(this.activeSteps),
        animate: !reducedMotion,
        smoothScroll: !reducedMotion,
        allowClose: true,
        allowScroll: true,
        allowKeyboardControl: false,
        overlayClickBehavior: 'none',
        disableActiveInteraction: true,
        showButtons: ['close', 'previous', 'next'],
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Avançar',
        prevBtnText: 'Voltar',
        doneBtnText: 'Concluir',
        closeBtnLabel: 'Sair do tutorial',
        popoverClass: 'bm-tutorial-popover',
        onPopoverRender: (popover, options) => {
          this.renderPopover(popover, options.state.activeIndex ?? 0);
        },
        onNextClick: (_element, _step, options) =>
          this.advance(options.driver, options.state.activeIndex ?? 0),
        onPrevClick: (_element, _step, options) => options.driver.movePrevious(),
        onCloseClick: () => this.destroyTour('dismissed'),
        onDoneClick: () => this.destroyTour('completed'),
      });

      this.activeDriver = instance;
      this.installEscapeListener();
      instance.drive(0);
      this.activeAnalytics = { screenKey: guide.screenKey, guideUpdatedAt: guide.updatedAt };
      this.analytics.captureTutorial('tutorial_started', guide.screenKey, guide.updatedAt);
      return 'started';
    } catch {
      this.destroyTour('dismissed');
      return 'unavailable';
    } finally {
      this.launchPending = false;
    }
  }

  destroyTour(reason: TutorialCloseReason): void {
    const instance = this.activeDriver;
    const analytics = this.activeAnalytics;
    this.activeAnalytics = null;
    const focusTarget = this.returnFocusTarget;
    this.activeDriver = null;
    this.activeSteps = [];
    this.activeScreenKey = null;
    this.returnFocusTarget = null;
    this.advancePending = false;

    if (this.recheckTimer !== null) {
      clearTimeout(this.recheckTimer);
      this.recheckTimer = null;
    }
    const resolveRecheck = this.resolveRecheck;
    this.resolveRecheck = null;
    this.removeEscapeListener();
    instance?.destroy();

    if (focusTarget?.isConnected) focusTarget.focus();
    resolveRecheck?.();
    if (analytics && reason !== 'navigation') {
      this.analytics.captureTutorial(
        reason === 'completed' ? 'tutorial_completed' : 'tutorial_dismissed',
        analytics.screenKey,
        analytics.guideUpdatedAt,
      );
    }
  }

  private toDriverSteps(steps: ResolvedTutorialStep[]): DriveStep[] {
    return steps.map((step) => ({ element: step.element ?? undefined }));
  }

  private renderPopover(popover: PopoverDOM, activeIndex: number): void {
    const step = this.activeSteps[activeIndex];
    if (!step) return;

    popover.title.textContent = step.title;
    popover.description.textContent = step.body;
    popover.title.style.display = 'block';
    popover.description.style.display = 'block';
    popover.progress.textContent = `${activeIndex + 1} de ${this.activeSteps.length}`;
    popover.progress.setAttribute('role', 'status');
    popover.progress.setAttribute('aria-live', 'polite');
    popover.wrapper.setAttribute('role', 'group');
    popover.wrapper.setAttribute('aria-label', 'Tutorial desta tela');
    popover.wrapper.setAttribute('aria-labelledby', 'bm-tutorial-title');
    popover.wrapper.setAttribute('aria-describedby', 'bm-tutorial-description');
    popover.wrapper.tabIndex = -1;
    popover.title.id = 'bm-tutorial-title';
    popover.description.id = 'bm-tutorial-description';
    popover.previousButton.textContent = 'Voltar';
    popover.nextButton.textContent =
      activeIndex === this.activeSteps.length - 1 ? 'Concluir' : 'Avançar';
    popover.closeButton.textContent = '×';
    popover.closeButton.setAttribute('aria-label', 'Sair do tutorial');
    popover.wrapper.focus({ preventScroll: true });
  }

  private async advance(instance: Driver, activeIndex: number): Promise<void> {
    if (this.advancePending) return;
    this.advancePending = true;
    try {
      const nextIndex = activeIndex + 1;
      while (nextIndex < this.activeSteps.length) {
        const candidate = this.activeSteps[nextIndex];
        if (!candidate) break;

        let refreshed = this.resolveCurrentStep(candidate);
        if (!refreshed) {
          await new Promise<void>((resolve) => {
            this.resolveRecheck = resolve;
            this.recheckTimer = setTimeout(() => {
              this.recheckTimer = null;
              this.resolveRecheck = null;
              resolve();
            }, ANCHOR_RECHECK_DELAY_MS);
          });
          if (this.activeDriver !== instance) return;
          refreshed = this.resolveCurrentStep(candidate);
        }

        if (!refreshed) {
          this.activeSteps.splice(nextIndex, 1);
          continue;
        }

        this.activeSteps[nextIndex] = refreshed;
        // Driver.js 1.10.1 setSteps() resets the active state and lifecycle listeners.
        instance.setConfig({
          ...instance.getConfig(),
          steps: this.toDriverSteps(this.activeSteps),
        });
        instance.moveNext();
        return;
      }

      this.destroyTour('completed');
    } finally {
      this.advancePending = false;
    }
  }

  private resolveCurrentStep(step: ResolvedTutorialStep): ResolvedTutorialStep | null {
    if (step.anchorKey === null) return step;
    const screenKey = this.activeScreenKey;
    if (!screenKey) return null;
    const resolved = resolveTutorialSteps(this.document, screenKey, [step]);
    return resolved.steps[0] ?? null;
  }

  private installEscapeListener(): void {
    this.removeEscapeListener();
    this.escapeListener = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.destroyTour('dismissed');
    };
    this.document.defaultView?.addEventListener('keydown', this.escapeListener, true);
  }

  private removeEscapeListener(): void {
    if (!this.escapeListener) return;
    this.document.defaultView?.removeEventListener('keydown', this.escapeListener, true);
    this.escapeListener = null;
  }
}
