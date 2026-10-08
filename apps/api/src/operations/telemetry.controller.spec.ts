import { BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';

import {
  AnalyticsConfigController,
  PlatformConfigController,
  TelemetryController,
} from './telemetry.controller';
describe('public operational configuration', () => {
  it('separates the telemetry request from the original failed request', () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    try {
      new TelemetryController().report(
        {
          kind: 'http',
          area: 'world',
          status: 503,
          requestId: 'b1b7c9b4-8cc3-48a9-ae63-f960c37164bc',
        },
        { requestId: 'receipt' } as never,
      );
      expect(warn).toHaveBeenCalledWith({
        event: 'frontend_error',
        kind: 'http',
        area: 'world',
        status: 503,
        requestId: 'receipt',
        sourceRequestId: 'b1b7c9b4-8cc3-48a9-ae63-f960c37164bc',
      });
    } finally {
      warn.mockRestore();
    }
  });
  it('rejects sensitive telemetry payloads and unknown areas', () => {
    const controller = new TelemetryController();
    expect(() =>
      controller.report({ kind: 'runtime', area: 'account', password: 'private' }),
    ).toThrow(BadRequestException);
    expect(() => controller.report({ kind: 'runtime', area: 'private-name' })).toThrow(
      BadRequestException,
    );
  });
  it('keeps analytics disabled unless production is configured', () => {
    expect(
      new AnalyticsConfigController(
        new ConfigService({
          NODE_ENV: 'development',
          ANALYTICS_ENABLED: true,
          POSTHOG_PUBLIC_KEY: 'phc_test_public',
        }),
      ).get(),
    ).toEqual({ enabled: false, key: null, host: null });
  });
  it('returns only the public contact, never the private environment', () => {
    const value = new PlatformConfigController(
      new ConfigService({ DATABASE_URL: 'private' }),
    ).get();
    expect(value).toEqual({ contactEmail: 'enzobellussi3@gmail.com', controllerName: 'Bellussi' });
    expect(JSON.stringify(value)).not.toContain('private');
  });
});
