import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationStart, Router } from '@angular/router';
import type { Config, Driver, PopoverDOM } from 'driver.js';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from './analytics.service';
import { TUTORIAL_DRIVER_LOADER, TutorialService } from './tutorial.service';
import { TutorialOnboardingStateService } from './tutorial-onboarding-state.service';

const guide = {
  screenKey: 'market' as const,
  locale: 'pt-BR' as const,
  updatedAt: '2026-10-15T12:00:00.000Z',
  steps: [
    {
      sortOrder: 0,
      anchorKey: null,
      title: '<img src=x onerror=alert(1)>',
      body: '<script>alert(1)</script>',
    },
    { sortOrder: 1, anchorKey: null, title: 'Segundo', body: 'Texto' },
  ],
};
describe('TutorialService', () => {
  let config: Config;
  let index: number;
  let popover: PopoverDOM;
  let service: TutorialService;
  let launcher: HTMLButtonElement;
  let router: Subject<unknown>;
  let capture: ReturnType<typeof vi.fn>;
  let markSeen: ReturnType<typeof vi.fn>;
  const fake = { drive: vi.fn(), destroy: vi.fn(), moveTo: vi.fn(), getActiveIndex: () => index };
  const factory = vi.fn((options: Config) => {
    config = options;
    return fake as unknown as Driver;
  });
  const loader = vi.fn(async () => ({ driver: factory }));
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 100, 44),
    ] as unknown as DOMRectList);
    index = 0;
    router = new Subject();
    capture = vi.fn();
    markSeen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: router } },
        { provide: AnalyticsService, useValue: { captureTutorial: capture } },
        {
          provide: TutorialOnboardingStateService,
          useValue: { hasSeen: () => false, markSeen, resetAll: vi.fn() },
        },
        { provide: TUTORIAL_DRIVER_LOADER, useValue: loader },
      ],
    });
    service = TestBed.inject(TutorialService);
    launcher = document.createElement('button');
    document.body.append(launcher);
    const wrapper = document.createElement('div');
    document.body.append(wrapper);
    popover = Object.fromEntries(
      ['arrow', 'title', 'description', 'footer', 'progress', 'footerButtons'].map((key) => [
        key,
        document.createElement('div'),
      ]),
    ) as unknown as PopoverDOM;
    popover.wrapper = wrapper;
    for (const key of ['previousButton', 'nextButton', 'closeButton'] as const) {
      popover[key] = document.createElement('button');
      wrapper.append(popover[key]);
    }
    fake.drive.mockImplementation(() =>
      config.onPopoverRender?.(popover, {
        index: 0,
        driver: fake as unknown as Driver,
        config,
        state: {},
      }),
    );
    fake.moveTo.mockImplementation((next: number) => {
      index = next;
    });
  });
  afterEach(() => {
    service.destroyTour('navigation');
    document.body.replaceChildren();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });
  it('loads Driver.js only in the browser', async () => {
    expect(loader).not.toHaveBeenCalled();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: Router, useValue: { events: router } },
        { provide: AnalyticsService, useValue: { captureTutorial: capture } },
        { provide: TUTORIAL_DRIVER_LOADER, useValue: loader },
      ],
    });
    service = TestBed.inject(TutorialService);
    await service.startTour(guide);
    expect(loader).not.toHaveBeenCalled();
  });
  it('renders hostile title and body with textContent only', async () => {
    await service.startTour(guide, launcher);
    expect(popover.title.textContent).toBe(guide.steps[0].title);
    expect(popover.title.children.length).toBe(0);
    expect(popover.description.textContent).toBe(guide.steps[0].body);
    expect(config.steps?.[0].popover?.title).toBeUndefined();
  });
  it('starts every replay at step one and distinguishes completion from dismissal', async () => {
    await service.startTour(guide, launcher);
    service.destroyTour('completed');
    await service.startTour(guide, launcher);
    service.destroyTour('dismissed');
    expect(fake.drive).toHaveBeenNthCalledWith(1, 0);
    expect(fake.drive).toHaveBeenNthCalledWith(2, 0);
    expect(capture.mock.calls.map((call) => call[0])).toEqual([
      'tutorial_started',
      'tutorial_completed',
      'tutorial_started',
      'tutorial_dismissed',
    ]);
    expect(markSeen.mock.calls).toEqual([
      ['market', guide.updatedAt, 'completed'],
      ['market', guide.updatedAt, 'dismissed'],
    ]);
  });
  it('destroys the active tour on route navigation without marking it seen', async () => {
    await service.startTour(guide, launcher);
    router.next(new NavigationStart(1, '/recipes'));
    expect(fake.destroy).toHaveBeenCalledOnce();
    expect(document.activeElement).not.toBe(launcher);
    expect(capture).toHaveBeenCalledOnce();
    expect(markSeen).not.toHaveBeenCalled();
  });
  it('returns focus after explicit replay', async () => {
    await service.startTour(guide, launcher);

    service.destroyTour('completed');

    expect(document.activeElement).toBe(launcher);
  });
  it('does not open an empty tour and announces that the guide needs an update', async () => {
    await expect(
      service.startTour(
        { ...guide, steps: [{ ...guide.steps[0], anchorKey: 'market.search' }] },
        launcher,
      ),
    ).resolves.toContain('atualização');
    expect(loader).not.toHaveBeenCalled();
  });
  it('disables motion and smooth scrolling when reduced motion is requested', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    await service.startTour(guide, launcher);
    expect(config.animate).toBe(false);
    expect(config.smoothScroll).toBe(false);
    vi.unstubAllGlobals();
  });
  it('skips a future target removed during the tour', async () => {
    const target = document.createElement('div');
    target.dataset['tour'] = 'market.search';
    document.body.append(target);
    await service.startTour(
      {
        ...guide,
        steps: [
          guide.steps[0],
          { ...guide.steps[1], anchorKey: 'market.search' },
          { ...guide.steps[1], sortOrder: 2 },
        ],
      },
      launcher,
    );
    target.remove();
    config.onNextClick?.(
      undefined,
      {},
      { config, state: {}, driver: fake as unknown as Driver, index: 0 },
    );
    await new Promise((resolve) => setTimeout(resolve, 180));
    expect(fake.moveTo).toHaveBeenCalledWith(2);
  });
  it('supports Escape and does not intercept arrow keys or text input', async () => {
    await service.startTour(guide, launcher);
    const arrow = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    document.dispatchEvent(arrow);
    expect(arrow.defaultPrevented).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(capture.mock.calls.map((call) => call[0])).toEqual([
      'tutorial_started',
      'tutorial_dismissed',
    ]);
  });
});
