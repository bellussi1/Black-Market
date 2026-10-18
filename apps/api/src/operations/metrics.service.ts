import { Injectable } from '@nestjs/common';

const HTTP_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);
const HISTOGRAM_BUCKETS_SECONDS = [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] as const;

type RequestLabels = { method: string; route: string; statusClass: string };
type RequestHistogram = {
  method: string;
  route: string;
  bucketCounts: number[];
  count: number;
  sum: number;
};

function normalizeMethod(method: string): string {
  const normalized = method.toUpperCase();
  return HTTP_METHODS.has(normalized) ? normalized : 'OTHER';
}

function normalizeRoute(route: string): string {
  return route.length <= 120 && route.startsWith('/') && /^\/[A-Za-z0-9_:/.*-]*$/.test(route)
    ? route
    : 'unmatched';
}

function normalizeStatusClass(statusCode: number): string {
  return Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599
    ? `${Math.floor(statusCode / 100)}xx`
    : 'other';
}

function escapeLabel(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}

function labels(input: Record<string, string>): string {
  return `{${Object.entries(input)
    .map(([name, value]) => `${name}="${escapeLabel(value)}"`)
    .join(',')}}`;
}

@Injectable()
export class MetricsService {
  private readonly requests = new Map<string, { labels: RequestLabels; count: number }>();
  private readonly durations = new Map<string, RequestHistogram>();
  private databaseReady = false;

  recordHttpRequest(method: string, route: string, statusCode: number, durationMs: number): void {
    const normalized: RequestLabels = {
      method: normalizeMethod(method),
      route: normalizeRoute(route),
      statusClass: normalizeStatusClass(statusCode),
    };
    const requestKey = JSON.stringify(normalized);
    const request = this.requests.get(requestKey) ?? { labels: normalized, count: 0 };
    request.count++;
    this.requests.set(requestKey, request);

    const histogramKey = JSON.stringify({ method: normalized.method, route: normalized.route });
    const histogram = this.durations.get(histogramKey) ?? {
      method: normalized.method,
      route: normalized.route,
      bucketCounts: HISTOGRAM_BUCKETS_SECONDS.map(() => 0),
      count: 0,
      sum: 0,
    };
    const durationSeconds = Number.isFinite(durationMs) ? Math.max(0, durationMs) / 1000 : 0;
    histogram.count++;
    histogram.sum += durationSeconds;
    HISTOGRAM_BUCKETS_SECONDS.forEach((bound, index) => {
      if (durationSeconds <= bound) histogram.bucketCounts[index]++;
    });
    this.durations.set(histogramKey, histogram);
  }

  setDatabaseReady(ready: boolean): void {
    this.databaseReady = ready;
  }

  render(): string {
    const lines = [
      '# HELP black_market_http_requests_total Completed HTTP requests grouped by route template.',
      '# TYPE black_market_http_requests_total counter',
    ];
    for (const request of [...this.requests.values()].sort((a, b) =>
      JSON.stringify(a.labels).localeCompare(JSON.stringify(b.labels)),
    )) {
      lines.push(
        `black_market_http_requests_total${labels({
          method: request.labels.method,
          route: request.labels.route,
          status_class: request.labels.statusClass,
        })} ${request.count}`,
      );
    }

    lines.push(
      '# HELP black_market_http_request_duration_seconds HTTP request duration in seconds.',
      '# TYPE black_market_http_request_duration_seconds histogram',
    );
    for (const histogram of [...this.durations.values()].sort((a, b) =>
      JSON.stringify([a.method, a.route]).localeCompare(JSON.stringify([b.method, b.route])),
    )) {
      let cumulative = 0;
      HISTOGRAM_BUCKETS_SECONDS.forEach((bound, index) => {
        cumulative += histogram.bucketCounts[index];
        lines.push(
          `black_market_http_request_duration_seconds_bucket${labels({
            method: histogram.method,
            route: histogram.route,
            le: String(bound),
          })} ${cumulative}`,
        );
      });
      lines.push(
        `black_market_http_request_duration_seconds_bucket${labels({
          method: histogram.method,
          route: histogram.route,
          le: '+Inf',
        })} ${histogram.count}`,
        `black_market_http_request_duration_seconds_sum${labels({ method: histogram.method, route: histogram.route })} ${histogram.sum}`,
        `black_market_http_request_duration_seconds_count${labels({ method: histogram.method, route: histogram.route })} ${histogram.count}`,
      );
    }

    const memory = process.memoryUsage();
    lines.push(
      '# HELP black_market_database_ready Whether the application can query its PostgreSQL database.',
      '# TYPE black_market_database_ready gauge',
      `black_market_database_ready ${this.databaseReady ? 1 : 0}`,
      '# HELP process_uptime_seconds Node.js process uptime in seconds.',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds ${process.uptime()}`,
      '# HELP process_resident_memory_bytes Resident memory size in bytes.',
      '# TYPE process_resident_memory_bytes gauge',
      `process_resident_memory_bytes ${memory.rss}`,
      '# HELP process_heap_used_bytes V8 heap used in bytes.',
      '# TYPE process_heap_used_bytes gauge',
      `process_heap_used_bytes ${memory.heapUsed}`,
      '',
    );
    return lines.join('\n');
  }
}
