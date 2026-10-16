import { tutorialGuides, tutorialGuideSteps } from '@bdo/database/schema';
import {
  isTutorialAnchorForScreen,
  isTutorialLocale,
  isTutorialScreenKey,
  TUTORIAL_LOCALES,
  TUTORIAL_SCREEN_REGISTRY,
  type TutorialGuide,
  type TutorialGuideResponse,
  type TutorialGuideStep,
  type TutorialManagementResponse,
} from '@bdo/shared';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { parseTutorialGuideUpdate } from './tutorial-validation';

@Injectable()
export class TutorialsService {
  constructor(private readonly database: DatabaseService) {}

  async getPublished(screenKey: string, locale = 'pt-BR'): Promise<TutorialGuideResponse> {
    if (!isTutorialScreenKey(screenKey)) {
      throw new NotFoundException('Tela de tutorial não registrada.');
    }
    if (!isTutorialLocale(locale)) {
      return { guide: null };
    }

    const guideRows = await this.database.db
      .select()
      .from(tutorialGuides)
      .where(and(eq(tutorialGuides.screenKey, screenKey), eq(tutorialGuides.locale, locale)));

    const guideRow = guideRows[0];
    if (!guideRow || !guideRow.enabled) {
      return { guide: null };
    }

    const stepRows = await this.database.db
      .select()
      .from(tutorialGuideSteps)
      .where(eq(tutorialGuideSteps.guideId, guideRow.id));

    const validOrderedSteps = [...stepRows]
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .filter(
        (step) => step.anchorKey === null || isTutorialAnchorForScreen(screenKey, step.anchorKey),
      )
      .map((step, index) => ({
        sortOrder: index,
        anchorKey: step.anchorKey,
        title: step.title,
        body: step.body,
      }));

    if (validOrderedSteps.length === 0) {
      return { guide: null };
    }

    return {
      guide: {
        screenKey,
        locale,
        updatedAt: guideRow.updatedAt.toISOString(),
        steps: validOrderedSteps,
      },
    };
  }

  async getManagement(): Promise<TutorialManagementResponse> {
    const [guideRows, stepRows] = await Promise.all([
      this.database.db.select().from(tutorialGuides),
      this.database.db.select().from(tutorialGuideSteps),
    ]);

    const stepsByGuide = new Map<string, TutorialGuideStep[]>();
    for (const step of stepRows) {
      const list = stepsByGuide.get(step.guideId) ?? [];
      list.push({
        id: step.id,
        sortOrder: step.sortOrder,
        anchorKey: step.anchorKey,
        title: step.title,
        body: step.body,
      });
      stepsByGuide.set(step.guideId, list);
    }

    const guides: TutorialGuide[] = guideRows
      .filter(
        (
          row,
        ): row is typeof row & {
          screenKey: TutorialGuide['screenKey'];
          locale: TutorialGuide['locale'];
        } => isTutorialScreenKey(row.screenKey) && isTutorialLocale(row.locale),
      )
      .sort(
        (left, right) =>
          left.screenKey.localeCompare(right.screenKey) || left.locale.localeCompare(right.locale),
      )
      .map((row) => ({
        id: row.id,
        screenKey: row.screenKey,
        locale: row.locale,
        enabled: row.enabled,
        updatedAt: row.updatedAt.toISOString(),
        steps: [...(stepsByGuide.get(row.id) ?? [])].sort(
          (left, right) => left.sortOrder - right.sortOrder,
        ),
      }));

    return {
      screens: [...TUTORIAL_SCREEN_REGISTRY],
      locales: [...TUTORIAL_LOCALES],
      guides,
    };
  }

  async replace(screenKey: string, locale: string, input: unknown): Promise<TutorialGuide> {
    const parsed = parseTutorialGuideUpdate(screenKey, locale, input);
    const typedScreenKey = screenKey as TutorialGuide['screenKey'];
    const typedLocale = locale as TutorialGuide['locale'];

    return this.database.db.transaction(async (tx) => {
      const lockKey = `tutorials:${typedScreenKey}:${typedLocale}`;
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);

      const currentGuides = await tx
        .select()
        .from(tutorialGuides)
        .where(
          and(eq(tutorialGuides.screenKey, typedScreenKey), eq(tutorialGuides.locale, typedLocale)),
        );

      const currentGuide = currentGuides[0];
      const currentTimestamp = currentGuide?.updatedAt.toISOString() ?? null;

      if (currentTimestamp !== parsed.expectedUpdatedAt) {
        throw new ConflictException(
          'Este tutorial foi alterado por outra pessoa. Recarregue antes de salvar novamente.',
        );
      }

      const updatedAt = new Date(
        Math.max(Date.now(), (currentGuide?.updatedAt.getTime() ?? 0) + 1),
      );
      const guideId = currentGuide?.id ?? crypto.randomUUID();

      if (currentGuide) {
        await tx
          .update(tutorialGuides)
          .set({ enabled: parsed.enabled, updatedAt })
          .where(eq(tutorialGuides.id, guideId));
        await tx.delete(tutorialGuideSteps).where(eq(tutorialGuideSteps.guideId, guideId));
      } else {
        await tx.insert(tutorialGuides).values({
          id: guideId,
          screenKey: typedScreenKey,
          locale: typedLocale,
          enabled: parsed.enabled,
          updatedAt,
        });
      }

      const stepsToInsert = parsed.steps.map((step, index) => ({
        id: crypto.randomUUID(),
        guideId,
        sortOrder: index,
        anchorKey: step.anchorKey,
        title: step.title,
        body: step.body,
      }));

      await tx.insert(tutorialGuideSteps).values(stepsToInsert);

      return {
        id: guideId,
        screenKey: typedScreenKey,
        locale: typedLocale,
        enabled: parsed.enabled,
        updatedAt: updatedAt.toISOString(),
        steps: stepsToInsert.map((step) => ({
          id: step.id,
          sortOrder: step.sortOrder,
          anchorKey: step.anchorKey,
          title: step.title,
          body: step.body,
        })),
      };
    });
  }
}
