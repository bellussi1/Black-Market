import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { CatalogModule } from '../catalog/catalog.module';
import { validateEnvironment } from '../config/env.schema';
import { DatabaseModule } from '../database/database.module';
import { TestWorkspaceSeeder } from './test-workspace-seeder';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate: validateEnvironment,
    }),
    DatabaseModule,
    CatalogModule,
  ],
  providers: [TestWorkspaceSeeder],
})
class SeedTestWorkspaceModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(SeedTestWorkspaceModule, {
    logger: false,
  });
  try {
    const config = app.get(ConfigService);
    const firebaseUid = config.get<string>('STAGING_TEST_FIREBASE_UID');
    if (!firebaseUid)
      throw new Error('Configure STAGING_TEST_FIREBASE_UID no ambiente de staging.');
    const result = await app.get(TestWorkspaceSeeder).seed(firebaseUid);
    process.stdout.write(
      result.seeded
        ? `Seed sintético aplicado ao workspace (versão ${result.version}): ${Object.entries(
            result.counts,
          )
            .map(([name, count]) => `${name}=${count}`)
            .join(', ')}.\n`
        : `Seed sintético já estava aplicado (versão ${result.version}).\n`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    (error instanceof Error ? error.message : 'Não foi possível aplicar o perfil de teste.') + '\n',
  );
  process.exitCode = 1;
});
