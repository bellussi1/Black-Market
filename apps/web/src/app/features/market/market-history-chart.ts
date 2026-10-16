import { isPlatformBrowser } from '@angular/common';
import type { ElementRef, OnDestroy } from '@angular/core';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import type * as ChartJsModule from 'chart.js';
import type { Chart as ChartInstance, ChartConfiguration } from 'chart.js';

import type { HistoryMetric, MarketChart, MarketChartPoint } from './market-history';

interface ChartPoint {
  x: number;
  y: number | null;
  fetchedAt: string;
  value: bigint | null;
  connected: boolean;
  intervalMinutes?: number;
}

type ChartRows = ChartPoint[];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-market-history-chart',
  templateUrl: './market-history-chart.html',
  styleUrl: './market-history-chart.scss',
})
export class MarketHistoryChart implements OnDestroy {
  readonly chartData = input.required<MarketChart>();
  readonly metric = input.required<HistoryMetric>();
  readonly label = input.required<string>();
  readonly dateLabel = input.required<(value: string) => string>();
  readonly valueLabel = input.required<(value: bigint) => string>();
  readonly intervalLabel = input.required<(minutes: number | undefined) => string>();
  readonly chartReady = signal(false);
  readonly chartFailed = signal(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chartApi: typeof ChartJsModule | null = null;
  private chart: ChartInstance<'line', ChartRows> | null = null;
  private disposed = false;

  constructor() {
    afterNextRender(() => void this.loadChart());
    effect(() => {
      this.chartData();
      this.metric();
      this.label();
      if (this.chartApi) this.renderChart();
    });
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.chart?.destroy();
    this.chart = null;
  }

  private async loadChart(): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.disposed || this.chartApi) return;
    try {
      const chartApi = await import('chart.js');
      if (this.disposed) return;
      chartApi.Chart.register(
        chartApi.LineController,
        chartApi.LineElement,
        chartApi.PointElement,
        chartApi.LinearScale,
        chartApi.Tooltip,
      );
      this.chartApi = chartApi;
      this.renderChart();
    } catch {
      this.chartFailed.set(true);
    }
  }

  private renderChart(): void {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas || !this.chartApi || this.disposed) return;

    this.chart?.destroy();
    this.chart = null;
    this.chartFailed.set(false);
    const model = this.chartData();
    const metric = this.metric();
    const points = this.toChartRows(model.chartPoints, metric);
    const firstTimestamp = Date.parse(model.startAt);
    const lastTimestamp = Date.parse(model.endAt);
    const styles = getComputedStyle(canvas);
    const accent = styles.getPropertyValue('--bm-accent').trim() || '#d6b26c';
    const muted = styles.getPropertyValue('--bm-muted').trim() || '#b9b2a6';
    const text = styles.getPropertyValue('--bm-text').trim() || '#eee7da';
    const border = styles.getPropertyValue('--bm-border').trim() || '#514b41';
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const denseRadius = model.samples > 180 ? 1 : model.samples > 60 ? 1.75 : 3;

    const configuration: ChartConfiguration<'line', ChartRows> = {
      type: 'line',
      data: {
        datasets: [
          {
            label: this.label(),
            data: points,
            parsing: false,
            normalized: true,
            borderColor: accent,
            backgroundColor: accent,
            borderWidth: 2,
            pointRadius: (ctx) => {
              const idx = ctx.dataIndex;
              const current = points[idx];
              if (!current || current.y === null) return 0;
              const prev = points[idx - 1];
              const next = points[idx + 1];
              const prevConnected = !!prev && prev.y !== null && current.connected;
              const nextConnected = !!next && next.y !== null && next.connected;
              return !prevConnected || !nextConnected ? 3 : denseRadius;
            },
            pointHoverRadius: (ctx) => (points[ctx.dataIndex]?.y === null ? 0 : 5),
            pointHitRadius: 10,
            tension: 0,
            spanGaps: false,
            segment: {
              borderDash: ({ p1DataIndex }) => (points[p1DataIndex]?.connected ? [] : [6, 5]),
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: reducedMotion ? false : { duration: 180 },
        interaction: { mode: 'nearest', intersect: false, axis: 'x' },
        scales: {
          x: {
            type: 'linear',
            min: firstTimestamp,
            max: Math.max(lastTimestamp, firstTimestamp + 1),
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: muted,
              autoSkip: true,
              maxTicksLimit: 3,
              maxRotation: 0,
              callback: (value) => {
                const instant = new Date(Number(value));
                return Number.isNaN(instant.getTime())
                  ? ''
                  : this.dateLabel()(instant.toISOString());
              },
            },
          },
          y: {
            type: 'linear',
            min: 0,
            max: 1000,
            grid: { color: `${border}66` },
            border: { display: false },
            ticks: {
              color: muted,
              stepSize: 500,
              callback: (value) => this.valueAtTick(Number(value), model),
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            backgroundColor: '#1b1e24',
            borderColor: border,
            borderWidth: 1,
            titleColor: text,
            bodyColor: text,
            filter: (item) => {
              const point = item.raw as ChartPoint | undefined;
              return !!point && point.value !== null && point.y !== null;
            },
            callbacks: {
              title: (items) => {
                const point = items[0]?.raw as ChartPoint | undefined;
                return point && point.value !== null ? this.dateLabel()(point.fetchedAt) : '';
              },
              label: (item) => {
                const point = item.raw as ChartPoint | undefined;
                if (!point || point.value === null) return '';
                const value = this.valueLabel()(point.value);
                return this.metric() === 'volume'
                  ? `${value} · ${this.intervalLabel()(point.intervalMinutes)}`
                  : value;
              },
            },
          },
        },
      },
    };

    try {
      this.chart = new this.chartApi.Chart(canvas, configuration);
      this.chartReady.set(true);
    } catch {
      this.chartReady.set(false);
      this.chartFailed.set(true);
    }
  }

  private toChartRows(points: MarketChartPoint[], metric: HistoryMetric): ChartRows {
    if (metric !== 'volume') {
      return points
        .filter(
          (point): point is MarketChartPoint & { value: bigint; y: number } =>
            point.value !== null && point.y !== null && Number.isFinite(point.x),
        )
        .map((point) => ({
          x: point.x,
          y: point.y,
          fetchedAt: point.fetchedAt,
          value: point.value,
          connected: point.connected,
          intervalMinutes: point.intervalMinutes,
        }));
    }
    return points
      .filter((point) => Number.isFinite(point.x))
      .map((point) => ({
        x: point.x,
        y: point.value === null || point.y === null ? null : point.y,
        fetchedAt: point.fetchedAt,
        value: point.value,
        connected: point.connected && point.value !== null,
        intervalMinutes: point.intervalMinutes,
      }));
  }

  private valueAtTick(tick: number, model: MarketChart): string {
    const min = model.min;
    const max = model.max;
    if (min === null || max === null) return '';
    if (min === max && tick !== 500) return '';
    const step = BigInt(Math.max(0, Math.min(1000, Math.round(tick))));
    const value = min + ((max - min) * step) / 1000n;
    return this.valueLabel()(value);
  }
}
