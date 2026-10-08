import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';

import {
  AnalyticsConfigController,
  PlatformConfigController,
  TelemetryController,
} from './telemetry.controller';
describe('public operational configuration', () => {
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
