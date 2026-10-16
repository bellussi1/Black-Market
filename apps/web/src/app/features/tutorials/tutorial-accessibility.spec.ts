import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { TutorialService } from '../../core/tutorial.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { TutorialLauncher } from '../../shared/tutorials/tutorial-launcher';
import { renderComponent, useMemoryStorage } from '../../testing/test-setup';
const guide = {
  screenKey: 'market' as const,
  locale: 'pt-BR' as const,
  updatedAt: '2026-10-15T12:00:00.000Z',
  steps: [
    { sortOrder: 0, anchorKey: null, title: 'Primeiro', body: 'Primeira orientação' },
    { sortOrder: 1, anchorKey: null, title: 'Segundo', body: 'Texto longo '.repeat(30) },
  ],
};
describe('Tutorial accessibility with real Driver', () => {
  useMemoryStorage();
  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      top: 20,
      left: 20,
      bottom: 64,
      right: 360,
      width: 340,
      height: 44,
      x: 20,
      y: 20,
      toJSON: () => ({}),
    });
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(20, 20, 340, 44),
    ] as unknown as DOMRectList);
    HTMLElement.prototype.scrollIntoView ??= () => {};
  });
  afterEach(() => {
    TestBed.inject(TutorialService).destroyTour('navigation');
  });
  async function open() {
    const captureTutorial = vi.fn();
    const fixture = await renderComponent(TutorialLauncher, { screenKey: 'market' }, [
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: AnalyticsService, useValue: { captureTutorial } },
    ]);
    const launcher = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    launcher.focus();
    launcher.click();
    await vi.waitFor(() => expect(document.querySelector('.bm-tutorial-popover')).not.toBeNull());
    await new Promise((resolve) => setTimeout(resolve, 30));
    return { fixture, launcher, captureTutorial };
  }
  it('supports keyboard start previous next escape and focus restoration', async () => {
    const { launcher, captureTutorial } = await open();
    expect(document.activeElement?.classList.contains('bm-tutorial-popover')).toBe(true);
    document.activeElement?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
    );
    expect(document.activeElement?.tagName).toBe('BUTTON');
    (document.querySelector('.driver-popover-next-btn') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(document.querySelector('.driver-popover-title')?.textContent).toBe('Segundo'),
    );
    (document.querySelector('.driver-popover-prev-btn') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(document.querySelector('.driver-popover-title')?.textContent).toBe('Primeiro'),
    );
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.bm-tutorial-popover')).toBeNull();
    expect(document.activeElement).toBe(launcher);
    expect(captureTutorial.mock.calls.map((call) => call[0])).toEqual([
      'tutorial_started',
      'tutorial_dismissed',
    ]);
  });
  it('announces current title body and progress without duplicate live regions', async () => {
    await open();
    const popover = document.querySelector('.bm-tutorial-popover')!;
    expect(popover.getAttribute('role')).toBe('dialog');
    expect(popover.getAttribute('aria-describedby')).toContain('bm-tutorial-progress');
    expect(popover.querySelector('#bm-tutorial-progress')?.textContent).toBe('1 de 2');
    expect(popover.querySelectorAll('[aria-live]')).toHaveLength(0);
    expect(popover.querySelector('.driver-popover-description')?.textContent).toBe(
      'Primeira orientação',
    );
  });
  it('keeps native controls with localized names and completes distinctly', async () => {
    const { launcher, captureTutorial } = await open();
    expect(launcher.type).toBe('button');
    const close = document.querySelector('.driver-popover-close-btn')!;
    expect(close.getAttribute('aria-label')).toBe('Sair do tutorial');
    (document.querySelector('.driver-popover-next-btn') as HTMLButtonElement).click();
    await vi.waitFor(() =>
      expect(document.querySelector('.driver-popover-next-btn')?.textContent).toBe('Concluir'),
    );
    (document.querySelector('.driver-popover-next-btn') as HTMLButtonElement).click();
    expect(captureTutorial.mock.calls.map((call) => call[0])).toEqual([
      'tutorial_started',
      'tutorial_completed',
    ]);
    expect(document.activeElement).toBe(launcher);
  });
  it('preserves arrow-key and text input behavior in the underlying page', async () => {
    await open();
    const input = document.createElement('input');
    document.body.append(input);
    input.focus();
    const arrow = new KeyboardEvent('keydown', {
      key: 'ArrowRight',
      bubbles: true,
      cancelable: true,
    });
    input.dispatchEvent(arrow);
    input.value = 'Busca';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(arrow.defaultPrevented).toBe(false);
    expect(input.value).toBe('Busca');
    expect(document.querySelector('.driver-popover-title')?.textContent).toBe('Primeiro');
    input.remove();
  });
});
