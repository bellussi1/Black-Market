import { NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

describe('MetricsController', () => {
  it('hides the metrics endpoint unless local metrics were explicitly enabled', () => {
    const config = { get: vi.fn().mockReturnValue(false) };
    const controller = new MetricsController(new MetricsService(), config as never);
    expect(() => controller.expose()).toThrow(NotFoundException);
  });

  it('exposes Prometheus text only after local opt-in', () => {
    const config = { get: vi.fn().mockReturnValue(true) };
    const controller = new MetricsController(new MetricsService(), config as never);
    expect(controller.expose()).toContain('# TYPE black_market_database_ready gauge');
  });
});
