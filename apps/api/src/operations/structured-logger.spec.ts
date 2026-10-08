import { describe, expect, it, vi } from 'vitest';

import { safeProblem } from './safe-exception.filter';
import { logEntry, StructuredLogger } from './structured-logger';
describe('structured operational logs', () => {
  it('writes native INFO, WARN and ERROR as safe JSON without stack arguments', () => {
    const writes: string[] = [];
    const stdout = vi.spyOn(process.stdout, 'write').mockImplementation((value) => {
      writes.push(String(value));
      return true;
    });
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation((value) => {
      writes.push(String(value));
      return true;
    });
    try {
      const logger = new StructuredLogger('test');
      logger.log({ event: 'fixture' });
      logger.warn({ event: 'fixture', password: 'private' });
      logger.error({ event: 'fixture' }, 'stack token=private', 'API');
      const entries = writes.map((value) => JSON.parse(value) as { level: string });
      expect(entries.map((entry) => entry.level)).toEqual(['INFO', 'WARN', 'ERROR']);
      expect(writes.join('')).not.toContain('private');
      expect(JSON.stringify(logEntry({}, 'log', 'token=private', 'secret'))).not.toMatch(
        /private|secret/,
      );
    } finally {
      stdout.mockRestore();
      stderr.mockRestore();
    }
  });
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
  it('redacts e-mail addresses, remote URLs and cookie strings in framework messages', () => {
    const entry = logEntry(
      'user@example.com https://host.test/?code=private Cookie: session=private',
      'warn',
      'API',
      'test',
    );
    expect(JSON.stringify(entry)).not.toMatch(/private|user@example|host\.test/);
  });
});
