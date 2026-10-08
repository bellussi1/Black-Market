import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CalculatorsModule } from './calculators/calculators.module';
import { CatalogModule } from './catalog/catalog.module';
import { validateEnvironment } from './config/env.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MarketModule } from './market/market.module';
import { OperationsModule } from './operations/operations.module';
import { ReferenceModule } from './reference/reference.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    HealthModule,
    CatalogModule,
    CalculatorsModule,
    MarketModule,
    WorkspaceModule,
    ReferenceModule,
    OperationsModule,
  ],
})
export class AppModule {}
