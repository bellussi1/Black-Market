import {
  categories,
  categoryTranslations,
  datasetVersions,
  itemCategories,
  items,
  itemTranslations,
  itemVersions,
  recipeIngredients,
  recipeOutputs,
  recipes,
} from '@bdo/database/schema';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { and, eq, ne, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import type { ExtractedDataset } from './extractor-dataset';

const BATCH_SIZE = 500;
const SOURCE = 'bdo-data-extractor';
const STALE_IMPORT_TIMEOUT_MS = 30 * 60 * 1000;

export interface CatalogImportOptions {
  datasetVersion: string;
  region: string;
  locale: string;
}

export interface CatalogImportResult {
  status: 'published' | 'already-active';
  versionId: string;
  itemCount: number;
  recipeCount: number;
  checksum: string;
}

function batches<T>(entries: T[]): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < entries.length; index += BATCH_SIZE) {
    result.push(entries.slice(index, index + BATCH_SIZE));
  }
  return result;
}

@Injectable()
export class CatalogImporterService {
  private readonly logger = new Logger(CatalogImporterService.name);

  constructor(private readonly database: DatabaseService) {}

  async publish(
    dataset: ExtractedDataset,
    options: CatalogImportOptions,
  ): Promise<CatalogImportResult> {
    const existing = await this.database.db.query.datasetVersions.findFirst({
      where: and(
        eq(datasetVersions.source, SOURCE),
        eq(datasetVersions.version, options.datasetVersion),
        eq(datasetVersions.region, options.region),
        eq(datasetVersions.locale, options.locale),
      ),
    });

    if (existing?.status === 'active') {
      if (existing.checksum !== dataset.checksum) {
        throw new ConflictException(
          'Esta versão já está ativa com outro checksum. Gere uma versão nova para publicar os dados alterados.',
        );
      }
      return {
        status: 'already-active',
        versionId: existing.id,
        itemCount: existing.itemCount ?? 0,
        recipeCount: existing.recipeCount ?? 0,
        checksum: dataset.checksum,
      };
    }

    if (
      existing?.status === 'loading' &&
      Date.now() - existing.startedAt.getTime() < STALE_IMPORT_TIMEOUT_MS
    ) {
      throw new ConflictException('Esta importação já está em andamento.');
    }
    if (existing?.checksum && existing.checksum !== dataset.checksum) {
      throw new ConflictException(
        'O identificador de versão já foi usado para outro conteúdo. Informe uma versão nova do cliente/extractor.',
      );
    }

    const [version] = existing
      ? await this.database.db
          .update(datasetVersions)
          .set({
            checksum: dataset.checksum,
            itemCount: dataset.items.length,
            recipeCount: dataset.recipes.length,
            status: 'loading',
            startedAt: new Date(),
            finishedAt: null,
          })
          .where(eq(datasetVersions.id, existing.id))
          .returning()
      : await this.database.db
          .insert(datasetVersions)
          .values({
            source: SOURCE,
            version: options.datasetVersion,
            region: options.region,
            locale: options.locale,
            checksum: dataset.checksum,
            itemCount: dataset.items.length,
            recipeCount: dataset.recipes.length,
            status: 'loading',
          })
          .returning();

    if (!version) {
      throw new Error('Não foi possível iniciar o registro da importação.');
    }

    try {
      await this.database.db.transaction(async (tx) => {
        await tx.execute(
          // Serialize publication per region/language so two local jobs cannot
          // leave competing active versions behind.
          sql`select pg_advisory_xact_lock(hashtextextended(${`${SOURCE}:${options.region}:${options.locale}`}, 0))`,
        );

        for (const batch of batches(dataset.items.map((item) => ({ id: item.id })))) {
          await tx.insert(items).values(batch).onConflictDoNothing();
        }

        const categoryRows = dataset.categories.map((category) => ({
          datasetVersionId: version.id,
          id: category.id,
          parentId: category.parentId,
          slug: category.slug,
          sortOrder: category.sortOrder,
        }));
        if (categoryRows.length) {
          await tx
            .insert(categories)
            .values(categoryRows)
            .onConflictDoUpdate({
              target: [categories.datasetVersionId, categories.id],
              set: {
                parentId: sql`excluded.parent_id`,
                slug: sql`excluded.slug`,
                sortOrder: sql`excluded.sort_order`,
              },
            });
          await tx
            .insert(categoryTranslations)
            .values(
              dataset.categories.map((category) => ({
                datasetVersionId: version.id,
                categoryId: category.id,
                language: options.locale,
                name: category.name,
              })),
            )
            .onConflictDoUpdate({
              target: [
                categoryTranslations.datasetVersionId,
                categoryTranslations.categoryId,
                categoryTranslations.language,
              ],
              set: { name: sql`excluded.name` },
            });
        }

        const versionedItems = dataset.items.map((item) => ({
          datasetVersionId: version.id,
          itemId: item.id,
          grade: item.grade,
          weight: item.weight === null ? null : String(item.weight),
          icon: item.icon,
          category: item.category,
        }));
        for (const batch of batches(versionedItems)) {
          await tx
            .insert(itemVersions)
            .values(batch)
            .onConflictDoUpdate({
              target: [itemVersions.datasetVersionId, itemVersions.itemId],
              set: {
                grade: sql`excluded.grade`,
                weight: sql`excluded.weight`,
                icon: sql`excluded.icon`,
                category: sql`excluded.category`,
              },
            });
        }

        const translations = dataset.items.map((item) => ({
          datasetVersionId: version.id,
          itemId: item.id,
          language: options.locale,
          name: item.name,
          description: item.description,
        }));
        for (const batch of batches(translations)) {
          await tx
            .insert(itemTranslations)
            .values(batch)
            .onConflictDoUpdate({
              target: [
                itemTranslations.datasetVersionId,
                itemTranslations.itemId,
                itemTranslations.language,
              ],
              set: {
                name: sql`excluded.name`,
                description: sql`excluded.description`,
              },
            });
        }

        const itemCategoryRows = dataset.items.flatMap((item) =>
          item.categoryIds.map((categoryId) => ({
            datasetVersionId: version.id,
            itemId: item.id,
            categoryId,
          })),
        );
        for (const batch of batches(itemCategoryRows)) {
          await tx.insert(itemCategories).values(batch).onConflictDoNothing();
        }

        const recipeRows = dataset.recipes.map((recipe) => ({
          datasetVersionId: version.id,
          recipeKey: recipe.key,
          recipeType: recipe.type,
          station: recipe.station,
          byproductOfItemId: recipe.byproductOfItemId ?? null,
        }));
        for (const batch of batches(recipeRows)) {
          await tx
            .insert(recipes)
            .values(batch)
            .onConflictDoUpdate({
              target: [recipes.datasetVersionId, recipes.recipeKey],
              set: {
                recipeType: sql`excluded.recipe_type`,
                station: sql`excluded.station`,
                byproductOfItemId: sql`excluded.byproduct_of_item_id`,
              },
            });
        }

        const ingredientRows = dataset.recipes.flatMap((recipe) =>
          recipe.inputs.map((input, position) => ({
            datasetVersionId: version.id,
            recipeKey: recipe.key,
            position,
            itemId: input.itemId,
            quantity: input.quantity === null ? null : String(input.quantity),
          })),
        );
        for (const batch of batches(ingredientRows)) {
          await tx
            .insert(recipeIngredients)
            .values(batch)
            .onConflictDoUpdate({
              target: [
                recipeIngredients.datasetVersionId,
                recipeIngredients.recipeKey,
                recipeIngredients.position,
              ],
              set: {
                itemId: sql`excluded.item_id`,
                quantity: sql`excluded.quantity`,
              },
            });
        }

        const outputRows = dataset.recipes.map((recipe) => ({
          datasetVersionId: version.id,
          recipeKey: recipe.key,
          position: 0,
          itemId: recipe.outputItemId,
          quantity: recipe.outputQuantity === null ? null : String(recipe.outputQuantity),
        }));
        for (const batch of batches(outputRows)) {
          await tx
            .insert(recipeOutputs)
            .values(batch)
            .onConflictDoUpdate({
              target: [
                recipeOutputs.datasetVersionId,
                recipeOutputs.recipeKey,
                recipeOutputs.position,
              ],
              set: {
                itemId: sql`excluded.item_id`,
                quantity: sql`excluded.quantity`,
              },
            });
        }

        await tx
          .update(datasetVersions)
          .set({ status: 'archived' })
          .where(
            and(
              eq(datasetVersions.source, SOURCE),
              eq(datasetVersions.region, options.region),
              eq(datasetVersions.locale, options.locale),
              eq(datasetVersions.status, 'active'),
              ne(datasetVersions.id, version.id),
            ),
          );
        await tx
          .update(datasetVersions)
          .set({
            status: 'active',
            finishedAt: new Date(),
            itemCount: dataset.items.length,
            recipeCount: dataset.recipes.length,
          })
          .where(eq(datasetVersions.id, version.id));
      });
    } catch (error) {
      await this.database.db
        .update(datasetVersions)
        .set({ status: 'failed', finishedAt: new Date() })
        .where(eq(datasetVersions.id, version.id));
      this.logger.error(
        `Falha ao importar ${options.datasetVersion} (${options.region}/${options.locale}).`,
      );
      throw error;
    }

    return {
      status: 'published',
      versionId: version.id,
      itemCount: dataset.items.length,
      recipeCount: dataset.recipes.length,
      checksum: dataset.checksum,
    };
  }
}
