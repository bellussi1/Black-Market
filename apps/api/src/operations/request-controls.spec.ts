import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { isPublicIdentityKey } from '../config/env.schema';
import { requestControls, WindowLimiter } from './request-controls';
import { safeProblem } from './safe-exception.filter';
describe('MVP request controls', () => {
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
  it('rejects private identity keys', () => {
    const jwt = (role: string) =>
      'header.' + Buffer.from(JSON.stringify({ role })).toString('base64url') + '.signature';
    expect(isPublicIdentityKey(jwt('service_role'))).toBe(false);
    expect(isPublicIdentityKey(jwt('anon'))).toBe(true);
    expect(isPublicIdentityKey('sb_secret_private')).toBe(false);
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
