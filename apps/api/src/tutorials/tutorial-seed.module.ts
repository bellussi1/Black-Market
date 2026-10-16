import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { validateEnvironment } from '../config/env.schema';
import { DatabaseModule } from '../database/database.module';
import { TutorialSeeder } from './tutorial-seed';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnvironment,
    }),
    DatabaseModule,
  ],
  providers: [TutorialSeeder],
})
export class TutorialSeedModule {}
