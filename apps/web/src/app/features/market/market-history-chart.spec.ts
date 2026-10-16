import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import type { MarketHistoryPoint } from './market-api';
import { type HistoryMetric, historyObservations, marketChart } from './market-history';
import {
  createMarketHistoryCrosshairPlugin,
  marketChartAreaStyle,
  MarketHistoryChart,
} from './market-history-chart';

const samplePoint = (
  minutes: number,
  price: string | null,
  stock: number,
  trades: string | null,
): MarketHistoryPoint => ({
  fetchedAt: new Date(minutes * 60_000).toISOString(),
  price,
  stock,
  totalTrades: trades,
});

@Component({
  imports: [MarketHistoryChart],
  template: `
    <app-market-history-chart
      [chartData]="chartData"
      [metric]="metric"
      [label]="label"
      [dateLabel]="dateLabel"
      [valueLabel]="valueLabel"
      [intervalLabel]="intervalLabel"
    />
  `,
})
class HostComponent {
  points: MarketHistoryPoint[] = [
    samplePoint(0, '86500000', 50, '100'),
    samplePoint(8, '86500000', 48, '103'),
    samplePoint(40, '72000000', 12, '110'),
    samplePoint(48, '72000000', 9, '114'),
  ];
  metric: HistoryMetric = 'price';
  label = 'Preço de venda';
  chartData = marketChart(historyObservations(this.points, 'price'));
  readonly dateLabel = (iso: string) => iso;
  readonly valueLabel = (val: bigint) => val.toString();
  readonly intervalLabel = (mins: number | undefined) => `${mins ?? 0} min`;
}

describe('MarketHistoryChart', () => {
  it('fills the selected series to its origin with a restrained project-bronze gradient', () => {
    expect(marketChartAreaStyle('#d8b978')).toEqual({
      fill: 'origin',
      borderColor: '#d8b978',
      gradientTop: 'rgba(216, 185, 120, 0.28)',
      gradientBottom: 'rgba(216, 185, 120, 0.02)',
      guideColor: 'rgba(216, 185, 120, 0.78)',
    });
  });

  it('draws a dotted guide through the active point and chart plot only', () => {
    const calls: unknown[][] = [];
    const context = {
      save: () => calls.push(['save']),
      beginPath: () => calls.push(['beginPath']),
      setLineDash: (dash: number[]) => calls.push(['setLineDash', dash]),
      moveTo: (x: number, y: number) => calls.push(['moveTo', x, y]),
      lineTo: (x: number, y: number) => calls.push(['lineTo', x, y]),
      stroke: () => calls.push(['stroke']),
      restore: () => calls.push(['restore']),
    };
    const plugin = createMarketHistoryCrosshairPlugin('#d8b978');
    const chart = {
      ctx: context,
      chartArea: { top: 14, bottom: 236 },
      tooltip: { getActiveElements: () => [{ element: { x: 123 } }] },
    };

    plugin.afterDatasetsDraw?.(chart as never, {} as never, {}, false);

    expect(calls).toContainEqual(['setLineDash', [2, 4]]);
    expect(calls).toContainEqual(['moveTo', 123, 14]);
    expect(calls).toContainEqual(['lineTo', 123, 236]);
  });

  it('renders price and volume series including null gap points without throwing', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const chartComponent = fixture.debugElement.children[0].componentInstance as MarketHistoryChart;

    const priceRows = (
      chartComponent as unknown as {
        toChartRows: (
          points: typeof fixture.componentInstance.chartData.chartPoints,
          metric: HistoryMetric,
        ) => { x: number; y: number | null; value: bigint | null; connected: boolean }[];
      }
    ).toChartRows(fixture.componentInstance.chartData.chartPoints, 'price');

    expect(priceRows).toHaveLength(4);
    expect(priceRows.map((row) => row.connected)).toEqual([false, true, false, true]);

    const volumeChart = marketChart(
      historyObservations(fixture.componentInstance.points, 'volume'),
      true,
    );
    const volumeRows = (
      chartComponent as unknown as {
        toChartRows: (
          points: typeof volumeChart.chartPoints,
          metric: HistoryMetric,
        ) => { x: number; y: number | null; value: bigint | null; connected: boolean }[];
      }
    ).toChartRows(volumeChart.chartPoints, 'volume');

    expect(volumeRows).toHaveLength(4);
    expect(volumeRows.every((row) => row !== null && Number.isFinite(row.x))).toBe(true);
    expect(volumeRows.map((row) => row.value)).toEqual([null, 3n, null, 4n]);
    expect(volumeRows.map((row) => row.y === null)).toEqual([true, false, true, false]);
  });
});
