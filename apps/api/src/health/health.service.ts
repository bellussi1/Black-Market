import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class HealthService {
  constructor(private readonly database: DatabaseService) {}

  healthcheck() {
    return {
      status: 'ok' as const,
      service: 'black-market-api',
      timestamp: new Date().toISOString(),
    };
  }

  async readiness() {
    try {
      await this.database.ping();
      return { status: 'ok' as const, database: 'up' as const };
    } catch {
      return { status: 'error' as const, database: 'down' as const };
    }
  }
}
