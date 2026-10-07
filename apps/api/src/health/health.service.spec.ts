import { HealthService } from './health.service';
import { describe, expect, it, vi } from 'vitest';

describe('HealthService', () => {
  it('reports the API as healthy without claiming the database is ready', () => {
    const database = { ping: vi.fn() };
    const service = new HealthService(database as never);

    expect(service.healthcheck()).toMatchObject({
      status: 'ok',
      service: 'bdo-companion-api',
    });
    expect(database.ping).not.toHaveBeenCalled();
  });

  it('reports ready when PostgreSQL responds', async () => {
    const database = { ping: vi.fn().mockResolvedValue(true) };
    const service = new HealthService(database as never);

    await expect(service.readiness()).resolves.toEqual({
      status: 'ok',
      database: 'up',
    });
  });

  it('reports not ready when PostgreSQL is unavailable', async () => {
    const database = {
      ping: vi.fn().mockRejectedValue(new Error('offline')),
    };
    const service = new HealthService(database as never);

    await expect(service.readiness()).resolves.toEqual({
      status: 'error',
      database: 'down',
    });
  });
});
