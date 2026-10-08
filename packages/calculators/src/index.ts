export type RoundingMode = 'down' | 'up' | 'half-up';
export * from './personal';
export * from './recommendations';
export * from './tools';

const BASIS_POINT_SCALE = 10_000n;

/** Returns the percentage portion of an integer amount, using exact integer math. */
export function percentageOf(
  amount: bigint,
  basisPoints: number,
  rounding: RoundingMode = 'down',
): bigint {
  if (amount < 0n) {
    throw new RangeError('amount must be non-negative');
  }
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0) {
    throw new RangeError('basisPoints must be a non-negative safe integer');
  }

  const numerator = amount * BigInt(basisPoints);
  const quotient = numerator / BASIS_POINT_SCALE;
  const remainder = numerator % BASIS_POINT_SCALE;

  if (rounding === 'up' && remainder > 0n) {
    return quotient + 1n;
  }
  if (rounding === 'half-up' && remainder * 2n >= BASIS_POINT_SCALE) {
    return quotient + 1n;
  }
  return quotient;
}
