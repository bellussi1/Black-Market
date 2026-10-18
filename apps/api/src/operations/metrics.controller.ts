import { Controller, Get, Header, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  expose() {
    if (!this.config.get<boolean>('LOCAL_METRICS_ENABLED')) throw new NotFoundException();
    return this.metrics.render();
  }
}
