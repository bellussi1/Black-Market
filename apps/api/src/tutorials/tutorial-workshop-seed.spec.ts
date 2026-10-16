import { describe, expect, it } from 'vitest';

import { TUTORIAL_SEED_ENTRIES } from './tutorial-seed-content';
import { parseTutorialGuideUpdate } from './tutorial-validation';

describe('recipe workshop tutorial seed', () => {
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
