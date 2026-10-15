import { DOCUMENT } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { TutorialPublicGuide } from '@bdo/shared';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AnalyticsService } from '../../core/analytics.service';
import { TutorialService } from '../../core/tutorial.service';
import { TutorialApiService } from '../../core/tutorial-api.service';
import { TutorialLauncher } from '../../shared/tutorial-launcher/tutorial-launcher';

@Component({
  imports: [TutorialLauncher],
  template: `
    <label>Pesquisar itens <input type="text" /></label>
    <app-tutorial-launcher screenKey="market" />
  `,
  styleUrl: './tutorial-popover.scss',
  encapsulation: ViewEncapsulation.None,
})
class TutorialScreen {}

const guide: TutorialPublicGuide = {
  screenKey: 'market',
  locale: 'pt-BR',
  updatedAt: '2026-10-15T15:00:00.000Z',
  steps: [
    { sortOrder: 0, anchorKey: null, title: 'Primeira etapa', body: 'Texto da primeira etapa.' },
    { sortOrder: 1, anchorKey: null, title: 'Segunda etapa', body: 'Texto da segunda etapa.' },
  ],
};

function key(target: Element, type: 'keydown' | 'keyup', value: string, shiftKey = false) {
  const event = new target.ownerDocument.defaultView!.KeyboardEvent(type, {
    key: value,
    bubbles: true,
    cancelable: true,
    shiftKey,
  });
  target.dispatchEvent(event);
  return event;
}

// JSDOM has no native keyboard default actions. Model only native button activation;
// Tab and Escape still run through the real Driver.js/runtime listeners below.
function activate(button: HTMLButtonElement, value: 'Enter' | ' ') {
  expect(button.tagName).toBe('BUTTON');
  expect(button.type).toBe('button');
  const down = key(button, 'keydown', value);
  const up = key(button, 'keyup', value);
  if (!down.defaultPrevented && !up.defaultPrevented) button.click();
}

async function setup() {
  await TestBed.configureTestingModule({
    imports: [TutorialScreen],
    providers: [
      provideRouter([]),
      { provide: TutorialApiService, useValue: { getPublished: () => of({ guide }) } },
      { provide: AnalyticsService, useValue: { captureTutorial: () => false } },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(TutorialScreen);
  await fixture.whenStable();
  const document = TestBed.inject(DOCUMENT);
  const launcher = fixture.nativeElement.querySelector(
    '.tutorial-launcher__button',
  ) as HTMLButtonElement;
  return { fixture, document, launcher };
}

function currentPopover(document: Document): HTMLElement {
  const popover = document.querySelector<HTMLElement>('.bm-tutorial-popover');
  expect(popover).not.toBeNull();
  return popover!;
}

async function waitForPopover(document: Document) {
  await vi.waitFor(() => expect(document.querySelector('.bm-tutorial-popover')).not.toBeNull());
}

function button(popover: HTMLElement, selector: string): HTMLButtonElement {
  return popover.querySelector<HTMLButtonElement>(selector)!;
}

function focusRule(control: HTMLButtonElement): CSSStyleRule | undefined {
  // JSDOM cannot reproduce a browser's keyboard modality for :focus-visible.
  // Inspect the loaded CSSOM rule applied to this real control instead.
  return Array.from(control.ownerDocument.styleSheets)
    .flatMap((sheet) => Array.from(sheet.cssRules))
    .filter((rule): rule is CSSStyleRule => 'selectorText' in rule)
    .find(
      (rule) =>
        rule.selectorText.includes(':focus-visible') &&
        control.matches(rule.selectorText.replaceAll(':focus-visible', '')),
    );
}

describe('Tutorial accessibility integration with Driver.js', () => {
  let scrollIntoView: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    scrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView');
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => undefined,
    });
    // Geometry is unavailable in JSDOM. Supply visibility only for Driver's focus list;
    // physical pixel sizes and viewport reflow remain browser acceptance checks.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (
      this: HTMLElement,
    ) {
      return this.isConnected && !this.closest('[hidden], [style*="display: none"]')
        ? ([{ width: 80, height: 44 }] as unknown as DOMRectList)
        : ([] as unknown as DOMRectList);
    });
  });

  afterEach(() => {
    TestBed.inject(TutorialService).destroyTour('navigation');
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (scrollIntoView) {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollIntoView);
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView');
    }
  });

  it('supports keyboard start, previous, next, escape and focus restoration', async () => {
    const { fixture, document, launcher } = await setup();
    expect(document.querySelector('.bm-tutorial-popover')).toBeNull();
    launcher.focus();
    activate(launcher, 'Enter');
    await fixture.whenStable();
    await waitForPopover(document);

    let popover = currentPopover(document);
    expect(document.activeElement).toBe(popover);
    expect(popover.textContent).toContain('Primeira etapa');
    expect(button(popover, '.driver-popover-prev-btn').disabled).toBe(true);
    const close = button(popover, '.driver-popover-close-btn');
    const next = button(popover, '.driver-popover-next-btn');
    close.focus();
    key(close, 'keydown', 'Tab');
    expect(document.activeElement).toBe(next);
    key(next, 'keydown', 'Tab', true);
    expect(document.activeElement).toBe(close);
    key(close, 'keydown', 'Tab');
    activate(next, ' ');
    await fixture.whenStable();

    popover = currentPopover(document);
    expect(popover.textContent).toContain('Segunda etapa');
    const previous = button(popover, '.driver-popover-prev-btn');
    button(popover, '.driver-popover-close-btn').focus();
    key(document.activeElement!, 'keydown', 'Tab');
    expect(document.activeElement).toBe(previous);
    activate(previous, 'Enter');
    await fixture.whenStable();
    popover = currentPopover(document);
    expect(popover.textContent).toContain('Primeira etapa');

    const escape = key(document.activeElement!, 'keydown', 'Escape');
    expect(escape.defaultPrevented).toBe(true);
    expect(document.querySelector('.bm-tutorial-popover')).toBeNull();
    expect(document.activeElement).toBe(launcher);

    activate(launcher, ' ');
    await fixture.whenStable();
    activate(button(currentPopover(document), '.driver-popover-next-btn'), 'Enter');
    await fixture.whenStable();
    const done = button(currentPopover(document), '.driver-popover-next-btn');
    expect(done.textContent).toBe('Concluir');
    activate(done, ' ');
    await fixture.whenStable();
    expect(document.querySelector('.bm-tutorial-popover')).toBeNull();
    expect(document.activeElement).toBe(launcher);
  });

  it('announces current title, body and progress without duplicate live regions', async () => {
    const { fixture, document, launcher } = await setup();
    activate(launcher, 'Enter');
    await fixture.whenStable();

    for (const [title, body, progress] of [
      ['Primeira etapa', 'Texto da primeira etapa.', '1 de 2'],
      ['Segunda etapa', 'Texto da segunda etapa.', '2 de 2'],
    ]) {
      const popover = currentPopover(document);
      const label = document.getElementById(popover.getAttribute('aria-labelledby')!);
      const description = popover
        .getAttribute('aria-describedby')!
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent)
        .join(' ');
      expect(label?.textContent).toBe(title);
      expect(description).toContain(body);
      expect(description).toContain(progress);
      expect(document.querySelectorAll('[role="status"], [aria-live]')).toHaveLength(0);
      expect(document.activeElement).toBe(popover);
      activate(button(popover, '.driver-popover-next-btn'), 'Enter');
      await fixture.whenStable();
    }
  });

  it('keeps native controls at least 44 by 44 pixels with visible focus styles', async () => {
    const { fixture, document, launcher } = await setup();
    activate(launcher, 'Enter');
    await fixture.whenStable();
    const controls = [launcher, ...currentPopover(document).querySelectorAll('button')];
    for (const control of controls) {
      expect(control.type).toBe('button');
      expect(control.getAttribute('aria-label') || control.textContent?.trim()).toBeTruthy();
      const style = getComputedStyle(control);
      expect(parseFloat(style.minWidth)).toBeGreaterThanOrEqual(44);
      expect(parseFloat(style.minHeight)).toBeGreaterThanOrEqual(44);
      if (control.disabled) continue;
      control.focus();
      expect(document.activeElement).toBe(control);
      expect(focusRule(control)?.style.getPropertyValue('outline')).toMatch(/3px solid/);
      expect(
        parseFloat(focusRule(control)?.style.getPropertyValue('outline-offset') ?? ''),
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it('preserves arrow-key and text input behavior in the underlying page', async () => {
    const { fixture, document, launcher } = await setup();
    activate(launcher, 'Enter');
    await fixture.whenStable();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    const received: string[] = [];
    input.addEventListener('keydown', (event) => received.push(event.key));
    input.focus();
    for (const value of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'ç']) {
      expect(key(input, 'keydown', value).defaultPrevented).toBe(false);
      expect(key(input, 'keyup', value).defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(input);
      expect(currentPopover(document).textContent).toContain('Primeira etapa');
    }
    input.value = 'aço';
    input.dispatchEvent(new document.defaultView!.Event('input', { bubbles: true }));
    expect(input.value).toBe('aço');
    expect(received).toEqual(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'a', 'ç']);
  });
});
