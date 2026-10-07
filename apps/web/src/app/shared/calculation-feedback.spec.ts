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
      error: 'O arquivo não é um JSON válido.',
    });
    expect(validationMessage(new Error('Campo inválido'))).toBe('Campo inválido');
  });
});
