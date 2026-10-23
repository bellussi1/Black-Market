import { Component, Input } from '@angular/core';
import type { TutorialScreenKey } from '@bdo/shared';
import type { Config, Driver } from 'driver.js';
import { of, Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { TUTORIAL_DRIVER_LOADER, TutorialService } from '../../core/tutorial.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { TutorialOnboardingStateService } from '../../core/tutorial-onboarding-state.service';
import { renderComponent } from '../../testing/test-setup';
import { TutorialSurfaceDirective } from './tutorial-surface.directive';

const guide = {
  screenKey: 'market' as const,
  locale: 'pt-BR' as const,
  updatedAt: '2026-10-18T00:00:00.000Z',
  steps: [{ sortOrder: 0, anchorKey: 'market.search', title: 'Buscar', body: 'Pesquise um item.' }],
};

@Component({
  standalone: true,
  imports: [TutorialSurfaceDirective],
  template: `
    <main [appTutorialSurface]="surface" [appTutorialSurfaceReady]="ready">
      <input aria-label="Busca" />
      @if (showTarget) {
        <section data-tour="market.search">Busca</section>
      }
    </main>
  `,
})
class TutorialSurfaceHost {
  @Input() surface: TutorialScreenKey = 'market';
  @Input() ready = true;
  @Input() showTarget = true;
}

describe('TutorialSurfaceDirective', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 100, 44),
    ] as unknown as DOMRectList);
  });

  it('starts automatically without adding controls or layout elements', async () => {
    const startTour = vi.fn().mockResolvedValue('');
    const fixture = await renderComponent(TutorialSurfaceHost, {}, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: TutorialService, useValue: { startTour, destroyTour: vi.fn() } },
      { provide: TutorialOnboardingStateService, useValue: { hasSeen: () => false } },
    ]);

    const main = fixture.nativeElement.querySelector('main') as HTMLElement;
    expect(startTour).toHaveBeenCalledWith(
      guide,
      main,
      expect.objectContaining({ aborted: false }),
    );
    expect(main.children).toHaveLength(2);
    expect(main.querySelector('button')).toBeNull();
  });

  it('waits until the existing surface reports ready', async () => {
    const getPublished = vi.fn(() => of({ guide }));
    const startTour = vi.fn().mockResolvedValue('');
    const fixture = await renderComponent(TutorialSurfaceHost, { ready: false }, [
      { provide: TutorialApiService, useValue: { getPublished } },
      { provide: TutorialService, useValue: { startTour, destroyTour: vi.fn() } },
      { provide: TutorialOnboardingStateService, useValue: { hasSeen: () => false } },
    ]);

    expect(getPublished).not.toHaveBeenCalled();
    expect(startTour).not.toHaveBeenCalled();

    fixture.componentRef.setInput('ready', true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(startTour).toHaveBeenCalledOnce();
  });

  it('waits for a unique visible anchor before opening the tour', async () => {
    const startTour = vi.fn().mockResolvedValue('');
    const fixture = await renderComponent(TutorialSurfaceHost, { showTarget: false }, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: TutorialService, useValue: { startTour, destroyTour: vi.fn() } },
      { provide: TutorialOnboardingStateService, useValue: { hasSeen: () => false } },
    ]);

    expect(startTour).not.toHaveBeenCalled();
    fixture.componentRef.setInput('showTarget', true);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(startTour).toHaveBeenCalledOnce();
  });

  it('does not reopen a completed or dismissed guide revision', async () => {
    const startTour = vi.fn().mockResolvedValue('');
    const fixture = await renderComponent(TutorialSurfaceHost, {}, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: TutorialService, useValue: { startTour, destroyTour: vi.fn() } },
      {
        provide: TutorialOnboardingStateService,
        useValue: { hasSeen: vi.fn(() => true) },
      },
    ]);

    expect(startTour).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('main').children).toHaveLength(2);
  });

  it.each(['pointerdown', 'keydown', 'input', 'focusin'])(
    'keeps an interaction in progress uninterrupted when the guide arrives after %s',
    async (eventType) => {
      const published = new Subject<{ guide: typeof guide }>();
      const drive = vi.fn();
      const markSeen = vi.fn();
      const fixture = await renderComponent(TutorialSurfaceHost, {}, [
        { provide: TutorialApiService, useValue: { getPublished: () => published } },
        { provide: AnalyticsService, useValue: { captureTutorial: vi.fn() } },
        { provide: TutorialOnboardingStateService, useValue: { hasSeen: () => false, markSeen } },
        {
          provide: TUTORIAL_DRIVER_LOADER,
          useValue: async () => ({
            driver: () => ({ drive, destroy: vi.fn() }) as unknown as Driver,
          }),
        },
      ]);
      const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
      input.value = 'Trigo';
      input.dispatchEvent(new Event(eventType, { bubbles: true }));
      published.next({ guide });
      await fixture.whenStable();

      expect(drive).not.toHaveBeenCalled();
      expect(input.value).toBe('Trigo');
      expect(markSeen).not.toHaveBeenCalled();
    },
  );

  it('cancels automatic startup during the driver download and still permits voluntary help', async () => {
    let resolveDriver!: (value: { driver: (options?: Config) => Driver }) => void;
    const loading = new Promise<{ driver: (options?: Config) => Driver }>((resolve) => {
      resolveDriver = resolve;
    });
    const drive = vi.fn();
    const markSeen = vi.fn();
    const fixture = await renderComponent(TutorialSurfaceHost, {}, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: AnalyticsService, useValue: { captureTutorial: vi.fn() } },
      { provide: TutorialOnboardingStateService, useValue: { hasSeen: () => false, markSeen } },
      { provide: TUTORIAL_DRIVER_LOADER, useValue: () => loading },
    ]);
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.focus();
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'T', bubbles: true }));
    resolveDriver({ driver: () => ({ drive, destroy: vi.fn() }) as unknown as Driver });
    await loading;
    await fixture.whenStable();

    expect(drive).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(input);
    expect(markSeen).not.toHaveBeenCalled();

    await fixture.debugElement.injector.get(TutorialService).startTour(guide, input);
    expect(drive).toHaveBeenCalledOnce();
  });

  it('does not open when a delayed target appears after the user begins editing', async () => {
    const startTour = vi.fn().mockResolvedValue('');
    const fixture = await renderComponent(TutorialSurfaceHost, { showTarget: false }, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: TutorialService, useValue: { startTour, destroyTour: vi.fn() } },
      { provide: TutorialOnboardingStateService, useValue: { hasSeen: () => false } },
    ]);
    fixture.nativeElement
      .querySelector('input')
      .dispatchEvent(new Event('input', { bubbles: true }));
    fixture.componentRef.setInput('showTarget', true);
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(startTour).not.toHaveBeenCalled();
  });

  it('keeps automatic help suppressed when readiness changes after an interaction', async () => {
    const startTour = vi.fn().mockResolvedValue('');
    const fixture = await renderComponent(TutorialSurfaceHost, { ready: false }, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: TutorialService, useValue: { startTour, destroyTour: vi.fn() } },
      { provide: TutorialOnboardingStateService, useValue: { hasSeen: () => false } },
    ]);
    fixture.nativeElement
      .querySelector('input')
      .dispatchEvent(new Event('input', { bubbles: true }));
    fixture.componentRef.setInput('ready', true);
    await fixture.whenStable();

    expect(startTour).not.toHaveBeenCalled();
  });
});
