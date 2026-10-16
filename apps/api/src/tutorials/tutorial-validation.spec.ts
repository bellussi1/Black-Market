import { describe, expect, it } from 'vitest';

import { parseTutorialGuideUpdate } from './tutorial-validation';

describe('tutorial guide payload validation', () => {
  it.each(['*ênfase*', '_ênfase_', '> citação', '- lista', '1. lista', '~~riscado~~'])(
    'rejects Markdown form %s',
    (body) => {
      expect(() =>
        parseTutorialGuideUpdate('market', 'pt-BR', {
          expectedUpdatedAt: null,
          enabled: true,
          steps: [{ sortOrder: 0, anchorKey: null, title: 'Título', body }],
        }),
      ).toThrow();
    },
  );
  it('accepts one to eight pt-BR plain-text steps and normalizes their order', () => {
    const single = parseTutorialGuideUpdate('market', 'pt-BR', {
      expectedUpdatedAt: null,
      enabled: true,
      steps: [
        {
          sortOrder: 7,
          anchorKey: 'market.search',
          title: '  Buscar item  ',
          body: '  Pesquise pelo nome ou código do item para abrir a cotação.  ',
        },
      ],
    });
    expect(single).toEqual({
      expectedUpdatedAt: null,
      enabled: true,
      steps: [
        {
          sortOrder: 0,
          anchorKey: 'market.search',
          title: 'Buscar item',
          body: 'Pesquise pelo nome ou código do item para abrir a cotação.',
        },
      ],
    });

    const eightOutOfOrder = parseTutorialGuideUpdate('recipes', 'pt-BR', {
      expectedUpdatedAt: '2026-10-15T12:00:00.000Z',
      enabled: false,
      steps: [70, 50, 10, 30, 0, 20, 60, 40].map((order) => ({
        sortOrder: order,
        anchorKey: order === 0 ? null : ('recipes.search' as const),
        title: `Passo ${order}`,
        body: `Explicação do passo ${order}.`,
      })),
    });

    expect(eightOutOfOrder.steps.map((step) => step.sortOrder)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(eightOutOfOrder.steps.map((step) => step.title)).toEqual([
      'Passo 0',
      'Passo 10',
      'Passo 20',
      'Passo 30',
      'Passo 40',
      'Passo 50',
      'Passo 60',
      'Passo 70',
    ]);
  });

  it('rejects unsupported locales, unknown screens, zero or nine steps, and overlong fields', () => {
    const validStep = {
      sortOrder: 0,
      anchorKey: 'market.search',
      title: 'Título válido',
      body: 'Corpo válido.',
    };

    expect(() =>
      parseTutorialGuideUpdate('market', 'en-US', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [validStep],
      }),
    ).toThrow();

    expect(() =>
      parseTutorialGuideUpdate('unknown', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [validStep],
      }),
    ).toThrow();

    expect(() =>
      parseTutorialGuideUpdate('market', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [],
      }),
    ).toThrow();

    expect(() =>
      parseTutorialGuideUpdate('market', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: Array.from({ length: 9 }, (_, index) => ({
          ...validStep,
          sortOrder: index,
        })),
      }),
    ).toThrow();

    expect(() =>
      parseTutorialGuideUpdate('market', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [{ ...validStep, title: 'A'.repeat(101) }],
      }),
    ).toThrow();

    expect(() =>
      parseTutorialGuideUpdate('market', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [{ ...validStep, body: 'B'.repeat(361) }],
      }),
    ).toThrow();
  });

  it('rejects HTML, Markdown, extra selector fields, and cross-screen anchors', () => {
    expect(() =>
      parseTutorialGuideUpdate('market', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [
          {
            sortOrder: 0,
            anchorKey: 'market.search',
            title: '<script>alert(1)</script>',
            body: 'Texto simples.',
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      parseTutorialGuideUpdate('market', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [
          {
            sortOrder: 0,
            anchorKey: 'market.search',
            title: 'Título simples',
            body: 'Clique em [link](https://evil.example) ou **negrito**.',
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      parseTutorialGuideUpdate('market', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [
          {
            sortOrder: 0,
            anchorKey: 'market.search',
            title: 'Título simples',
            body: 'Texto simples.',
            selector: '.custom-css',
          },
        ],
      }),
    ).toThrow();

    expect(() =>
      parseTutorialGuideUpdate('market', 'pt-BR', {
        expectedUpdatedAt: null,
        enabled: true,
        steps: [
          {
            sortOrder: 0,
            anchorKey: 'recipes.tree',
            title: 'Título simples',
            body: 'Texto simples.',
          },
        ],
      }),
    ).toThrow();
  });

  it('accepts a null anchor as an intentional general step', () => {
    const parsed = parseTutorialGuideUpdate('scans', 'pt-BR', {
      expectedUpdatedAt: null,
      enabled: true,
      steps: [
        {
          sortOrder: 0,
          anchorKey: null,
          title: 'Visão geral da importação',
          body: 'Esta tela processa capturas no navegador e pede sua revisão antes de salvar.',
        },
      ],
    });

    expect(parsed.steps).toEqual([
      {
        sortOrder: 0,
        anchorKey: null,
        title: 'Visão geral da importação',
        body: 'Esta tela processa capturas no navegador e pede sua revisão antes de salvar.',
      },
    ]);
  });
});
