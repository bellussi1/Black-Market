import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, InjectionToken, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';
import type { TutorialPublicGuide } from '@bdo/shared';
import type { Config, Driver, PopoverDOM } from 'driver.js';

import { AnalyticsService } from './analytics.service';
import {
  findUniqueVisibleTourTarget,
  type ResolvedTutorialStep,
  resolveTutorialSteps,
} from './tutorial-anchor-resolver';

export const ANCHOR_RECHECK_DELAY_MS = 150;
export const TUTORIAL_DRIVER_LOADER = new InjectionToken<
  () => Promise<{ driver: (options?: Config) => Driver }>
>('Tutorial driver loader', { providedIn: 'root', factory: () => () => import('driver.js') });
type EndReason = 'completed' | 'dismissed' | 'navigation';

@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly loader = inject(TUTORIAL_DRIVER_LOADER);
  private readonly analytics = inject(AnalyticsService);
  private readonly destroyRef = inject(DestroyRef);
  private driver: Driver | null = null;
  private launcher: HTMLButtonElement | null = null;
  private guide: TutorialPublicGuide | null = null;
  private steps: ResolvedTutorialStep[] = [];
  private generation = 0;
  private moving = false;
  private popover: HTMLElement | null = null;
  private readonly keydown = (event: KeyboardEvent) => {
    if (!this.driver) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.destroyTour('dismissed');
      return;
    }
    if (event.key !== 'Tab' || !this.popover?.contains(event.target as Node)) return;
    const buttons = Array.from(this.popover.querySelectorAll<HTMLButtonElement>('button')).filter(
      (button) => !button.disabled && button.style.display !== 'none',
    );
    const at = buttons.indexOf(this.document.activeElement as HTMLButtonElement);
    const next = event.shiftKey
      ? at <= 0
        ? buttons.length - 1
        : at - 1
      : (at + 1) % buttons.length;
    event.preventDefault();
    event.stopPropagation();
    buttons[next]?.focus();
  };
  constructor() {
    inject(Router)
      .events.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (event instanceof NavigationStart) this.destroyTour('navigation');
      });
    this.destroyRef.onDestroy(() => this.destroyTour('navigation'));
  }
  async startTour(guide: TutorialPublicGuide, launcher: HTMLButtonElement): Promise<string> {
    if (!this.browser) return '';
    this.destroyTour('navigation');
    const generation = this.generation;
    const resolved = resolveTutorialSteps(this.document, guide.screenKey, guide.steps);
    if (!resolved.steps.length)
      return $localize`Este tutorial precisa de atualização. Nenhuma etapa está disponível nesta tela.`;
    const { driver } = await this.loader();
    if (generation !== this.generation || !launcher.isConnected) return '';
    this.guide = guide;
    this.launcher = launcher;
    this.steps = resolved.steps;
    const reduced =
      this.document.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const config: Config = {
      steps: this.steps.map((step) => ({
        ...(step.element ? { element: step.element } : {}),
        popover: {},
      })),
      popoverClass: 'bm-tutorial-popover',
      animate: !reduced,
      smoothScroll: !reduced,
      allowClose: true,
      allowScroll: true,
      overlayClickBehavior: 'none',
      allowKeyboardControl: false,
      disableActiveInteraction: false,
      advanceOnClick: false,
      stageRadius: 2,
      showProgress: true,
      progressText: $localize`{{current}} de {{total}}`,
      nextBtnText: $localize`Próximo`,
      prevBtnText: $localize`Anterior`,
      doneBtnText: $localize`Concluir`,
      closeBtnLabel: $localize`Sair do tutorial`,
      onPopoverRender: (popover, options) => this.render(popover, options.index ?? 0),
      onNextClick: () => {
        void this.move(1);
      },
      onPrevClick: () => {
        void this.move(-1);
      },
      onDoneClick: () => this.destroyTour('completed'),
      onCloseClick: () => this.destroyTour('dismissed'),
      onDestroyed: () => {
        if (this.driver) this.destroyTour('dismissed');
      },
    };
    this.driver = driver(config);
    this.document.addEventListener('keydown', this.keydown, true);
    this.analytics.captureTutorial('tutorial_started', guide.screenKey, guide.updatedAt);
    this.driver.drive(0);
    return resolved.omittedCount
      ? $localize`Algumas etapas não estão disponíveis no estado atual desta tela.`
      : '';
  }
  destroyTour(reason: EndReason): void {
    ++this.generation;
    const driver = this.driver,
      guide = this.guide,
      launcher = this.launcher;
    this.driver = null;
    this.guide = null;
    this.launcher = null;
    this.steps = [];
    this.popover = null;
    this.moving = false;
    if (this.browser) this.document.removeEventListener('keydown', this.keydown, true);
    driver?.destroy();
    if (guide && reason !== 'navigation')
      this.analytics.captureTutorial(
        reason === 'completed' ? 'tutorial_completed' : 'tutorial_dismissed',
        guide.screenKey,
        guide.updatedAt,
      );
    if (launcher?.isConnected) launcher.focus();
  }
  private render(popover: PopoverDOM, index: number): void {
    const step = this.steps[index];
    if (!step) return;
    popover.title.textContent = step.title;
    popover.title.style.display = 'block';
    popover.description.textContent = step.body;
    popover.description.style.display = 'block';
    popover.progress.id = 'bm-tutorial-progress';
    popover.progress.textContent = $localize`${index + 1} de ${this.steps.length}`;
    popover.wrapper.setAttribute(
      'aria-describedby',
      'driver-popover-description bm-tutorial-progress',
    );
    popover.wrapper.tabIndex = -1;
    this.popover = popover.wrapper;
    queueMicrotask(() => {
      if (this.popover === popover.wrapper && this.driver) popover.wrapper.focus();
    });
  }
  private async move(direction: 1 | -1): Promise<void> {
    if (!this.driver || !this.guide || this.moving) return;
    this.moving = true;
    const generation = this.generation;
    let index = (this.driver.getActiveIndex() ?? 0) + direction;
    while (index >= 0 && index < this.steps.length) {
      const step = this.steps[index];
      if (
        step.anchorKey === null ||
        findUniqueVisibleTourTarget(this.document, this.guide.screenKey, step.anchorKey) ===
          step.element
      )
        break;
      await new Promise((resolve) => setTimeout(resolve, ANCHOR_RECHECK_DELAY_MS));
      if (generation !== this.generation || !this.guide) return;
      if (
        findUniqueVisibleTourTarget(this.document, this.guide.screenKey, step.anchorKey) ===
        step.element
      )
        break;
      index += direction;
    }
    if (generation !== this.generation) return;
    this.moving = false;
    if (index >= this.steps.length) this.destroyTour('completed');
    else if (index >= 0) this.driver?.moveTo(index);
  }
}
