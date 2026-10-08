import { Module } from '@nestjs/common';

import {
  AnalyticsConfigController,
  PlatformConfigController,
  TelemetryController,
} from './telemetry.controller';
@Module({ controllers: [TelemetryController, AnalyticsConfigController, PlatformConfigController] })
export class OperationsModule {}
