import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';

import { HealthService } from './health.service';

@Controller()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get('health')
  @Header('Cache-Control', 'no-store')
  healthcheck() {
    return this.health.healthcheck();
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async readiness() {
    const result = await this.health.readiness();
    if (result.status !== 'ok') {
      throw new ServiceUnavailableException(result);
    }
    return result;
  }
}
