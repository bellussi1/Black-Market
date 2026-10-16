import { NestFactory } from '@nestjs/core';

import { TutorialSeeder } from './tutorial-seed';
import { TutorialSeedModule } from './tutorial-seed.module';
import { TUTORIAL_SEED_ENTRIES, TUTORIAL_SEED_REVISION } from './tutorial-seed-content';

async function main() {
  const app = await NestFactory.createApplicationContext(TutorialSeedModule, {
    logger: false,
  });
  try {
    const result = await app
      .get(TutorialSeeder)
      .seed(TUTORIAL_SEED_REVISION, TUTORIAL_SEED_ENTRIES);
    process.stdout.write(
      `Seed de tutoriais (${result.revision}): inseridos=${result.insertedScreens.length}, preservados=${result.skippedScreens.length}.\n`,
    );
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    (error instanceof Error ? error.message : 'Não foi possível aplicar o seed de tutoriais.') +
      '\n',
  );
  process.exitCode = 1;
});
