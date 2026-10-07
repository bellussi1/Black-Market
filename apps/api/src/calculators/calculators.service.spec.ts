import { describe, expect, it } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CalculatorsService } from './calculators.service';

describe('CalculatorsService', () => {
  const service = new CalculatorsService();
  it('rejects unknown names including prototype properties', () => {
    expect(() => service.calculate('__proto__', {})).toThrow(NotFoundException);
    expect(() => service.calculate('constructor', {})).toThrow(
      NotFoundException,
    );
  });
  it('maps validation failures to HTTP 400', () => {
    expect(() => service.calculate('market', { price: '-5' })).toThrow(
      BadRequestException,
    );
  });
  it('serializes integer silver safely', () => {
    const result = service.calculate('market', {
      price: '100',
      quantity: 1,
      cost: '0',
      taxPercent: 35,
      valuePack: true,
      collectionBonus: 0,
      exempt: false,
    });
    expect(JSON.stringify(result)).toContain('"net":"84"');
  });
});
