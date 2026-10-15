import { tutorialGuides, tutorialGuideSteps } from '@bdo/database/schema';
import {
  isTutorialScreenKey,
  TUTORIAL_LOCALES,
  type TutorialGuideUpdateRequest,
  type TutorialLocale,
  type TutorialScreenKey,
} from '@bdo/shared';
import { Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { parseTutorialGuideUpdate } from './tutorial-validation';

export interface TutorialSeedEntry {
  screenKey: TutorialScreenKey;
  locale: TutorialLocale;
  enabled: boolean;
  steps: TutorialGuideUpdateRequest['steps'];
}

export type TutorialSeeder = (
  revision: number,
  entries: readonly TutorialSeedEntry[],
) => Promise<void>;

export function createTutorialSeeder(database: DatabaseService): TutorialSeeder {
  return async (revision, entries) => {
    if (!Number.isSafeInteger(revision) || revision < 1) {
      throw new Error('A revisão do conteúdo dos tutoriais precisa ser um inteiro positivo.');
    }

    const keys = new Set<string>();
    const validated = entries.map((entry) => {
      if (!isTutorialScreenKey(entry.screenKey) || !TUTORIAL_LOCALES.includes(entry.locale)) {
        throw new Error('O seed contém uma tela ou idioma de tutorial não registrado.');
      }
      const identity = `${entry.screenKey}:${entry.locale}`;
      if (keys.has(identity)) throw new Error(`O seed contém uma entrada duplicada: ${identity}.`);
      keys.add(identity);
      const parsed = parseTutorialGuideUpdate(entry.screenKey, entry.locale, {
        expectedUpdatedAt: null,
        enabled: entry.enabled,
        steps: entry.steps,
      });
      return { ...entry, steps: parsed.steps };
    });

    await database.db.transaction(async (transaction) => {
      // A single lock serializes seed revisions while the unique guide key protects writers
      // that run outside this bootstrap command.
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${'tutorial:seed'}, 0))`,
      );

      for (const entry of validated) {
        await transaction.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${`tutorial:guide:${entry.screenKey}:${entry.locale}`}, 0))`,
        );
        const [created] = await transaction
          .insert(tutorialGuides)
          .values({
            screenKey: entry.screenKey,
            locale: entry.locale,
            enabled: entry.enabled,
          })
          .onConflictDoNothing()
          .returning({ id: tutorialGuides.id });
        if (!created) continue;

        await transaction
          .insert(tutorialGuideSteps)
          .values(
            entry.steps.map((step) => ({
              ...step,
              guideId: created.id,
            })),
          )
          .onConflictDoNothing();
      }
    });
  };
}

@Injectable()
export class TutorialSeedService {
  private readonly runSeed: TutorialSeeder;

  constructor(database: DatabaseService) {
    this.runSeed = createTutorialSeeder(database);
  }

  seedTutorialGuides(revision: number, entries: readonly TutorialSeedEntry[]): Promise<void> {
    return this.runSeed(revision, entries);
  }
}
