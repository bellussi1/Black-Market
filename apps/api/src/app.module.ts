import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envSchema } from './config/env.schema';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { CatalogModule } from './catalog/catalog.module';
import { CalculatorsModule } from './calculators/calculators.module';
import { MarketModule } from './market/market.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: (config) => envSchema.parse(config),
    }),
    DatabaseModule,
    HealthModule,
    CatalogModule,
    CalculatorsModule,
    MarketModule,
  ],
})
export class AppModule {}
