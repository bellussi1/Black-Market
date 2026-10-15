import { describe, expect, it } from 'vitest';

import type { MarketHistoryPoint } from './market-api';
import { historyObservations, marketChart, MAX_OBSERVATION_GAP_MS } from './market-history';

const point = (minutes: number, trades: string | null, stock = 10): MarketHistoryPoint => ({
  fetchedAt: new Date(minutes * 60_000).toISOString(),
  price: '1000',
  stock,
  totalTrades: trades,
});

describe('observed market activity', () => {
  it('draws zero observed volume on the zero baseline while keeping constant prices centered', () => {
    const points = [point(0, '100'), point(8, '100'), point(16, '100')];
    const volume = marketChart(historyObservations(points, 'volume'), true);
    expect(volume.dots.map((dot) => dot.y)).toEqual([176, 176]);
    expect(volume.min).toBe(0n);
    expect(volume.max).toBe(0n);
    expect(marketChart(historyObservations(points, 'price')).dots.map((dot) => dot.y)).toEqual([
      108, 108, 108,
    ]);
  });

  it('exposes value and time ticks for interpreting the chart axes', () => {
    const points = [
      { ...point(0, '10'), price: '100' },
      { ...point(30, '20'), price: '200' },
      { ...point(60, '30'), price: '300' },
    ];
    const chart = marketChart(historyObservations(points, 'price'));

    expect(chart.valueTicks).toEqual([
      { y: 176, value: 100n },
      { y: 108, value: 200n },
      { y: 40, value: 300n },
    ]);
    expect(chart.timeTicks.map((tick) => tick.x)).toEqual([72, 378, 684]);
    expect(chart.timeTicks.map((tick) => tick.fetchedAt)).toEqual(
      points.map((entry) => entry.fetchedAt),
    );
  });

  it('uses one readable value tick when the observed metric is constant', () => {
    const chart = marketChart(historyObservations([point(0, '10'), point(8, '11')], 'price'));

    expect(chart.valueTicks).toEqual([{ y: 108, value: 1000n }]);
  });

  it('uses counter differences without connecting missing intervals or counter resets', () => {
    const points = [
      point(0, '100'),
      point(8, '105'),
      point(40, '110'),
      point(48, '3'),
      point(56, '7'),
    ];
    expect(historyObservations(points, 'volume').map((entry) => entry.value)).toEqual([
      null,
      5n,
      null,
      null,
      4n,
    ]);
    expect(marketChart(historyObservations(points, 'price')).segments).toHaveLength(2);
    expect(MAX_OBSERVATION_GAP_MS).toBe(16 * 60_000);
  });
  it('keeps missing values and long gaps visible instead of drawing across them', () => {
    const points = [
      point(0, '10'),
      { ...point(8, '20'), price: null },
      point(16, '30'),
      point(24, '40'),
    ];
    expect(marketChart(historyObservations(points, 'price')).segments).toHaveLength(2);
    expect(marketChart(historyObservations(points, 'price')).samples).toBe(3);
  });
  it('invalidates conflicting duplicate timestamps instead of selecting an arbitrary counter', () => {
    const points = Array.from({ length: 181 }, (_, index) =>
      point(index * 8, String(100 + index), 90),
    );
    points.push({ ...points[80], totalTrades: '181' });
    expect(historyObservations(points, 'price')[80].value).toBeNull();
    expect(historyObservations(points, 'volume')[81].value).toBeNull();
  });
});
