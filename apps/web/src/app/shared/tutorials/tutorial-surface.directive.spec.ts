import { Component, Input } from '@angular/core';
import type { TutorialScreenKey } from '@bdo/shared';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TutorialService } from '../../core/tutorial.service';
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
    expect(startTour).toHaveBeenCalledWith(guide, main);
    expect(main.children).toHaveLength(1);
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
    expect(fixture.nativeElement.querySelector('main').children).toHaveLength(1);
  });
});
