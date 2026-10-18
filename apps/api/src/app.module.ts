import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CalculatorsModule } from './calculators/calculators.module';
import { CatalogModule } from './catalog/catalog.module';
import { validateEnvironment } from './config/env.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { MarketModule } from './market/market.module';
import { MetricsModule } from './operations/metrics.module';
import { OperationsModule } from './operations/operations.module';
import { ReferenceModule } from './reference/reference.module';
import { RoadmapModule } from './roadmap/roadmap.module';
import { TutorialsModule } from './tutorials/tutorials.module';
import { WorkspaceModule } from './workspace/workspace.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    MetricsModule,
    HealthModule,
    CatalogModule,
    CalculatorsModule,
    MarketModule,
    WorkspaceModule,
    ReferenceModule,
    RoadmapModule,
    TutorialsModule,
    OperationsModule,
  ],
})
export class AppModule {}
