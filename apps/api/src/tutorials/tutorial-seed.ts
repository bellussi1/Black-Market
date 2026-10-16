import { tutorialGuides, tutorialGuideSteps } from '@bdo/database/schema';
import { Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import type { TutorialSeedEntry } from './tutorial-seed-content';
import { parseTutorialGuideUpdate } from './tutorial-validation';

export interface TutorialSeedResult {
  revision: string;
  insertedScreens: string[];
  skippedScreens: string[];
}

export async function seedTutorialGuides(
  database: DatabaseService,
  revision: string,
  entries: readonly TutorialSeedEntry[],
): Promise<TutorialSeedResult> {
  const insertedScreens: string[] = [];
  const skippedScreens: string[] = [];

  for (const entry of entries) {
    const validated = parseTutorialGuideUpdate(entry.screenKey, entry.locale, {
      expectedUpdatedAt: null,
      enabled: entry.enabled,
      steps: entry.steps.map((step) => ({ ...step })),
    });

    await database.db.transaction(async (tx) => {
      const lockKey = `tutorials:${entry.screenKey}:${entry.locale}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

      const existing = await tx
        .select()
        .from(tutorialGuides)
        .where(
          and(
            eq(tutorialGuides.screenKey, entry.screenKey),
            eq(tutorialGuides.locale, entry.locale),
          ),
        );

      if (existing.length > 0) {
        skippedScreens.push(`${entry.screenKey}:${entry.locale}`);
        return;
      }

      const guideId = crypto.randomUUID();
      const inserted = await tx
        .insert(tutorialGuides)
        .values({
          id: guideId,
          screenKey: entry.screenKey,
          locale: entry.locale,
          enabled: validated.enabled,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({
          target: [tutorialGuides.screenKey, tutorialGuides.locale],
        })
        .returning({ id: tutorialGuides.id });

      if (inserted.length === 0) {
        skippedScreens.push(`${entry.screenKey}:${entry.locale}`);
        return;
      }

      await tx.insert(tutorialGuideSteps).values(
        validated.steps.map((step, index) => ({
          id: crypto.randomUUID(),
          guideId,
          sortOrder: index,
          anchorKey: step.anchorKey,
          title: step.title,
          body: step.body,
        })),
      );

      insertedScreens.push(`${entry.screenKey}:${entry.locale}`);
    });
  }

  return {
    revision,
    insertedScreens,
    skippedScreens,
  };
}

@Injectable()
export class TutorialSeeder {
  constructor(private readonly database: DatabaseService) {}

  seed(revision: string, entries: readonly TutorialSeedEntry[]): Promise<TutorialSeedResult> {
    return seedTutorialGuides(this.database, revision, entries);
  }
}
