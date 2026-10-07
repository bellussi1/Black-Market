import {
  categories,
  categoryTranslations,
  type DatasetVersion,
  datasetVersions,
  itemCategories,
  items,
  itemTranslations,
  itemVersions,
  recipeIngredients,
  recipeOutputs,
  recipes,
} from '@bdo/database/schema';
import type {
  ActiveDatasetSummary,
  CatalogCategoriesResponse,
  CatalogCategory,
  CatalogItem,
  CatalogPage,
  CatalogRecipe,
  CatalogRecipesResponse,
} from '@bdo/shared';
import { CATALOG_FALLBACK_LOCALE, DEFAULT_DATA_LOCALE } from '@bdo/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, inArray, type SQL, sql } from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { type CatalogQuery, parseCatalogQuery } from './catalog-query';

@Injectable()
export class CatalogService {
  constructor(private readonly database: DatabaseService) {}

  async listItems(rawQuery: Record<string, unknown>): Promise<CatalogPage> {
    const query = parseCatalogQuery(rawQuery);
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset) {
      return {
        items: [],
        total: 0,
        page: query.page,
        pageSize: query.pageSize,
        dataset: null,
      };
    }

    const filters = this.itemFilters(query, dataset.id);
    const matches = this.database.db
      .select({ itemId: itemCategories.itemId })
      .from(itemCategories)
      .where(
        and(
          eq(itemCategories.datasetVersionId, dataset.id),
          eq(itemCategories.categoryId, query.categoryId ?? ''),
        ),
      );
    if (query.categoryId) filters.push(inArray(items.id, matches));

    const [countRow] = await this.database.db
      .select({ total: count() })
      .from(itemVersions)
      .innerJoin(items, eq(items.id, itemVersions.itemId))
      .innerJoin(
        itemTranslations,
        and(
          eq(itemTranslations.datasetVersionId, itemVersions.datasetVersionId),
          eq(itemTranslations.itemId, itemVersions.itemId),
          eq(itemTranslations.language, dataset.locale),
        ),
      )
      .where(and(...filters));

    const rows = await this.database.db
      .select({
        id: items.id,
        name: itemTranslations.name,
        description: itemTranslations.description,
        grade: itemVersions.grade,
        weight: itemVersions.weight,
        category: itemVersions.category,
        icon: itemVersions.icon,
      })
      .from(itemVersions)
      .innerJoin(items, eq(items.id, itemVersions.itemId))
      .innerJoin(
        itemTranslations,
        and(
          eq(itemTranslations.datasetVersionId, itemVersions.datasetVersionId),
          eq(itemTranslations.itemId, itemVersions.itemId),
          eq(itemTranslations.language, dataset.locale),
        ),
      )
      .where(and(...filters))
      .orderBy(asc(itemTranslations.name), asc(items.id))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const categoryMap = await this.categoriesByItem(
      dataset.id,
      dataset.locale,
      rows.map((row) => row.id),
    );
    return {
      items: rows.map((row) => ({
        ...row,
        categories: categoryMap.get(row.id) ?? [],
      })),
      total: Number(countRow?.total ?? 0),
      page: query.page,
      pageSize: query.pageSize,
      dataset: this.toSummary(dataset),
    };
  }

  async listCategories(rawQuery: Record<string, unknown>): Promise<CatalogCategoriesResponse> {
    const query = parseCatalogQuery(rawQuery, { pagination: false });
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset) return { categories: [], dataset: null };

    const rows = await this.database.db
      .select({
        id: categories.id,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        name: categoryTranslations.name,
      })
      .from(categories)
      .innerJoin(
        categoryTranslations,
        and(
          eq(categoryTranslations.datasetVersionId, categories.datasetVersionId),
          eq(categoryTranslations.categoryId, categories.id),
          eq(categoryTranslations.language, dataset.locale),
        ),
      )
      .where(eq(categories.datasetVersionId, dataset.id))
      .orderBy(asc(categories.sortOrder), asc(categoryTranslations.name));

    return {
      categories: rows,
      dataset: this.toSummary(dataset),
    };
  }

  async getItem(
    rawId: unknown,
    rawQuery: Record<string, unknown>,
  ): Promise<{ item: CatalogItem; dataset: ActiveDatasetSummary }> {
    const query = parseCatalogQuery(rawQuery, { pagination: false });
    const itemId = Number(rawId);
    if (!Number.isSafeInteger(itemId) || itemId < 1) {
      throw new NotFoundException('Item não encontrado.');
    }
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset) throw new NotFoundException('Não há catálogo ativo para esta região.');

    const [row] = await this.database.db
      .select({
        id: items.id,
        name: itemTranslations.name,
        description: itemTranslations.description,
        grade: itemVersions.grade,
        weight: itemVersions.weight,
        category: itemVersions.category,
        icon: itemVersions.icon,
      })
      .from(itemVersions)
      .innerJoin(items, eq(items.id, itemVersions.itemId))
      .innerJoin(
        itemTranslations,
        and(
          eq(itemTranslations.datasetVersionId, itemVersions.datasetVersionId),
          eq(itemTranslations.itemId, itemVersions.itemId),
          eq(itemTranslations.language, dataset.locale),
        ),
      )
      .where(and(eq(itemVersions.datasetVersionId, dataset.id), eq(items.id, itemId)))
      .limit(1);

    if (!row) throw new NotFoundException('Item não encontrado no catálogo ativo.');
    const categoryMap = await this.categoriesByItem(dataset.id, dataset.locale, [itemId]);
    return {
      item: { ...row, categories: categoryMap.get(itemId) ?? [] },
      dataset: this.toSummary(dataset),
    };
  }

  async getItemRecipes(
    rawId: unknown,
    rawQuery: Record<string, unknown>,
    rawDirection: unknown,
  ): Promise<CatalogRecipesResponse> {
    const query = parseCatalogQuery(rawQuery, { pagination: false });
    const direction = rawDirection === undefined ? 'produces' : rawDirection;
    if (direction !== 'produces' && direction !== 'uses') {
      throw new BadRequestException({
        code: 'INVALID_RECIPE_DIRECTION',
        message: 'direction deve ser produces ou uses.',
      });
    }

    const itemId = Number(rawId);
    if (!Number.isSafeInteger(itemId) || itemId < 1) {
      throw new NotFoundException('Item não encontrado.');
    }
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset) return { recipes: [], total: 0, direction, dataset: null };

    const [itemVersion] = await this.database.db
      .select({ itemId: itemVersions.itemId })
      .from(itemVersions)
      .where(and(eq(itemVersions.datasetVersionId, dataset.id), eq(itemVersions.itemId, itemId)))
      .limit(1);
    if (!itemVersion) throw new NotFoundException('Item não encontrado no catálogo ativo.');

    const relation = direction === 'produces' ? recipeOutputs : recipeIngredients;
    const relationFilter = and(
      eq(relation.datasetVersionId, dataset.id),
      eq(relation.itemId, itemId),
    );
    const [relatedCount] = await this.database.db
      .select({ total: sql<number>`count(distinct ${relation.recipeKey})` })
      .from(relation)
      .where(relationFilter);
    const related = await this.database.db
      .select({ key: relation.recipeKey })
      .from(relation)
      .where(relationFilter)
      .orderBy(asc(relation.recipeKey))
      .limit(50);
    const keys = [...new Set(related.map((row) => row.key))];
    if (!keys.length) {
      return {
        recipes: [],
        total: 0,
        direction,
        dataset: this.toSummary(dataset),
      };
    }

    const recipeRows = await this.database.db
      .select({
        key: recipes.recipeKey,
        type: recipes.recipeType,
        station: recipes.station,
      })
      .from(recipes)
      .where(and(eq(recipes.datasetVersionId, dataset.id), inArray(recipes.recipeKey, keys)))
      .orderBy(asc(recipes.recipeType), asc(recipes.recipeKey));

    const [inputRows, outputRows] = await Promise.all([
      this.database.db
        .select({
          recipeKey: recipeIngredients.recipeKey,
          itemId: recipeIngredients.itemId,
          name: itemTranslations.name,
          quantity: recipeIngredients.quantity,
        })
        .from(recipeIngredients)
        .innerJoin(
          itemTranslations,
          and(
            eq(itemTranslations.datasetVersionId, recipeIngredients.datasetVersionId),
            eq(itemTranslations.itemId, recipeIngredients.itemId),
            eq(itemTranslations.language, dataset.locale),
          ),
        )
        .where(
          and(
            eq(recipeIngredients.datasetVersionId, dataset.id),
            inArray(recipeIngredients.recipeKey, keys),
          ),
        )
        .orderBy(asc(recipeIngredients.recipeKey), asc(recipeIngredients.position)),
      this.database.db
        .select({
          recipeKey: recipeOutputs.recipeKey,
          itemId: recipeOutputs.itemId,
          name: itemTranslations.name,
          quantity: recipeOutputs.quantity,
        })
        .from(recipeOutputs)
        .innerJoin(
          itemTranslations,
          and(
            eq(itemTranslations.datasetVersionId, recipeOutputs.datasetVersionId),
            eq(itemTranslations.itemId, recipeOutputs.itemId),
            eq(itemTranslations.language, dataset.locale),
          ),
        )
        .where(
          and(
            eq(recipeOutputs.datasetVersionId, dataset.id),
            inArray(recipeOutputs.recipeKey, keys),
          ),
        )
        .orderBy(asc(recipeOutputs.recipeKey), asc(recipeOutputs.position)),
    ]);

    const inputsByRecipe = new Map<string, CatalogRecipe['inputs']>();
    const outputsByRecipe = new Map<string, CatalogRecipe['outputs']>();
    for (const row of inputRows) {
      inputsByRecipe.set(row.recipeKey, [
        ...(inputsByRecipe.get(row.recipeKey) ?? []),
        { itemId: row.itemId, name: row.name, quantity: row.quantity },
      ]);
    }
    for (const row of outputRows) {
      outputsByRecipe.set(row.recipeKey, [
        ...(outputsByRecipe.get(row.recipeKey) ?? []),
        { itemId: row.itemId, name: row.name, quantity: row.quantity },
      ]);
    }

    return {
      recipes: recipeRows.map((recipe) => ({
        ...recipe,
        inputs: inputsByRecipe.get(recipe.key) ?? [],
        outputs: outputsByRecipe.get(recipe.key) ?? [],
      })),
      total: Number(relatedCount?.total ?? 0),
      direction,
      dataset: this.toSummary(dataset),
    };
  }

  private itemFilters(query: CatalogQuery, datasetVersionId: string): SQL[] {
    const filters: SQL[] = [
      eq(itemVersions.datasetVersionId, datasetVersionId),
      eq(itemTranslations.datasetVersionId, datasetVersionId),
    ];
    if (query.grade) filters.push(eq(itemVersions.grade, query.grade));
    if (query.search) {
      filters.push(
        sql`lower(${itemTranslations.name}) like ${`${query.search.toLocaleLowerCase('en-US')}%`}`,
      );
    }
    return filters;
  }

  private async categoriesByItem(
    datasetVersionId: string,
    locale: string,
    itemIds: number[],
  ): Promise<Map<number, CatalogCategory[]>> {
    const result = new Map<number, CatalogCategory[]>();
    if (!itemIds.length) return result;
    const rows = await this.database.db
      .select({
        itemId: itemCategories.itemId,
        id: categories.id,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
        name: categoryTranslations.name,
      })
      .from(itemCategories)
      .innerJoin(
        categories,
        and(
          eq(categories.datasetVersionId, itemCategories.datasetVersionId),
          eq(categories.id, itemCategories.categoryId),
        ),
      )
      .innerJoin(
        categoryTranslations,
        and(
          eq(categoryTranslations.datasetVersionId, categories.datasetVersionId),
          eq(categoryTranslations.categoryId, categories.id),
          eq(categoryTranslations.language, locale),
        ),
      )
      .where(
        and(
          eq(itemCategories.datasetVersionId, datasetVersionId),
          inArray(itemCategories.itemId, itemIds),
        ),
      )
      .orderBy(asc(categories.sortOrder), asc(categoryTranslations.name));

    for (const row of rows) {
      const { itemId, ...category } = row;
      result.set(itemId, [...(result.get(itemId) ?? []), category]);
    }
    return result;
  }

  private async getActiveDataset(
    region: string,
    locale?: string,
    preferredLocale = DEFAULT_DATA_LOCALE,
  ) {
    const baseFilter = [
      eq(datasetVersions.source, 'bdo-data-extractor'),
      eq(datasetVersions.region, region),
      eq(datasetVersions.status, 'active'),
    ];
    if (locale) baseFilter.push(eq(datasetVersions.locale, locale));
    const rows = await this.database.db
      .select()
      .from(datasetVersions)
      .where(and(...baseFilter))
      .orderBy(
        sql`case when ${datasetVersions.locale} = ${preferredLocale} then 0 when ${datasetVersions.locale} = ${CATALOG_FALLBACK_LOCALE} then 1 else 2 end`,
        desc(datasetVersions.finishedAt),
      )
      .limit(1);
    return rows[0] ?? null;
  }

  private toSummary(dataset: DatasetVersion) {
    return {
      version: dataset.version,
      region: dataset.region,
      locale: dataset.locale,
      checksum: dataset.checksum,
      itemCount: dataset.itemCount ?? 0,
      recipeCount: dataset.recipeCount ?? 0,
      importedAt: (dataset.finishedAt ?? dataset.startedAt).toISOString(),
    } satisfies ActiveDatasetSummary;
  }
}
