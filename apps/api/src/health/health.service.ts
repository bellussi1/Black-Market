import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from '../database/database.service';
import { MetricsService } from '../operations/metrics.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private lastReady: boolean | undefined;
  constructor(
    private readonly database: DatabaseService,
    private readonly metrics: MetricsService,
  ) {}

  healthcheck() {
    return {
      status: 'ok' as const,
      service: 'black-market-api',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    let ready = false;
    try {
      ready = await this.database.ping();
    } catch {
      // Do not retain connection errors or credentials.
    }
    this.metrics.setDatabaseReady(ready);
    if (ready !== this.lastReady) {
      const event = { event: 'database_readiness', status: ready ? 200 : 503 };
      if (ready) this.logger.log(event);
      else this.logger.error(event);
      this.lastReady = ready;
    }
    return ready
      ? { status: 'ok' as const, database: 'up' as const }
      : { status: 'error' as const, database: 'down' as const };
  }
}
