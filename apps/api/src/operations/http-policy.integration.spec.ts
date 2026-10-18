import { Body, Controller, Module, Post } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { apiCorsOptions, jsonRequest } from './http-policy';
import { MetricsService } from './metrics.service';
import { requestControls } from './request-controls';
import { SafeExceptionFilter } from './safe-exception.filter';

class FixtureController {
  calculate(body: unknown) {
    return { bytes: JSON.stringify(body)?.length ?? 0 };
  }
  workspace(body: unknown) {
    return { bytes: JSON.stringify(body)?.length ?? 0 };
  }
  failure() {
    throw new Error('postgres://admin:private@host/db token=private');
  }
}
Controller('api/v1')(FixtureController);
for (const [method, path] of [
  ['calculate', 'calculators/fixture'],
  ['workspace', 'workspace'],
  ['failure', 'calculators/failure'],
] as const) {
  Post(path)(
    FixtureController.prototype,
    method,
    Object.getOwnPropertyDescriptor(FixtureController.prototype, method)!,
  );
  Body()(FixtureController.prototype, method, 0);
}
class FixtureModule {}
Module({ controllers: [FixtureController] })(FixtureModule);

describe('HTTP security through the native Nest adapter', () => {
  let app: NestExpressApplication;
  let url: string;
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const metrics = new MetricsService();
  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(FixtureModule, {
      logger: false,
      bodyParser: false,
    });
    app.enableCors(apiCorsOptions('https://platform.example'));
    app.use(requestControls(logger, 'production', 'https://platform.example', metrics));
    app.useGlobalFilters(new SafeExceptionFilter(logger));
    app.useBodyParser('json', { limit: '256kb', type: (request) => jsonRequest(request, false) });
    app.useBodyParser('json', { limit: '20mb', type: (request) => jsonRequest(request, true) });
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  }, 30000);
  afterAll(async () => {
    await app?.close();
  }, 30000);
  it('keeps CORS headers on rate limit responses for the allowed UI', async () => {
    let response: Response | undefined;
    for (let i = 0; i <= 10; i++)
      response = await fetch(url + '/api/v1/telemetry/errors', {
        method: 'POST',
        headers: { Origin: 'https://platform.example', 'content-type': 'application/json' },
        body: '{}',
      });
    expect(response?.status).toBe(429);
    expect(response?.headers.get('access-control-allow-origin')).toBe('https://platform.example');
    expect(response?.headers.get('retry-after')).toBe('60');
  });
  it('records route templates without query-string values', async () => {
    await fetch(url + '/api/v1/calculators/fixture?token=private', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{}',
    });
    const output = metrics.render();
    expect(output).toContain(
      'black_market_http_requests_total{method="POST",route="/api/v1/calculators/fixture",status_class="2xx"} 1',
    );
    expect(output).not.toContain('token=private');
  });
  it('enforces body limits without reducing the personal backup limit', async () => {
    const body = JSON.stringify({ data: 'x'.repeat(300000) });
    const common = await fetch(url + '/api/v1/calculators/fixture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    expect(common.status).toBe(413);
    expect(await common.text()).not.toContain('xxxx');
    const workspace = await fetch(url + '/api/v1/workspace', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    expect(workspace.status).toBe(201);
    const oversized = await fetch(url + '/api/v1/workspace', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ data: 'x'.repeat(21 * 1024 * 1024) }),
    });
    expect(oversized.status).toBe(413);
  });
  it('handles CORS and rejects foreign workspace writes', async () => {
    const allowed = await fetch(url + '/api/v1/calculators/fixture', {
      method: 'OPTIONS',
      headers: { Origin: 'https://platform.example', 'Access-Control-Request-Method': 'POST' },
    });
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://platform.example');
    expect(allowed.headers.get('access-control-allow-credentials')).toBe('true');
    const foreign = await fetch(url + '/api/v1/workspace', {
      method: 'POST',
      headers: { Origin: 'https://evil.test', 'content-type': 'application/json' },
      body: '{}',
    });
    expect(foreign.status).toBe(403);
    expect(foreign.headers.get('access-control-allow-origin')).toBeNull();
    expect(foreign.headers.get('access-control-allow-credentials')).toBeNull();
  });
  it('returns safe JSON errors and security headers', async () => {
    const response = await fetch(url + '/api/v1/calculators/fixture', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{"secret":',
    });
    expect(response.status).toBe(400);
    expect(await response.text()).not.toContain('secret');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'none'");
    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000');
    expect(response.headers.get('x-request-id')).toMatch(/^[a-f0-9-]{36}$/);
  });
  it('correlates safe global exception logs with the response and forbids error caching', async () => {
    logger.error.mockClear();
    const response = await fetch(url + '/api/v1/calculators/failure?token=private', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Request-ID': 'private' },
      body: '{}',
    });
    expect(response.status).toBe(500);
    expect(response.headers.get('cache-control')).toBe('no-store');
    const body = (await response.json()) as { requestId: string };
    expect(body.requestId).toBe(response.headers.get('x-request-id'));
    expect(logger.error).toHaveBeenCalledWith({
      event: 'http_exception',
      requestId: body.requestId,
      status: 500,
      cause: 'InternalError',
    });
    expect(JSON.stringify(body)).not.toContain('private');
    expect(JSON.stringify(logger.error.mock.calls)).not.toContain('private');
  });
});
