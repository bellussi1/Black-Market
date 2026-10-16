import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveTutorialSteps } from './tutorial-anchor-resolver';

describe('resolveTutorialSteps', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
      new DOMRect(0, 0, 100, 44),
    ] as unknown as DOMRectList);
  });
  afterEach(() => vi.restoreAllMocks());
  it('omits targets without layout area', () => {
    const target = document.createElement('div');
    target.dataset['tour'] = 'market.search';
    document.body.append(target);
    vi.spyOn(target, 'getClientRects').mockReturnValue([] as unknown as DOMRectList);
    try {
      expect(
        resolveTutorialSteps(document, 'market', [
          { sortOrder: 0, anchorKey: 'market.search', title: 'Busca', body: 'Texto' },
        ]).steps,
      ).toHaveLength(0);
    } finally {
      target.remove();
    }
  });
  it('resolves only keys registered for the requested screen', () => {
    const host = document.createElement('div');
    const search = document.createElement('section');
    search.setAttribute('data-tour', 'market.search');
    const foreign = document.createElement('section');
    foreign.setAttribute('data-tour', 'recipes.tree');
    host.append(search, foreign);
    document.body.appendChild(host);

    try {
      const result = resolveTutorialSteps(document, 'market', [
        { sortOrder: 0, anchorKey: 'market.search', title: 'Busca', body: 'Use a busca.' },
        { sortOrder: 1, anchorKey: 'recipes.tree', title: 'Árvore', body: 'Outra tela.' },
        { sortOrder: 2, anchorKey: '.raw-selector', title: 'Seletor', body: 'Inválido.' },
      ]);

      expect(result.omittedCount).toBe(2);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.element).toBe(search);
      expect(result.steps[0]?.anchorKey).toBe('market.search');
    } finally {
      host.remove();
    }
  });

  it('omits hidden and duplicate targets', () => {
    const host = document.createElement('div');
    const hidden = document.createElement('div');
    hidden.setAttribute('data-tour', 'market.search');
    hidden.hidden = true;

    const dupOne = document.createElement('div');
    dupOne.setAttribute('data-tour', 'market.filters');
    const dupTwo = document.createElement('div');
    dupTwo.setAttribute('data-tour', 'market.filters');

    const valid = document.createElement('div');
    valid.setAttribute('data-tour', 'market.results');

    host.append(hidden, dupOne, dupTwo, valid);
    document.body.appendChild(host);

    try {
      const result = resolveTutorialSteps(document, 'market', [
        { sortOrder: 0, anchorKey: 'market.search', title: 'Oculto', body: 'Oculto.' },
        { sortOrder: 1, anchorKey: 'market.filters', title: 'Duplicado', body: 'Duplicado.' },
        { sortOrder: 2, anchorKey: 'market.results', title: 'Válido', body: 'Válido.' },
      ]);

      expect(result.omittedCount).toBe(2);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.element).toBe(valid);
    } finally {
      host.remove();
    }
  });

  it('resolves exactly one visible target among responsive variants', () => {
    const host = document.createElement('div');
    const desktopVariant = document.createElement('div');
    desktopVariant.setAttribute('data-tour', 'storage.items');
    desktopVariant.style.display = 'none';

    const mobileVariant = document.createElement('div');
    mobileVariant.setAttribute('data-tour', 'storage.items');

    host.append(desktopVariant, mobileVariant);
    document.body.appendChild(host);

    try {
      const result = resolveTutorialSteps(document, 'storage', [
        { sortOrder: 0, anchorKey: 'storage.items', title: 'Itens', body: 'Visível no mobile.' },
      ]);

      expect(result.omittedCount).toBe(0);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0]?.element).toBe(mobileVariant);
    } finally {
      host.remove();
    }
  });

  it('keeps null-anchor steps centered', () => {
    const result = resolveTutorialSteps(document, 'scans', [
      { sortOrder: 0, anchorKey: null, title: 'Etapa geral', body: 'Sem elemento destacado.' },
    ]);

    expect(result.omittedCount).toBe(0);
    expect(result.steps).toEqual([
      {
        sortOrder: 0,
        anchorKey: null,
        title: 'Etapa geral',
        body: 'Sem elemento destacado.',
        element: null,
      },
    ]);
  });
});
