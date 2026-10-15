import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import { parseTutorialGuideUpdate } from './tutorial-validation';

const step = {
  sortOrder: 0,
  anchorKey: 'market.search',
  title: 'Pesquisar item',
  body: 'Digite o nome do item. Compare preços e estoque.',
};
const update = { expectedUpdatedAt: null, enabled: true, steps: [step] };

function expectInvalid(
  input: unknown,
  path: (string | number)[],
  screen = 'market',
  locale = 'pt-BR',
) {
  let error: unknown;
  try {
    parseTutorialGuideUpdate(screen, locale, input);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeInstanceOf(BadRequestException);
  if (!(error instanceof BadRequestException))
    throw new Error('Expected payload validation error.');
  expect(error.getStatus()).toBe(400);
  const response = error.getResponse() as {
    issues: { path: (string | number)[]; message: string }[];
  };
  expect(response.issues.map((issue) => issue.path)).toContainEqual(path);
  for (const issue of response.issues) expect(typeof issue.message).toBe('string');
}

describe('tutorial guide update validation', () => {
  it('accepts one to eight pt-BR plain-text steps and normalizes their order', () => {
    expect(parseTutorialGuideUpdate('market', 'pt-BR', update)).toEqual(update);
    const steps = [70, 30, 90, 10, 50, 20, 80, 40].map((sortOrder) => ({
      ...step,
      sortOrder,
      title: `Etapa ${sortOrder}`,
    }));
    const parsed = parseTutorialGuideUpdate('market', 'pt-BR', {
      ...update,
      enabled: false,
      expectedUpdatedAt: '2026-10-15T12:00:00-03:00',
      steps,
    });
    expect(parsed.enabled).toBe(false);
    expect(parsed.expectedUpdatedAt).toBe('2026-10-15T12:00:00-03:00');
    expect(parsed.steps.map(({ sortOrder, title }) => [sortOrder, title])).toEqual([
      [0, 'Etapa 10'],
      [1, 'Etapa 20'],
      [2, 'Etapa 30'],
      [3, 'Etapa 40'],
      [4, 'Etapa 50'],
      [5, 'Etapa 70'],
      [6, 'Etapa 80'],
      [7, 'Etapa 90'],
    ]);
    expect(steps.map(({ sortOrder }) => sortOrder)).toEqual([70, 30, 90, 10, 50, 20, 80, 40]);
    expect(
      parseTutorialGuideUpdate('market', 'pt-BR', {
        ...update,
        steps: [{ ...step, title: 'a'.repeat(100), body: 'b'.repeat(360) }],
      }).steps[0]?.title,
    ).toHaveLength(100);
  });

  it('rejects unsupported locales, unknown screens, zero or nine steps, and overlong fields', () => {
    expectInvalid(update, ['locale'], 'market', 'en-US');
    for (const screen of ['unknown', '__proto__', 'constructor', '/market']) {
      expectInvalid(update, ['screenKey'], screen);
    }
    expectInvalid({ ...update, steps: [] }, ['steps']);
    expectInvalid({ ...update, steps: Array.from({ length: 9 }, () => step) }, ['steps']);
    for (const [field, value] of [
      ['title', 'a'.repeat(101)],
      ['body', 'b'.repeat(361)],
      ['title', '   '],
      ['body', ''],
      ['sortOrder', -1],
      ['sortOrder', 1.5],
      ['sortOrder', '1'],
      ['anchorKey', 'unknown'],
    ] as const) {
      expectInvalid({ ...update, steps: [{ ...step, [field]: value }] }, ['steps', 0, field]);
    }
    for (const expectedUpdatedAt of ['', 'not-a-date', 123, undefined]) {
      expectInvalid({ ...update, expectedUpdatedAt }, ['expectedUpdatedAt']);
    }
    for (const enabled of ['true', 1, null, undefined]) {
      expectInvalid({ ...update, enabled }, ['enabled']);
    }
    expectInvalid(null, []);
  });

  it('rejects HTML, Markdown, extra selector fields, and cross-screen anchors', () => {
    for (const text of [
      '<img src=x onerror=alert(1)>',
      '<script>alert(1)</script>',
      '<!-- comment -->',
      '**destaque**',
      '*ênfase*',
      '_ênfase_',
      '~~riscado~~',
      '`código`',
      '[link](https://example.com)',
      '![imagem](x)',
      '# Título',
      '- Item',
      '1. Item',
      '> Citação',
      'Texto\n---',
      'Texto\n=',
      '```js\nalert(1)\n```',
      '[link][ref]',
      '[ref]: https://example.com',
      '<https://example.com>',
      '    código indentado',
      '| Coluna |\n| --- |\n| Valor |',
    ]) {
      for (const field of ['title', 'body']) {
        expectInvalid({ ...update, steps: [{ ...step, [field]: text }] }, ['steps', 0, field]);
      }
    }
    for (const field of ['selector', 'route', 'callback', 'action', 'id', 'screenKey']) {
      expectInvalid({ ...update, [field]: 'unexpected' }, [field]);
      expectInvalid({ ...update, steps: [{ ...step, [field]: 'unexpected' }] }, [
        'steps',
        0,
        field,
      ]);
    }
    expectInvalid({ ...update, steps: [{ ...step, anchorKey: 'recipes.search' }] }, [
      'steps',
      0,
      'anchorKey',
    ]);
  });

  it('accepts a null anchor as an intentional general step', () => {
    expect(
      parseTutorialGuideUpdate('storage', 'pt-BR', {
        ...update,
        steps: [{ ...step, anchorKey: null, sortOrder: 99 }],
      }),
    ).toEqual({ ...update, steps: [{ ...step, anchorKey: null }] });
    expectInvalid({ ...update, steps: [{ sortOrder: 0, title: 'Título', body: 'Texto' }] }, [
      'steps',
      0,
      'anchorKey',
    ]);
  });

  it.each([
    ['multiline emphasis', '*ênfase\ncontinua*'],
    ['multiline strong emphasis', '**ênfase\ncontinua**'],
    ['multiline underscore emphasis', '_ênfase\r\ncontinua_'],
    ['tables without outer pipes', 'Item | Quantidade\n--- | ---\nMadeira | 1'],
    ['tables with aligned columns', 'Item | Quantidade\r\n:--- | ---:\r\nMadeira | 1'],
  ])('rejects Markdown %s in either editorial field', (_description, text) => {
    for (const field of ['title', 'body']) {
      expectInvalid({ ...update, steps: [{ ...step, [field]: text }] }, ['steps', 0, field]);
    }
  });

  it('accepts plain multiline prose and pipes without Markdown table delimiters', () => {
    const body = 'Compare item | quantidade.\nUse o estoque disponível.';
    expect(
      parseTutorialGuideUpdate('market', 'pt-BR', {
        ...update,
        steps: [{ ...step, body }],
      }).steps[0]?.body,
    ).toBe(body);
  });

  it('accepts prose with different emphasis symbols on separate lines', () => {
    const body = 'Use * para marcar favoritos.\nA opção _ fica ativa no painel.';
    expect(
      parseTutorialGuideUpdate('market', 'pt-BR', {
        ...update,
        steps: [{ ...step, body }],
      }).steps[0]?.body,
    ).toBe(body);
  });
});
