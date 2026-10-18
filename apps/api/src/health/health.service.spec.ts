import { Logger } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MetricsService } from '../operations/metrics.service';
import { HealthService } from './health.service';

describe('HealthService', () => {
  afterEach(() => vi.restoreAllMocks());
  it('logs database failure and recovery once per transition without raw errors', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const info = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const database = { ping: vi.fn().mockResolvedValue(true) };
    const service = new HealthService(database as never, new MetricsService());
    await service.readiness();
    await service.readiness();
    database.ping.mockRejectedValue(new Error('postgres://private:password@host/db'));
    await service.readiness();
    await service.readiness();
    database.ping.mockResolvedValue(true);
    await service.readiness();
    expect(info).toHaveBeenCalledTimes(2);
    expect(error).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith({ event: 'database_readiness', status: 503 });
    expect(JSON.stringify(error.mock.calls)).not.toContain('private');
  });
  it('does not declare readiness when the database returns false', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const service = new HealthService(
      { ping: vi.fn().mockResolvedValue(false) } as never,
      new MetricsService(),
    );
    await expect(service.readiness()).resolves.toEqual({ status: 'error', database: 'down' });
  });
  it('reports the API as healthy without claiming the database is ready', () => {
    const database = { ping: vi.fn() };
    const service = new HealthService(database as never, new MetricsService());

    expect(service.healthcheck()).toMatchObject({
      status: 'ok',
      service: 'black-market-api',
    });
    expect(database.ping).not.toHaveBeenCalled();
  });

  it('reports ready when PostgreSQL responds', async () => {
    const database = { ping: vi.fn().mockResolvedValue(true) };
    const service = new HealthService(database as never, new MetricsService());

    await expect(service.readiness()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('reports not ready when PostgreSQL is unavailable', async () => {
    const database = {
      ping: vi.fn().mockRejectedValue(new Error('offline')),
    };
    const service = new HealthService(database as never, new MetricsService());

    await expect(service.readiness()).resolves.toEqual({
      status: 'error',
      database: 'down',
    });
  });
});
