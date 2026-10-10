export interface MarketObservation {
  fetchedAt: Date | string;
  payload: Record<string, unknown>;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function integer(value: unknown): bigint | null {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) return null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  return /^\d{1,24}$/.test(text) ? BigInt(text) : null;
}

export function observedMarketStatistics(rows: MarketObservation[], now: number) {
  const byTime = new Map<number, { time: number; counter: bigint | null; price: bigint | null }>();
  for (const row of rows) {
    const time = new Date(row.fetchedAt).getTime();
    if (!Number.isFinite(time) || time > now || time < now - 30 * DAY - HOUR) continue;
    const point = {
      time,
      counter: integer(row.payload['totalTrades']),
      price: integer(row.payload['price']),
    };
    const previous = byTime.get(time);
    if (previous && (previous.counter !== point.counter || previous.price !== point.price)) {
      byTime.set(time, { time, counter: null, price: null });
    } else if (!previous) byTime.set(time, point);
  }
  const points = [...byTime.values()].sort((a, b) => a.time - b.time);
  const prices = points.filter(
    (point) => point.time >= now - 30 * DAY && point.price !== null && point.price > 0n,
  );

  const volume = (days: number): string | null => {
    const start = now - days * DAY;
    const baseline = points.findLastIndex((point) => point.time <= start);
    if (baseline < 0 || start - points[baseline].time > HOUR) return null;
    const window = points.slice(baseline);
    if (window.length < 2 || now - window[window.length - 1].time > HOUR) return null;
    for (let index = 0; index < window.length; index++) {
      const point = window[index];
      if (point.counter === null) return null;
      if (index > 0) {
        const previous = window[index - 1];
        if (point.time - previous.time > HOUR || point.counter < previous.counter!) return null;
      }
    }
    return String(window[window.length - 1].counter! - window[0].counter!);
  };

  return {
    meanPrice:
      prices.length >= 2
        ? String(prices.reduce((sum, point) => sum + point.price!, 0n) / BigInt(prices.length))
        : null,
    volume24h: volume(1),
    volume15d: volume(15),
    volume30d: volume(30),
    observationCount: prices.length,
    observedFrom: prices.length ? new Date(prices[0].time).toISOString() : null,
    observedTo: prices.length ? new Date(prices[prices.length - 1].time).toISOString() : null,
  };
}
