import { describe, expect, it } from 'vitest';

import { safeProblem } from './safe-exception.filter';
import { logEntry } from './structured-logger';
describe('structured operational logs', () => {
  it('records native levels, time and safe context without sensitive fields', () => {
    const entry = logEntry(
      {
        event: 'http_request',
        requestId: 'id',
        status: 503,
        password: 'private',
        authorization: 'private',
        body: { email: 'private' },
      },
      'error',
      'API',
      'test',
    );
    expect(entry).toMatchObject({
      level: 'ERROR',
      environment: 'test',
      requestId: 'id',
      status: 503,
    });
    expect(Number.isFinite(Date.parse(entry.timestamp))).toBe(true);
    expect(JSON.stringify(entry)).not.toContain('private');
    expect(
      logEntry('token=private postgres://user:password@host/db', 'warn', 'API', 'test').level,
    ).toBe('WARN');
    expect(
      JSON.stringify(
        logEntry('token=private postgres://user:password@host/db', 'warn', 'API', 'test'),
      ),
    ).not.toContain('private');
  });
  it('maps JSON parser errors without echoing submitted data', () => {
    expect(safeProblem({ type: 'entity.too.large', body: 'private' }).statusCode).toBe(413);
    expect(safeProblem({ type: 'entity.parse.failed', body: 'private' }).statusCode).toBe(400);
  });
});
