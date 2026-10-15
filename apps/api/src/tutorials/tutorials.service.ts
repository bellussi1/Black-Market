import { tutorialGuides, tutorialGuideSteps } from '@bdo/database/schema';
import {
  isTutorialScreenKey,
  TUTORIAL_LOCALES,
  TUTORIAL_SCREEN_REGISTRY,
  type TutorialGuide,
  type TutorialGuideResponse,
  type TutorialLocale,
  type TutorialManagementResponse,
  type TutorialScreenKey,
} from '@bdo/shared';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { parseTutorialGuideUpdate } from './tutorial-validation';

const READ_ONLY_SNAPSHOT = { isolationLevel: 'repeatable read', accessMode: 'read only' } as const;

@Injectable()
export class TutorialsService {
  constructor(private readonly database: DatabaseService) {}

  async getPublished(screenKey: string, locale: string): Promise<TutorialGuideResponse> {
    const key = this.requireScreen(screenKey);
    const language = this.requireLocale(locale);
    return this.database.db.transaction(async (transaction) => {
      const [row] = await transaction
        .select()
        .from(tutorialGuides)
        .where(
          and(
            eq(tutorialGuides.screenKey, key),
            eq(tutorialGuides.locale, language),
            eq(tutorialGuides.enabled, true),
          ),
        )
        .limit(1);

      if (!row || !row.enabled) return { guide: null };

      const steps = await transaction
        .select()
        .from(tutorialGuideSteps)
        .where(eq(tutorialGuideSteps.guideId, row.id))
        .orderBy(asc(tutorialGuideSteps.sortOrder));

      return {
        guide: {
          screenKey: key,
          locale: language,
          updatedAt: row.updatedAt.toISOString(),
          steps: steps.map(({ sortOrder, anchorKey, title, body }) => ({
            sortOrder,
            anchorKey,
            title,
            body,
          })),
        },
      };
    }, READ_ONLY_SNAPSHOT);
  }

  async getManagement(): Promise<TutorialManagementResponse> {
    return this.database.db.transaction(async (transaction) => {
      const [guideRows, stepRows] = await Promise.all([
        transaction.select().from(tutorialGuides),
        transaction.select().from(tutorialGuideSteps).orderBy(asc(tutorialGuideSteps.sortOrder)),
      ]);
      const stepsByGuide = new Map<string, typeof stepRows>();
      for (const step of stepRows) {
        const existing = stepsByGuide.get(step.guideId) ?? [];
        existing.push(step);
        stepsByGuide.set(step.guideId, existing);
      }

      const guides: TutorialGuide[] = guideRows
        .filter(
          (row): row is typeof row & { screenKey: TutorialScreenKey; locale: TutorialLocale } =>
            isTutorialScreenKey(row.screenKey) &&
            TUTORIAL_LOCALES.includes(row.locale as TutorialLocale),
        )
        .map((row) => ({
          id: row.id,
          screenKey: row.screenKey,
          locale: row.locale,
          enabled: row.enabled,
          updatedAt: row.updatedAt.toISOString(),
          steps: (stepsByGuide.get(row.id) ?? []).map(
            ({ id, sortOrder, anchorKey, title, body }) => ({
              id,
              sortOrder,
              anchorKey,
              title,
              body,
            }),
          ),
        }));

      return {
        screens: Object.values(TUTORIAL_SCREEN_REGISTRY),
        locales: [...TUTORIAL_LOCALES],
        guides,
      };
    }, READ_ONLY_SNAPSHOT);
  }

  async replace(screenKey: string, locale: string, input: unknown): Promise<TutorialGuide> {
    const parsed = parseTutorialGuideUpdate(screenKey, locale, input);
    const key = screenKey as TutorialScreenKey;
    const language = locale as TutorialLocale;

    const saved = await this.database.db.transaction(async (transaction) => {
      await transaction.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`tutorial:guide:${key}:${language}`}, 0))`,
      );
      const [current] = await transaction
        .select()
        .from(tutorialGuides)
        .where(and(eq(tutorialGuides.screenKey, key), eq(tutorialGuides.locale, language)))
        .limit(1);

      if ((current?.updatedAt.toISOString() ?? null) !== parsed.expectedUpdatedAt) {
        throw new ConflictException(
          'O tutorial foi alterado por outra pessoa. Recarregue antes de salvar novamente.',
        );
      }

      const updatedAt = new Date();
      let guideRow: typeof tutorialGuides.$inferSelect;
      if (current) {
        await transaction
          .update(tutorialGuides)
          .set({ enabled: parsed.enabled, updatedAt })
          .where(eq(tutorialGuides.id, current.id));
        guideRow = { ...current, enabled: parsed.enabled, updatedAt };
      } else {
        const [created] = await transaction
          .insert(tutorialGuides)
          .values({ screenKey: key, locale: language, enabled: parsed.enabled, updatedAt })
          .returning();
        if (!created) throw new Error('Não foi possível salvar o tutorial.');
        guideRow = created;
      }

      await transaction
        .delete(tutorialGuideSteps)
        .where(eq(tutorialGuideSteps.guideId, guideRow.id));
      const steps = await transaction
        .insert(tutorialGuideSteps)
        .values(parsed.steps.map((step) => ({ ...step, guideId: guideRow.id })))
        .returning();

      return { guideRow, steps };
    });

    return {
      id: saved.guideRow.id,
      screenKey: key,
      locale: language,
      enabled: saved.guideRow.enabled,
      updatedAt: saved.guideRow.updatedAt.toISOString(),
      steps: saved.steps.map(({ id, sortOrder, anchorKey, title, body }) => ({
        id,
        sortOrder,
        anchorKey,
        title,
        body,
      })),
    };
  }

  private requireScreen(screenKey: string): TutorialScreenKey {
    if (!isTutorialScreenKey(screenKey)) {
      throw new NotFoundException('A tela não possui tutorial registrado.');
    }
    return screenKey;
  }

  private requireLocale(locale: string): TutorialLocale {
    if (!TUTORIAL_LOCALES.includes(locale as TutorialLocale)) {
      throw new BadRequestException('Idioma de tutorial não suportado.');
    }
    return locale as TutorialLocale;
  }
}
