import { describe, expect, it } from 'vitest';

import { evaluate, validationMessage } from './calculation-feedback';

describe('calculation feedback', () => {
  it('wraps a successful result', () => {
    expect(evaluate(() => '845000')).toEqual({ value: '845000', error: null });
  });
  it('converts invalid input into a user-facing error', () => {
    expect(
      evaluate(() => {
        throw new SyntaxError('input');
      }),
    ).toEqual({
      value: null,
      error: 'Não foi possível abrir este arquivo. Escolha um backup do Black Market.',
    });
    expect(validationMessage(new Error('Campo inválido'))).toBe(
      'Não foi possível concluir. Confira os dados informados e tente novamente.',
    );
  });
});
