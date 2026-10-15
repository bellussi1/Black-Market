import { NestFactory } from '@nestjs/core';

import { TutorialSeedService } from './tutorial-seed';
import { TutorialSeedModule } from './tutorial-seed.module';
import { TUTORIAL_SEED_CONTENT, TUTORIAL_SEED_REVISION } from './tutorial-seed-content';

async function main() {
  const app = await NestFactory.createApplicationContext(TutorialSeedModule, { logger: false });
  try {
    await app
      .get(TutorialSeedService)
      .seedTutorialGuides(TUTORIAL_SEED_REVISION, TUTORIAL_SEED_CONTENT);
    process.stdout.write(`Seed dos tutoriais verificado (revisão ${TUTORIAL_SEED_REVISION}).\n`);
  } finally {
    await app.close();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(
    (error instanceof Error ? error.message : 'Não foi possível semear os tutoriais.') + '\n',
  );
  process.exitCode = 1;
});
