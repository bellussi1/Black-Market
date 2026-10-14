import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { requestControls, WindowLimiter } from './request-controls';
import { safeProblem } from './safe-exception.filter';
describe('MVP request controls', () => {
  it('allows a full crafting expansion in its own read bucket while retaining public limits', () => {
    const controls = requestControls(
      { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
      'test',
      'http://localhost:4200',
    );
    const next = vi.fn();
    const response = {
      setHeader: vi.fn(),
      on: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const request = (path: string) => ({ path, method: 'GET', ip: '127.0.0.1', headers: {} });
    for (let i = 0; i < 600; i++)
      controls(
        request(i % 2 ? '/api/v1/items/1389/recipes' : '/api/v1/world/item-sources/1389') as never,
        response as never,
        next,
      );
    expect(next).toHaveBeenCalledTimes(600);
    controls(request('/api/v1/items/1389/recipes') as never, response as never, next);
    expect(response.status).toHaveBeenLastCalledWith(429);
    next.mockClear();
    for (let i = 0; i < 240; i++)
      controls(request('/api/v1/items') as never, response as never, next);
    expect(next).toHaveBeenCalledTimes(240);
    controls(request('/api/v1/items') as never, response as never, next);
    expect(next).toHaveBeenCalledTimes(240);
  });
  it('limits independently and resets after the time window', () => {
    const limiter = new WindowLimiter();
    expect(limiter.take('a', 1, 0)).toBe(true);
    expect(limiter.take('a', 1, 1)).toBe(false);
    expect(limiter.take('b', 1, 1)).toBe(true);
    expect(limiter.take('a', 1, 60000)).toBe(true);
  });
  it('fails closed when the bounded map is full', () => {
    const limiter = new WindowLimiter(1);
    expect(limiter.take('a', 1, 0)).toBe(true);
    expect(limiter.take('b', 1, 1)).toBe(false);
    expect(limiter.take('b', 1, 60000)).toBe(true);
  });
  it('does not expose error messages, queries or credentials', () => {
    expect(
      JSON.stringify(safeProblem(new Error('postgres://admin:secret@host token=private'), 'id')),
    ).not.toContain('secret');
    expect(safeProblem(new UnauthorizedException('private-token'))).toMatchObject({
      statusCode: 401,
      message: 'Entre na sua conta para continuar.',
    });
  });
  it('logs bounded context, never URL queries or request bodies', () => {
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const finish: Record<string, () => void> = {};
    const request = {
      path: '/api/v1/workspace',
      method: 'GET',
      ip: '127.0.0.1',
      headers: { authorization: 'Bearer secret' },
      body: { password: 'secret' },
      route: { path: '/workspace' },
      originalUrl: '/workspace?token=secret',
    };
    const response = {
      setHeader: vi.fn(),
      on: vi.fn((name: string, callback: () => void) => {
        finish[name] = callback;
      }),
      statusCode: 200,
    };
    const next = vi.fn();
    requestControls(logger, 'test', 'https://example.com')(
      request as never,
      response as never,
      next,
    );
    finish['finish']();
    expect(next).toHaveBeenCalledOnce();
    expect(JSON.stringify(logger.log.mock.calls)).not.toContain('secret');
    expect(response.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
  });
  it('rejects a foreign origin on writes', () => {
    const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const response = {
      setHeader: vi.fn(),
      on: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    const next = vi.fn();
    requestControls(logger, 'test', 'https://example.com')(
      {
        path: '/api/v1/workspace',
        method: 'PUT',
        headers: { origin: 'https://evil.test' },
        ip: '127.0.0.1',
      } as never,
      response as never,
      next,
    );
    expect(response.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
