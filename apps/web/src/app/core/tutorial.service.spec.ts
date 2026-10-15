import { DOCUMENT } from '@angular/common';
import { Component, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { TutorialPublicGuide } from '@bdo/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface TestPopover {
  title: HTMLElement;
  description: HTMLElement;
  progress: HTMLElement;
  previousButton: HTMLButtonElement;
  nextButton: HTMLButtonElement;
  closeButton: HTMLButtonElement;
  wrapper: HTMLElement;
}

interface TestDriverConfig {
  animate?: boolean;
  smoothScroll?: boolean;
  steps?: Array<{ element?: HTMLElement; popover?: Record<string, unknown> }>;
  onPopoverRender?: (popover: TestPopover, context: { state: { activeIndex?: number } }) => void;
  onDoneClick?: () => void;
  onCloseClick?: () => void;
  onNextClick?: (
    element: HTMLElement | undefined,
    step: unknown,
    context: { state: { activeIndex?: number }; driver: unknown },
  ) => void | Promise<void>;
}

interface TestDriverInstance {
  config: TestDriverConfig;
  state: { activeIndex: number | undefined; isInitialized: boolean; activeElement?: Element };
  drive: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
  moveNext: ReturnType<typeof vi.fn>;
  movePrevious: ReturnType<typeof vi.fn>;
  getConfig: ReturnType<typeof vi.fn>;
  setConfig: ReturnType<typeof vi.fn>;
  setSteps: ReturnType<typeof vi.fn>;
}

const driverMocks = vi.hoisted(() => ({
  factory: vi.fn(),
  instances: [] as TestDriverInstance[],
}));

vi.mock('driver.js', () => ({ driver: driverMocks.factory }));

import { AnalyticsService } from './analytics.service';
import { TutorialService } from './tutorial.service';

@Component({ template: '' })
class EmptyPage {}

const guide: TutorialPublicGuide = {
  screenKey: 'market',
  locale: 'pt-BR',
  updatedAt: '2026-10-15T15:00:00.000Z',
  steps: [
    { sortOrder: 0, anchorKey: 'market.search', title: 'Pesquisa', body: 'Digite um item.' },
    { sortOrder: 1, anchorKey: 'market.filters', title: 'Filtros', body: 'Refine a lista.' },
  ],
};

const threeStepGuide: TutorialPublicGuide = {
  ...guide,
  steps: [
    ...guide.steps,
    {
      sortOrder: 2,
      anchorKey: 'market.results',
      title: 'Resultados',
      body: 'Consulte os resultados.',
    },
  ],
};

function makeVisible(element: HTMLElement): void {
  element.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, right: 160, bottom: 44, left: 0, width: 160, height: 44 }) as DOMRect;
}

function mountTargets(document: Document): void {
  document.body.innerHTML = `
    <button data-tour="market.search">Buscar</button>
    <button data-tour="market.filters">Filtros</button>
    <button data-tour="market.results">Resultados</button>`;
  document.querySelectorAll<HTMLElement>('[data-tour]').forEach(makeVisible);
}

function makeLauncher(document: Document): HTMLButtonElement {
  const launcher = document.createElement('button');
  launcher.textContent = 'Tutorial desta tela';
  document.body.append(launcher);
  return launcher;
}

function makePopover(document: Document) {
  const title = document.createElement('h2');
  title.style.display = 'none';
  const description = document.createElement('p');
  description.style.display = 'none';
  const progress = document.createElement('span');
  const previousButton = document.createElement('button');
  const nextButton = document.createElement('button');
  const closeButton = document.createElement('button');
  const wrapper = document.createElement('div');
  wrapper.append(title, description, progress, previousButton, nextButton, closeButton);
  document.body.append(wrapper);
  return { title, description, progress, previousButton, nextButton, closeButton, wrapper };
}

function setUp(platformId = 'browser') {
  driverMocks.instances.length = 0;
  driverMocks.factory.mockReset();
  driverMocks.factory.mockImplementation((config: TestDriverConfig) => {
    const state: TestDriverInstance['state'] = {
      activeIndex: undefined,
      isInitialized: false,
    };
    const getConfig = vi.fn((): TestDriverConfig => config);
    const setConfig = vi.fn((updated: TestDriverConfig) => Object.assign(config, updated));
    const instance: TestDriverInstance = {
      config,
      state,
      drive: vi.fn((index: number) => {
        state.activeIndex = index;
        state.isInitialized = true;
        state.activeElement = config.steps?.[index]?.element;
        config.onPopoverRender?.(makePopover(TestBed.inject(DOCUMENT)), { state });
      }),
      destroy: vi.fn(),
      moveNext: vi.fn(() => {
        if (state.activeIndex === undefined) return;
        const nextIndex = state.activeIndex + 1;
        const nextStep = config.steps?.[nextIndex];
        if (!nextStep) {
          state.activeIndex = undefined;
          state.isInitialized = false;
          state.activeElement = undefined;
          return;
        }
        state.activeIndex = nextIndex;
        state.activeElement = nextStep.element;
      }),
      movePrevious: vi.fn(),
      getConfig,
      setConfig,
      // Driver.js 1.10.1 setSteps() calls resetState() before replacing steps.
      setSteps: vi.fn((steps: TestDriverConfig['steps']) => {
        state.activeIndex = undefined;
        state.isInitialized = false;
        state.activeElement = undefined;
        setConfig({ ...getConfig(), steps });
      }),
    };
    driverMocks.instances.push(instance);
    return instance;
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: '**', component: EmptyPage }]),
      { provide: AnalyticsService, useValue: { captureTutorial: vi.fn(() => true) } },
      { provide: PLATFORM_ID, useValue: platformId },
    ],
  });
  const service = TestBed.inject(TutorialService);
  const document = TestBed.inject(DOCUMENT);
  document.body.innerHTML = '';
  mountTargets(document);
  const launcher = makeLauncher(document);
  return { service, document, launcher, router: TestBed.inject(Router) };
}

async function flushMicrotasks(): Promise<void> {
  for (let index = 0; index < 8; index++) await Promise.resolve();
}

describe('TutorialService', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('emits exactly one start and one terminal event for completion or dismissal, never per step', async () => {
    const { service, launcher, router } = setUp();
    const capture = vi.mocked(TestBed.inject(AnalyticsService).captureTutorial);
    await service.startTour(guide, launcher);
    const first = driverMocks.instances[0]!;
    await first.config.onNextClick?.(undefined, undefined, {
      state: { activeIndex: 0 },
      driver: first,
    });
    expect(capture.mock.calls).toEqual([['tutorial_started', guide.screenKey, guide.updatedAt]]);
    first.config.onDoneClick?.();
    first.config.onCloseClick?.();
    service.destroyTour('completed');
    expect(capture.mock.calls).toEqual([
      ['tutorial_started', guide.screenKey, guide.updatedAt],
      ['tutorial_completed', guide.screenKey, guide.updatedAt],
    ]);
    await service.startTour(guide, launcher);
    driverMocks.instances[1]!.config.onCloseClick?.();
    service.destroyTour('dismissed');
    expect(capture.mock.calls.slice(2)).toEqual([
      ['tutorial_started', guide.screenKey, guide.updatedAt],
      ['tutorial_dismissed', guide.screenKey, guide.updatedAt],
    ]);
    await service.startTour(guide, launcher);
    await router.navigateByUrl('/recipes');
    service.destroyTour('dismissed');
    expect(capture.mock.calls.slice(4)).toEqual([
      ['tutorial_started', guide.screenKey, guide.updatedAt],
    ]);
  });

  it('does not emit tutorial events when driver initialization fails', async () => {
    const { service, launcher } = setUp();
    const capture = vi.mocked(TestBed.inject(AnalyticsService).captureTutorial);
    driverMocks.factory.mockImplementationOnce(() => {
      throw new Error('Driver unavailable');
    });
    await expect(service.startTour(guide, launcher)).resolves.toBe('unavailable');
    expect(capture).not.toHaveBeenCalled();
    driverMocks.factory.mockImplementationOnce(() => ({
      drive: () => {
        throw new Error('Cannot drive');
      },
      destroy: vi.fn(),
    }));
    await expect(service.startTour(guide, launcher)).resolves.toBe('unavailable');
    expect(capture).not.toHaveBeenCalled();
  });

  it('does not import or construct Driver before a browser click', async () => {
    const { service, launcher } = setUp();
    await flushMicrotasks();
    expect(driverMocks.factory).not.toHaveBeenCalled();

    await service.startTour(guide, launcher);

    expect(driverMocks.factory).toHaveBeenCalledTimes(1);
  });

  it('renders hostile title and body with textContent only', async () => {
    const hostileGuide: TutorialPublicGuide = {
      ...guide,
      steps: [
        {
          ...guide.steps[0]!,
          anchorKey: null,
          title: '<img src=x onerror=alert(1)>',
          body: '<svg onload=alert(2)>texto</svg>',
        },
      ],
    };
    const { service, launcher, document } = setUp();

    await service.startTour(hostileGuide, launcher);

    const instance = driverMocks.instances[0]!;
    const popover = document.querySelector<HTMLElement>('.driver-popover');
    const renderedPopover = document.querySelector<HTMLElement>('div:last-child');
    expect(instance.config.steps?.[0]?.popover?.['title']).toBeUndefined();
    expect(instance.config.steps?.[0]?.popover?.['description']).toBeUndefined();
    expect(renderedPopover?.querySelector('h2')?.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(renderedPopover?.querySelector('h2')?.style.display).toBe('block');
    expect(renderedPopover?.querySelector('p')?.textContent).toBe(
      '<svg onload=alert(2)>texto</svg>',
    );
    expect(renderedPopover?.querySelector('p')?.style.display).toBe('block');
    expect(popover).toBeNull();
    expect(document.querySelector('img, svg')).toBeNull();
  });

  it('starts every replay at step one and distinguishes completion from dismissal', async () => {
    const { service, launcher } = setUp();
    const destroySpy = vi.spyOn(service, 'destroyTour');

    await service.startTour(guide, launcher);
    driverMocks.instances[0]?.config.onDoneClick?.();
    expect(destroySpy).toHaveBeenCalledWith('completed');
    expect(driverMocks.instances[0]?.drive).toHaveBeenCalledWith(0);

    await service.startTour(guide, launcher);
    driverMocks.instances[1]?.config.onCloseClick?.();
    expect(destroySpy).toHaveBeenCalledWith('dismissed');
    expect(driverMocks.instances[1]?.drive).toHaveBeenCalledWith(0);
  });

  it('creates one driver for concurrent launches and permits replay after closing', async () => {
    const { service, launcher } = setUp();
    const initialLaunch = service.startTour(guide, launcher);
    const competingLaunch = service.startTour(guide, launcher);

    await expect(competingLaunch).resolves.toBe('unavailable');
    await expect(initialLaunch).resolves.toBe('started');
    expect(driverMocks.factory).toHaveBeenCalledTimes(1);

    driverMocks.instances[0]?.config.onCloseClick?.();
    await expect(service.startTour(guide, launcher)).resolves.toBe('started');
    expect(driverMocks.factory).toHaveBeenCalledTimes(2);
    expect(driverMocks.instances[1]?.drive).toHaveBeenCalledWith(0);
  });

  it('destroys the active tour on route navigation and restores connected focus', async () => {
    const { service, launcher, router, document } = setUp();
    const destroySpy = vi.spyOn(service, 'destroyTour');
    launcher.focus();

    await service.startTour(guide, launcher);
    await router.navigateByUrl('/market/another-screen');

    expect(driverMocks.instances[0]?.destroy).toHaveBeenCalledTimes(1);
    expect(destroySpy).toHaveBeenCalledWith('navigation');
    expect(document.activeElement).toBe(launcher);
  });

  it('skips a future target removed during the tour after the short recheck delay', async () => {
    vi.useFakeTimers();
    try {
      const { service, launcher, document } = setUp();
      await service.startTour(threeStepGuide, launcher);
      const instance = driverMocks.instances[0]!;
      document.querySelector('[data-tour="market.filters"]')?.remove();

      const advance = instance.config.onNextClick?.(undefined, undefined, {
        state: { activeIndex: 0 },
        driver: instance,
      });
      await vi.advanceTimersByTimeAsync(150);
      await expect(advance).resolves.toBeUndefined();

      // Driver.js 1.10.1 setSteps() resets internal state; setConfig preserves the active index.
      expect(instance.setSteps).not.toHaveBeenCalled();
      expect(instance.getConfig).toHaveBeenCalled();
      expect(instance.setConfig).toHaveBeenCalled();
      expect(instance.moveNext).toHaveBeenCalledTimes(1);
      expect(instance.state.activeIndex).toBe(1);
      expect(instance.state.activeElement).toBe(
        document.querySelector('[data-tour="market.results"]'),
      );
      expect(instance.state.isInitialized).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('rechecks consecutive future targets removed before advancing', async () => {
    vi.useFakeTimers();
    try {
      const { service, launcher, document } = setUp();
      await service.startTour(threeStepGuide, launcher);
      const instance = driverMocks.instances[0]!;
      document.querySelector('[data-tour="market.filters"]')?.remove();
      document.querySelector('[data-tour="market.results"]')?.remove();

      const advance = instance.config.onNextClick?.(undefined, undefined, {
        state: { activeIndex: 0 },
        driver: instance,
      });
      await vi.advanceTimersByTimeAsync(300);
      await expect(advance).resolves.toBeUndefined();

      expect(instance.moveNext).not.toHaveBeenCalled();
      expect(instance.destroy).toHaveBeenCalledTimes(1);
      expect(document.activeElement).toBe(launcher);
    } finally {
      vi.useRealTimers();
    }
  });

  it('resolves a pending anchor recheck when the tour is destroyed', async () => {
    vi.useFakeTimers();
    try {
      const { service, launcher, document } = setUp();
      await service.startTour(guide, launcher);
      const instance = driverMocks.instances[0]!;
      document.querySelector('[data-tour="market.filters"]')?.remove();

      const advance = instance.config.onNextClick?.(undefined, undefined, {
        state: { activeIndex: 0 },
        driver: instance,
      });
      expect(advance).toBeInstanceOf(Promise);

      service.destroyTour('navigation');
      await expect(advance).resolves.toBeUndefined();

      expect(instance.destroy).toHaveBeenCalledTimes(1);
      expect(instance.setSteps).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not open an empty tour and announces that the guide needs an update', async () => {
    const invalidGuide: TutorialPublicGuide = {
      ...guide,
      steps: [{ ...guide.steps[0]!, anchorKey: 'market.missing' }],
    };
    const { service, launcher } = setUp();

    const result = await service.startTour(invalidGuide, launcher);

    expect(result).toBe('needs-update');
    expect(driverMocks.factory).not.toHaveBeenCalled();
  });

  it('disables motion and smooth scrolling when reduced motion is requested', async () => {
    const { service, launcher } = setUp();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );

    await service.startTour(guide, launcher);

    expect(driverMocks.instances[0]?.config.animate).toBe(false);
    expect(driverMocks.instances[0]?.config.smoothScroll).toBe(false);
  });

  it('handles Escape without consuming arrow-key input', async () => {
    const { service, launcher, document } = setUp();
    const addEventListener = vi.spyOn(document.defaultView!, 'addEventListener');
    await service.startTour(guide, launcher);
    const instance = driverMocks.instances[0]!;
    launcher.focus();
    const keydownCall = addEventListener.mock.calls.find(([type]) => type === 'keydown');
    expect(keydownCall).toBeDefined();
    expect(keydownCall?.[2]).toBe(true);
    const escapeListener = keydownCall?.[1] as EventListener | undefined;
    const KeyboardEventConstructor = document.defaultView!.KeyboardEvent;
    const arrow = new KeyboardEventConstructor('keydown', {
      key: 'ArrowRight',
      cancelable: true,
    });
    escapeListener?.call(document.defaultView, arrow);
    expect(arrow.defaultPrevented).toBe(false);
    expect(instance.moveNext).not.toHaveBeenCalled();

    const escape = new KeyboardEventConstructor('keydown', {
      key: 'Escape',
      cancelable: true,
    });
    escapeListener?.call(document.defaultView, escape);

    expect(escape.defaultPrevented).toBe(true);
    expect(instance.destroy).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(launcher);
  });

  it('never loads the Driver module on the server', async () => {
    const { service, launcher } = setUp('server');

    const result = await service.startTour(guide, launcher);

    expect(result).toBe('unavailable');
    expect(driverMocks.factory).not.toHaveBeenCalled();
  });
});
