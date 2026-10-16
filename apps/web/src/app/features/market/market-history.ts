import type { MarketHistoryPoint } from './market-api';

export const MARKET_REFRESH_MS = 8 * 60_000;
export const MAX_OBSERVATION_GAP_MS = 2 * MARKET_REFRESH_MS;
export type HistoryMetric = 'price' | 'stock' | 'volume';
export interface HistoryObservation {
  fetchedAt: string;
  value: bigint | null;
  connected: boolean;
  intervalMinutes?: number;
}
export interface MarketChartPoint extends HistoryObservation {
  x: number;
  y: number | null;
}
export interface MarketChart {
  segments: string[];
  chartPoints: MarketChartPoint[];
  dots: {
    x: number;
    y: number;
    fetchedAt: string;
    value: bigint;
    intervalMinutes?: number;
  }[];
  valueTicks: { y: number; value: bigint }[];
  timeTicks: { x: number; fetchedAt: string }[];
  min: bigint | null;
  max: bigint | null;
  samples: number;
  startAt: string;
  endAt: string;
}

const integer = (value: unknown): bigint | null =>
  typeof value === 'string' && /^\d{1,24}$/.test(value)
    ? BigInt(value)
    : typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
      ? BigInt(value)
      : null;

function ordered(points: MarketHistoryPoint[]): MarketHistoryPoint[] {
  const observations = new Map<number, MarketHistoryPoint>();
  const conflicts = new Set<number>();
  for (const point of points) {
    const time = Date.parse(point.fetchedAt);
    if (!Number.isFinite(time) || conflicts.has(time)) continue;
    const held = observations.get(time);
    if (
      held &&
      (held.price !== point.price ||
        held.stock !== point.stock ||
        held.totalTrades !== point.totalTrades)
    ) {
      // Same instant with incompatible snapshots: preserve the gap, never choose a winner.
      observations.set(time, {
        fetchedAt: point.fetchedAt,
        price: null,
        stock: null,
        totalTrades: null,
      });
      conflicts.add(time);
    } else observations.set(time, point);
  }
  return [...observations.values()].sort(
    (a, b) => Date.parse(a.fetchedAt) - Date.parse(b.fetchedAt),
  );
}

export function historyObservations(
  points: MarketHistoryPoint[],
  metric: HistoryMetric,
): HistoryObservation[] {
  const samples = ordered(points);
  return samples.map((point, index) => {
    const prior = samples[index - 1];
    const elapsed = prior ? Date.parse(point.fetchedAt) - Date.parse(prior.fetchedAt) : 0;
    const connected = !!prior && elapsed > 0 && elapsed <= MAX_OBSERVATION_GAP_MS;
    if (metric !== 'volume') {
      const value = integer(metric === 'price' ? point.price : point.stock);
      const priorValue = prior ? integer(metric === 'price' ? prior.price : prior.stock) : null;
      return {
        fetchedAt: point.fetchedAt,
        value,
        connected: connected && value !== null && priorValue !== null,
      };
    }
    const current = integer(point.totalTrades),
      previous = integer(prior?.totalTrades);
    return {
      fetchedAt: point.fetchedAt,
      value:
        connected && current !== null && previous !== null && current >= previous
          ? current - previous
          : null,
      connected,
      intervalMinutes: elapsed / 60_000,
    };
  });
}

export function marketChart(observations: HistoryObservation[], zeroBaseline = false): MarketChart {
  const valid = observations.filter(
    (point): point is HistoryObservation & { value: bigint } => point.value !== null,
  );
  const empty = {
    segments: [] as string[],
    chartPoints: [] as MarketChartPoint[],
    dots: [] as {
      x: number;
      y: number;
      fetchedAt: string;
      value: bigint;
      intervalMinutes?: number;
    }[],
    valueTicks: [] as { y: number; value: bigint }[],
    timeTicks: [] as { x: number; fetchedAt: string }[],
    min: null as bigint | null,
    max: null as bigint | null,
    samples: valid.length,
    startAt: '',
    endAt: '',
  };
  if (!valid.length) return empty;
  const min = zeroBaseline
    ? 0n
    : valid.reduce((value, point) => (point.value < value ? point.value : value), valid[0].value);
  const max = valid.reduce(
    (value, point) => (point.value > value ? point.value : value),
    valid[0].value,
  );
  const firstAt = Date.parse(valid[0].fetchedAt),
    lastAt = Date.parse(valid.at(-1)!.fetchedAt),
    span = Math.max(lastAt - firstAt, 1);
  const valueTicks =
    min === max
      ? [{ y: 108, value: min }]
      : [
          { y: 176, value: min },
          { y: 108, value: min + (max - min) / 2n },
          { y: 40, value: max },
        ];
  const timeIndexes = [...new Set([0, Math.floor((valid.length - 1) / 2), valid.length - 1])];
  const timeTicks = timeIndexes.map((index) => ({
    x: 72 + Math.round(((Date.parse(valid[index].fetchedAt) - firstAt) / span) * 612),
    fetchedAt: valid[index].fetchedAt,
  }));
  const chartPoints = observations.map(
    (point): MarketChartPoint => ({
      ...point,
      x: Date.parse(point.fetchedAt),
      y:
        point.value === null
          ? null
          : max === min
            ? zeroBaseline
              ? 0
              : 500
            : Number(((point.value - min) * 1000n) / (max - min)),
    }),
  );
  const segments: string[][] = [];
  const dots: typeof empty.dots = [];
  let segment: string[] | null = null;
  for (const point of observations) {
    if (point.value === null) {
      segment = null;
      continue;
    }
    const x = 72 + Math.round(((Date.parse(point.fetchedAt) - firstAt) / span) * 612);
    const relative =
      max === min
        ? zeroBaseline
          ? 0
          : 0.5
        : Number(((point.value - min) * 1000n) / (max - min)) / 1000;
    const y = 176 - Math.round(relative * 136);
    if (!segment || !point.connected) {
      segment = [];
      segments.push(segment);
    }
    segment.push(`${x},${y}`);
    dots.push({
      x,
      y,
      fetchedAt: point.fetchedAt,
      value: point.value,
      intervalMinutes: point.intervalMinutes,
    });
  }
  return {
    segments: segments.map((segment) => segment.join(' ')),
    chartPoints,
    dots,
    valueTicks,
    timeTicks,
    min,
    max,
    samples: valid.length,
    startAt: valid[0].fetchedAt,
    endAt: valid.at(-1)!.fetchedAt,
  };
}
