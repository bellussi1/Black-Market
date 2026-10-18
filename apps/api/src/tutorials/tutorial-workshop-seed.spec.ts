import { describe, expect, it } from 'vitest';

import { TUTORIAL_SCREEN_REGISTRY } from '@bdo/shared';

import { TUTORIAL_SEED_ENTRIES } from './tutorial-seed-content';
import { parseTutorialGuideUpdate } from './tutorial-validation';

describe('recipe workshop tutorial seed', () => {
  it('provides two to twelve validated pt-BR steps for every active MVP surface', () => {
    expect(TUTORIAL_SEED_ENTRIES.map((entry) => entry.screenKey).sort()).toEqual(
      TUTORIAL_SCREEN_REGISTRY.map((screen) => screen.screenKey).sort(),
    );

    for (const entry of TUTORIAL_SEED_ENTRIES) {
      expect(entry.locale).toBe('pt-BR');
      expect(entry.steps.length).toBeGreaterThanOrEqual(2);
      expect(entry.steps.length).toBeLessThanOrEqual(12);
      expect(() =>
        parseTutorialGuideUpdate(entry.screenKey, entry.locale, {
          expectedUpdatedAt: null,
          enabled: entry.enabled,
          steps: entry.steps,
        }),
      ).not.toThrow();
    }
  });

  it('provides four ordered, valid steps for the item workshop without replacing the catalogue guide', () => {
    const catalogue = TUTORIAL_SEED_ENTRIES.find((entry) => entry.screenKey === 'recipes');
    const workshop = TUTORIAL_SEED_ENTRIES.find((entry) => entry.screenKey === 'recipe-workshop');
    expect(catalogue?.steps.map((step) => step.anchorKey)).toEqual([
      'recipes.search',
      'recipes.methods',
      'recipes.tree',
    ]);
    expect(workshop?.steps.map((step) => step.anchorKey)).toEqual([
      'recipe-workshop.batch-mastery',
      'recipe-workshop.financial',
      'recipe-workshop.strategy',
      'recipe-workshop.materials-returns',
    ]);
    expect(workshop?.steps.map((step) => step.sortOrder)).toEqual([0, 1, 2, 3]);
    expect(() =>
      parseTutorialGuideUpdate('recipe-workshop', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: workshop?.enabled,
        steps: workshop?.steps,
      }),
    ).not.toThrow();
  });
});
