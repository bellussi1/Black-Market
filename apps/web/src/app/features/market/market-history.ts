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
    if (metric !== 'volume')
      return {
        fetchedAt: point.fetchedAt,
        value: integer(metric === 'price' ? point.price : point.stock),
        connected,
      };
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

export function liquidityEstimate(
  points: MarketHistoryPoint[],
  now: number,
): { days: number; volume: bigint; stock: bigint; fetchedAt: string } | null {
  const samples = ordered(points).filter((point) => Date.parse(point.fetchedAt) <= now);
  const latest = samples.at(-1);
  if (!latest || now - Date.parse(latest.fetchedAt) > MAX_OBSERVATION_GAP_MS) return null;
  const cutoff = Date.parse(latest.fetchedAt) - 24 * 60 * 60_000;
  let baselineIndex = -1;
  samples.forEach((point, index) => {
    if (Date.parse(point.fetchedAt) <= cutoff) baselineIndex = index;
  });
  if (
    baselineIndex < 0 ||
    cutoff - Date.parse(samples[baselineIndex].fetchedAt) > MAX_OBSERVATION_GAP_MS
  )
    return null;
  const daily = samples.slice(baselineIndex);
  const observations = historyObservations(daily, 'volume').slice(1);
  if (observations.some((point) => point.value === null)) return null;
  const volume = observations.reduce((total, point) => total + point.value!, 0n);
  const stock = integer(latest.stock);
  if (volume <= 0n || stock === null) return null;
  // Normalize the covered interval (up to 16 minutes beyond 24h) to one day.
  const elapsedDays =
    (Date.parse(latest.fetchedAt) - Date.parse(daily[0].fetchedAt)) / (24 * 60 * 60_000);
  const days = (Number(stock) / Number(volume)) * elapsedDays;
  return Number.isFinite(days) ? { days, volume, stock, fetchedAt: latest.fetchedAt } : null;
}

export function marketChart(observations: HistoryObservation[], zeroBaseline = false) {
  const valid = observations.filter(
    (point): point is HistoryObservation & { value: bigint } => point.value !== null,
  );
  const empty = {
    segments: [] as string[],
    dots: [] as {
      x: number;
      y: number;
      fetchedAt: string;
      value: bigint;
      intervalMinutes?: number;
    }[],
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
  const segments: string[][] = [];
  const dots: typeof empty.dots = [];
  let segment: string[] | null = null;
  for (const point of observations) {
    if (point.value === null) {
      segment = null;
      continue;
    }
    const x = 44 + Math.round(((Date.parse(point.fetchedAt) - firstAt) / span) * 640);
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
    dots,
    min,
    max,
    samples: valid.length,
    startAt: valid[0].fetchedAt,
    endAt: valid.at(-1)!.fetchedAt,
  };
}
