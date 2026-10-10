import { describe, expect, it } from 'vitest';

import { observedMarketStatistics } from './market-statistics';

const now = Date.parse('2026-10-09T12:00:00Z');
const hour = 3_600_000;
const points = (hours: number) =>
  Array.from({ length: hours * 2 + 1 }, (_, index) => ({
    fetchedAt: new Date(now - hours * hour + (index * hour) / 2),
    payload: {
      price: index % 2 ? '300' : '100',
      totalTrades: String(90071992547409930n + BigInt(index)),
    },
  }));

describe('observed market statistics', () => {
  it('orders timestamps and subtracts cumulative counters without precision loss', () => {
    const result = observedMarketStatistics(points(24).reverse(), now);
    expect(result.volume24h).toBe('48');
    expect(result.volume15d).toBeNull();
    expect(result.meanPrice).toBe('197');
    expect(result.observationCount).toBe(49);
  });
  it('requires coverage of the entire 15 and 30 day windows', () => {
    expect(observedMarketStatistics(points(720), now)).toMatchObject({
      volume24h: '48',
      volume15d: '720',
      volume30d: '1440',
    });
  });
  it('returns unknown volumes for gaps, counter resets and insufficient baseline', () => {
    const original = points(24);
    const gap = original.filter((_, index) => index < 5 || index > 10);
    const reset = original.map((point, index) =>
      index === 20 ? { ...point, payload: { ...point.payload, totalTrades: '1' } } : point,
    );
    for (const rows of [gap, reset, original.slice(3), original.slice(0, -3)]) {
      expect(observedMarketStatistics(rows, now).volume24h).toBeNull();
    }
  });
  it('ignores invalid/future prices and refuses conflicting or invalid counter observations', () => {
    const original = points(24);
    const invalid = original.map((point, index) =>
      index === 10 ? { ...point, payload: { price: '-4', totalTrades: 'NaN' } } : point,
    );
    expect(observedMarketStatistics(invalid, now)).toMatchObject({
      volume24h: null,
      observationCount: 48,
    });
    const conflict = [...original, { ...original[0], payload: { price: '100', totalTrades: '1' } }];
    expect(observedMarketStatistics(conflict, now).volume24h).toBeNull();
    expect(
      observedMarketStatistics(
        [{ fetchedAt: new Date(now + hour), payload: { price: '100', totalTrades: '1' } }],
        now,
      ).meanPrice,
    ).toBeNull();
  });
});
