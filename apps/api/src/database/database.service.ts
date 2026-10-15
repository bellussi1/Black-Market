import { schema } from '@bdo/database/schema';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import {
  RUNTIME_PRIVILEGES_QUERY,
  type RuntimePrivileges,
  runtimeRoleIsRestricted,
} from './runtime-role';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  readonly db: NodePgDatabase<typeof schema>;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: config.get<string>('NODE_ENV') === 'production' ? 8 : 4,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 15_000,
      query_timeout: 20_000,
    });
    this.pool.on('error', () =>
      new Logger(DatabaseService.name).error({ event: 'database_connection_error' }),
    );
    this.db = drizzle({ client: this.pool, schema });
  }

  async ping(): Promise<boolean> {
    await this.pool.query('select 1');
    return true;
  }

  async assertRuntimePrivileges(): Promise<void> {
    const result = await this.pool.query<RuntimePrivileges>(RUNTIME_PRIVILEGES_QUERY);
    if (!runtimeRoleIsRestricted(result.rows[0])) {
      await this.pool.end();
      throw new Error(
        'A aplicação exige uma conta de banco com privilégios mínimos e permissões de dados esperadas. Use credenciais separadas para migrações.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
