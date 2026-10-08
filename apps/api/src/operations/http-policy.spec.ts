import type { IncomingMessage } from 'node:http';

import { describe, expect, it, vi } from 'vitest';

import { apiCorsOptions, isWorkspacePath, jsonRequest } from './http-policy';
import { requestControls } from './request-controls';

describe('Native HTTP policy', () => {
  it('allows only the configured browser origin without credential cookies', () => {
    const policy = apiCorsOptions('https://platform.example'),
      callback = vi.fn();
    policy.origin('https://evil.test', callback);
    expect(callback).toHaveBeenLastCalledWith(null, false);
    policy.origin('https://platform.example', callback);
    expect(callback).toHaveBeenLastCalledWith(null, true);
    policy.origin(undefined, callback);
    expect(callback).toHaveBeenLastCalledWith(null, true);
    expect(policy.credentials).toBe(false);
  });
  it('selects exactly one parser and excludes similarly named routes', () => {
    for (const path of ['/api/v1/workspace', '/api/v1/workspace/copy?x=1']) {
      const request = {
        url: path,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      } as IncomingMessage;
      expect(jsonRequest(request, true)).toBe(true);
      expect(jsonRequest(request, false)).toBe(false);
    }
    expect(isWorkspacePath('/api/v1/workspace-other')).toBe(false);
    expect(
      jsonRequest(
        {
          url: '/api/v1/calculators/market',
          headers: { 'content-type': 'application/json' },
        } as IncomingMessage,
        false,
      ),
    ).toBe(true);
    expect(
      jsonRequest(
        { url: '/api/v1/workspace', headers: { 'content-type': 'text/plain' } } as IncomingMessage,
        true,
      ),
    ).toBe(false);
  });
  const response = () => ({
    setHeader: vi.fn(),
    on: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  });
  const logger = { log: vi.fn(), warn: vi.fn(), error: vi.fn() };
  it('limits public reads and calculations, exempting preflight, health and icons', () => {
    const middleware = requestControls(logger, 'production', 'https://platform.example');
    const invoke = (path: string, method = 'GET') => {
      const res = response(),
        next = vi.fn();
      middleware({ path, method, ip: 'fixture', headers: {} } as never, res as never, next);
      return { res, next };
    };
    for (let i = 0; i < 240; i++) expect(invoke('/api/v1/items').next).toHaveBeenCalledOnce();
    expect(invoke('/api/v1/items').res.status).toHaveBeenCalledWith(429);
    expect(invoke('/api/v1/items', 'OPTIONS').next).toHaveBeenCalledOnce();
    expect(invoke('/api/v1/items/1399/icon').next).toHaveBeenCalledOnce();
    expect(invoke('/ready').next).toHaveBeenCalledOnce();
    for (let i = 0; i < 30; i++)
      expect(invoke('/api/v1/calculators/market', 'POST').next).toHaveBeenCalledOnce();
    expect(invoke('/api/v1/calculators/market', 'POST').res.status).toHaveBeenCalledWith(429);
  });
  it('blocks cross-site personal writes even without Origin and sends HSTS for HTTPS', () => {
    const res = response(),
      next = vi.fn();
    requestControls(logger, 'production', 'https://platform.example')(
      {
        path: '/api/v1/workspace',
        method: 'PUT',
        ip: 'fixture',
        headers: { 'sec-fetch-site': 'cross-site' },
      } as never,
      res as never,
      next,
    );
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith('Strict-Transport-Security', 'max-age=31536000');
  });
});
