import { describe, expect, it } from 'vitest';

import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('aggregates requests by bounded method, route template and status class', () => {
    const metrics = new MetricsService();
    metrics.recordHttpRequest('GET', '/api/v1/items/:itemId/recipes', 200, 40);
    metrics.recordHttpRequest('GET', '/api/v1/items/:itemId/recipes', 404, 260);

    const output = metrics.render();
    expect(output).toContain(
      'black_market_http_requests_total{method="GET",route="/api/v1/items/:itemId/recipes",status_class="2xx"} 1',
    );
    expect(output).toContain(
      'black_market_http_requests_total{method="GET",route="/api/v1/items/:itemId/recipes",status_class="4xx"} 1',
    );
    expect(output).toContain('black_market_http_request_duration_seconds_count');
  });

  it('does not expose arbitrary methods, raw paths, query strings or user data as labels', () => {
    const metrics = new MetricsService();
    metrics.recordHttpRequest('BREW', '/profile/alice@example.com?token=secret', 201, 12);

    const output = metrics.render();
    expect(output).toContain('method="OTHER",route="unmatched"');
    expect(output).not.toContain('alice@example.com');
    expect(output).not.toContain('token=secret');
    expect(output).not.toContain('BREW');
  });

  it('renders database health, process gauges and valid Prometheus text framing', () => {
    const metrics = new MetricsService();
    metrics.setDatabaseReady(true);

    const output = metrics.render();
    expect(output).toMatch(/^# HELP black_market_database_ready/m);
    expect(output).toMatch(/^black_market_database_ready 1$/m);
    expect(output).toMatch(/^process_uptime_seconds [0-9.]+$/m);
    expect(output).toMatch(/^process_resident_memory_bytes [0-9]+$/m);
    expect(output.endsWith('\n')).toBe(true);
  });

  it('escapes route label metacharacters and folds oversized routes into one series', () => {
    const metrics = new MetricsService();
    metrics.recordHttpRequest('GET', '/api/v1/search/"\nsecret', 200, 1);
    metrics.recordHttpRequest('GET', '/' + 'x'.repeat(200), 200, 1);

    const output = metrics.render();
    expect(output).not.toContain('secret');
    expect(output).toContain('route="unmatched"');
  });
});
