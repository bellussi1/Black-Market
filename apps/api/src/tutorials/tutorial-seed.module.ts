import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from '../config/env.schema';
import { DatabaseModule } from '../database/database.module';
import { TutorialSeedService } from './tutorial-seed';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnvironment,
    }),
    DatabaseModule,
  ],
  providers: [TutorialSeedService],
  exports: [TutorialSeedService],
})
export class TutorialSeedModule {}
