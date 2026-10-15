import type { TutorialPublicGuide } from '@bdo/shared';
import { describe, expect, it } from 'vitest';

import { resolveTutorialSteps } from './tutorial-anchor-resolver';

const step = (sortOrder: number, anchorKey: string | null) => ({
  sortOrder,
  anchorKey,
  title: `Etapa ${sortOrder + 1}`,
  body: 'Orientação simples.',
});

function makeVisible(element: HTMLElement): void {
  element.getBoundingClientRect = () =>
    ({ x: 0, y: 0, top: 0, right: 120, bottom: 40, left: 0, width: 120, height: 40 }) as DOMRect;
}

describe('resolveTutorialSteps', () => {
  it('resolves only keys registered for the requested screen', () => {
    const document = window.document;
    document.body.innerHTML =
      '<main><button data-tour="market.search"></button><button data-tour="recipes.search"></button></main>';
    const marketTarget = document.querySelector<HTMLElement>('[data-tour="market.search"]');
    const recipesTarget = document.querySelector<HTMLElement>('[data-tour="recipes.search"]');
    if (marketTarget) makeVisible(marketTarget);
    if (recipesTarget) makeVisible(recipesTarget);
    const steps: TutorialPublicGuide['steps'] = [
      step(0, 'market.search'),
      step(1, 'recipes.search'),
      step(2, 'market.search, body'),
    ];

    const result = resolveTutorialSteps(document, 'market', steps);

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.element).toBe(marketTarget);
    expect(result.steps[0]?.title).toBe('Etapa 1');
    expect(result.omittedCount).toBe(2);
  });

  it('omits hidden targets and duplicate visible targets', () => {
    const document = window.document;
    document.body.innerHTML = `
      <button data-tour="market.search" style="display:none"></button>
      <button data-tour="market.filters"></button>
      <button data-tour="market.filters"></button>
      <section style="opacity:0"><button data-tour="market.results"></button></section>`;
    const duplicates = document.querySelectorAll<HTMLElement>('[data-tour="market.filters"]');
    duplicates.forEach(makeVisible);
    const transparentAncestorTarget = document.querySelector<HTMLElement>(
      '[data-tour="market.results"]',
    );
    if (transparentAncestorTarget) makeVisible(transparentAncestorTarget);

    const result = resolveTutorialSteps(document, 'market', [
      step(0, 'market.search'),
      step(1, 'market.filters'),
      step(2, 'market.results'),
    ]);

    expect(result.steps).toEqual([]);
    expect(result.omittedCount).toBe(3);
  });

  it('resolves exactly one visible target among responsive variants', () => {
    const document = window.document;
    document.body.innerHTML = `
      <button data-tour="market.search" style="display:none">Desktop</button>
      <button data-tour="market.search">Mobile</button>`;
    const variants = document.querySelectorAll<HTMLElement>('[data-tour]');
    const visibleVariant = variants[1];
    if (visibleVariant) makeVisible(visibleVariant);

    const result = resolveTutorialSteps(document, 'market', [step(0, 'market.search')]);

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.element).toBe(visibleVariant);
    expect(result.omittedCount).toBe(0);
  });

  it('keeps null-anchor steps centered without requiring a DOM target', () => {
    const document = window.document;
    document.body.innerHTML = '<main></main>';

    const result = resolveTutorialSteps(document, 'recipes', [step(0, null)]);

    expect(result.steps).toEqual([
      {
        sortOrder: 0,
        anchorKey: null,
        element: null,
        title: 'Etapa 1',
        body: 'Orientação simples.',
      },
    ]);
    expect(result.omittedCount).toBe(0);
  });
});
