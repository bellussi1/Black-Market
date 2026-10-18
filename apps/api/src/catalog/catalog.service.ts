import {
  catalogNameExpression,
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
  CatalogItemDetail,
  CatalogPage,
  CatalogRecipe,
  CatalogRecipesResponse,
  NpcPurchasePricesResponse,
  ProductionCatalogResponse,
  RecipeMarketEquivalentsResponse,
} from '@bdo/shared';
import {
  CATALOG_FALLBACK_LOCALE,
  DEFAULT_DATA_LOCALE,
  LIFE_SKILL_RECIPE_GROUPS,
  LIFE_SKILL_RECIPE_TYPES,
} from '@bdo/shared';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  not,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';

import { DatabaseService } from '../database/database.service';
import { CatalogAssetsService } from './catalog-assets.service';
import { type CatalogQuery, parseCatalogQuery } from './catalog-query';
import { npcPurchasePriceFromCatalog } from './npc-purchase-price';
import { deriveRecipeMarketEquivalents } from './recipe-market-equivalents';

const BYPRODUCT_DESCRIPTION_TERMS = ['subproduto', 'subproducto', 'byproduct'] as const;
const RANDOM_YIELD_DESCRIPTION_TERMS = [
  'aleatoriamente',
  'randomly',
  'probability',
  'probabilidade',
  'probabilidad',
  'chance',
] as const;

function isRandomByproductDescription(description: string | null | undefined): boolean {
  const normalized = description?.toLocaleLowerCase() ?? '';
  return (
    BYPRODUCT_DESCRIPTION_TERMS.some((term) => normalized.includes(term)) &&
    RANDOM_YIELD_DESCRIPTION_TERMS.some((term) => normalized.includes(term))
  );
}

@Injectable()
export class CatalogService {
  constructor(
    private readonly database: DatabaseService,
    private readonly assets: CatalogAssetsService,
  ) {}

  async productionCatalog(rawQuery: Record<string, unknown>): Promise<ProductionCatalogResponse> {
    const query = parseCatalogQuery(rawQuery, { pagination: false });
    // Published dataset rows are immutable and retained when archived. Resolve
    // once, then bind every relation to that ID even if an import activates now.
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset) return { recipes: [], items: [], dataset: null };
    const recipeRows = await this.database.db
      .select({
        key: recipes.recipeKey,
        type: recipes.recipeType,
        station: recipes.station,
        byproductOfItemId: recipes.byproductOfItemId,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.datasetVersionId, dataset.id),
          inArray(recipes.recipeType, LIFE_SKILL_RECIPE_TYPES),
        ),
      )
      .orderBy(asc(recipes.recipeKey));

    const parts = (table: typeof recipeIngredients | typeof recipeOutputs) =>
      this.database.db
        .select({ recipeKey: table.recipeKey, itemId: table.itemId, quantity: table.quantity })
        .from(table)
        .innerJoin(
          recipes,
          and(
            eq(recipes.datasetVersionId, table.datasetVersionId),
            eq(recipes.recipeKey, table.recipeKey),
          ),
        )
        .where(
          and(
            eq(table.datasetVersionId, dataset.id),
            inArray(recipes.recipeType, LIFE_SKILL_RECIPE_TYPES),
          ),
        )
        .orderBy(asc(table.recipeKey), asc(table.position));
    const [inputRows, outputRows, itemRows] = await Promise.all([
      parts(recipeIngredients),
      parts(recipeOutputs),
      this.database.db
        .select({
          id: items.id,
          name: itemTranslations.name,
          description: itemTranslations.description,
          grade: itemVersions.grade,
          weight: itemVersions.weight,
          category: itemVersions.category,
          icon: itemVersions.icon,
          sourceData: itemVersions.sourceData,
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
        .where(
          and(
            eq(itemVersions.datasetVersionId, dataset.id),
            inArray(items.id, this.lifeSkillItemIds(dataset.id)),
          ),
        )
        .orderBy(asc(items.id)),
    ]);
    const categories = await this.categoriesByItem(
      dataset.id,
      dataset.locale,
      itemRows.map((item) => item.id),
    );
    const detailedItems = await Promise.all(
      itemRows.map(async (item) => ({
        ...item,
        iconUrl: await this.assets.getIconUrl(item.id, dataset.checksum),
        categories: categories.get(item.id) ?? [],
      })),
    );
    const itemMap = new Map(detailedItems.map((item) => [item.id, item]));
    const groupParts = (rows: typeof inputRows) => {
      const groups = new Map<string, CatalogRecipe['inputs']>();
      for (const row of rows) {
        const item = itemMap.get(row.itemId);
        groups.set(row.recipeKey, [
          ...(groups.get(row.recipeKey) ?? []),
          {
            itemId: row.itemId,
            name: item?.name ?? `Item #${row.itemId}`,
            quantity: row.quantity,
            iconUrl: item?.iconUrl ?? null,
          },
        ]);
      }
      return groups;
    };
    const inputs = groupParts(inputRows);
    const outputs = groupParts(outputRows);
    const productionRecipes = recipeRows.flatMap((row) => {
      const recipeOutputs = outputs.get(row.key) ?? [];
      const primaryOutput = recipeOutputs[0];
      if (isRandomByproductDescription(itemMap.get(primaryOutput?.itemId ?? -1)?.description))
        return [];
      return [
        {
          ...row,
          inputs: inputs.get(row.key) ?? [],
          outputs: recipeOutputs,
        },
      ];
    });
    return {
      recipes: productionRecipes,
      items: detailedItems,
      dataset: this.toSummary(dataset),
    };
  }

  async listRecipes(rawQuery: Record<string, unknown>) {
    const query = parseCatalogQuery(rawQuery);
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset)
      return { recipes: [], total: 0, page: query.page, pageSize: query.pageSize, dataset: null };
    const types = query.recipeGroup
      ? LIFE_SKILL_RECIPE_GROUPS[query.recipeGroup]
      : LIFE_SKILL_RECIPE_TYPES;
    const filters = [
      eq(recipes.datasetVersionId, dataset.id),
      eq(recipeOutputs.position, 0),
      inArray(recipes.recipeType, [...types]),
      isNull(recipes.byproductOfItemId),
    ];
    const outputDescription = sql`coalesce(${itemTranslations.description}, '')`;
    const byproductDescription = or(
      ...BYPRODUCT_DESCRIPTION_TERMS.map((term) => ilike(outputDescription, `%${term}%`)),
    );
    const randomYieldDescription = or(
      ...RANDOM_YIELD_DESCRIPTION_TERMS.map((term) => ilike(outputDescription, `%${term}%`)),
    );
    if (byproductDescription && randomYieldDescription)
      filters.push(not(and(byproductDescription, randomYieldDescription)!));
    if (query.search)
      for (const word of this.normalizedSearch(query.search).split(/\s+/))
        filters.push(
          sql`${catalogNameExpression(itemTranslations.name)} like ${'%' + word.replace(/[\\%_]/g, '\\$&') + '%'}`,
        );
    const relation = and(
      eq(recipeOutputs.datasetVersionId, recipes.datasetVersionId),
      eq(recipeOutputs.recipeKey, recipes.recipeKey),
    );
    const translated = and(
      eq(itemTranslations.datasetVersionId, recipes.datasetVersionId),
      eq(itemTranslations.itemId, recipeOutputs.itemId),
      eq(itemTranslations.language, dataset.locale),
    );
    const [total] = await this.database.db
      .select({ total: count() })
      .from(recipes)
      .innerJoin(recipeOutputs, relation)
      .innerJoin(itemTranslations, translated)
      .where(and(...filters));
    const rows = await this.database.db
      .select({
        key: recipes.recipeKey,
        type: recipes.recipeType,
        station: recipes.station,
        itemId: recipeOutputs.itemId,
        name: itemTranslations.name,
        quantity: recipeOutputs.quantity,
      })
      .from(recipes)
      .innerJoin(recipeOutputs, relation)
      .innerJoin(itemTranslations, translated)
      .where(and(...filters))
      .orderBy(
        sql`case when ${inArray(recipes.recipeType, [...LIFE_SKILL_RECIPE_GROUPS.cooking])} then 0 when ${inArray(recipes.recipeType, [...LIFE_SKILL_RECIPE_GROUPS.alchemy])} then 1 when ${inArray(recipes.recipeType, [...LIFE_SKILL_RECIPE_GROUPS.processing])} then 2 else 3 end`,
        asc(itemTranslations.name),
        asc(recipes.recipeKey),
      )
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    return {
      recipes: await Promise.all(
        rows.map(async (row) => ({
          ...row,
          iconUrl: await this.assets.getIconUrl(row.itemId, dataset.checksum),
        })),
      ),
      total: Number(total?.total ?? 0),
      page: query.page,
      pageSize: query.pageSize,
      dataset: this.toSummary(dataset),
    };
  }

  async recipe(key: string, rawQuery: Record<string, unknown>) {
    if (key.length > 160) throw new NotFoundException('Receita não encontrada.');
    const query = parseCatalogQuery(rawQuery, { pagination: false });
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset) throw new NotFoundException('Receitas indisponíveis nesta região.');
    const [row] = await this.database.db
      .select({
        key: recipes.recipeKey,
        type: recipes.recipeType,
        station: recipes.station,
        byproductOfItemId: recipes.byproductOfItemId,
      })
      .from(recipes)
      .where(and(eq(recipes.datasetVersionId, dataset.id), eq(recipes.recipeKey, key)))
      .limit(1);
    if (!row) throw new NotFoundException('Receita não encontrada.');
    const parts = async (table: typeof recipeIngredients | typeof recipeOutputs) => {
      const members = await this.database.db
        .select({ itemId: table.itemId, name: itemTranslations.name, quantity: table.quantity })
        .from(table)
        .innerJoin(
          itemTranslations,
          and(
            eq(itemTranslations.datasetVersionId, table.datasetVersionId),
            eq(itemTranslations.itemId, table.itemId),
            eq(itemTranslations.language, dataset.locale),
          ),
        )
        .where(and(eq(table.datasetVersionId, dataset.id), eq(table.recipeKey, key)))
        .orderBy(asc(table.position));
      return Promise.all(
        members.map(async (member) => ({
          ...member,
          iconUrl: await this.assets.getIconUrl(member.itemId, dataset.checksum),
        })),
      );
    };
    const [inputs, outputs] = await Promise.all([parts(recipeIngredients), parts(recipeOutputs)]);
    return { recipe: { ...row, inputs, outputs }, dataset: this.toSummary(dataset) };
  }

  async npcPurchasePrices(rawQuery: Record<string, unknown>): Promise<NpcPurchasePricesResponse> {
    const query = parseCatalogQuery(rawQuery, { pagination: false });
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset || !query.ids?.length)
      return { prices: [], dataset: dataset ? this.toSummary(dataset) : null };

    const rows = await this.database.db
      .select({ itemId: itemVersions.itemId, sourceData: itemVersions.sourceData })
      .from(itemVersions)
      .where(
        and(eq(itemVersions.datasetVersionId, dataset.id), inArray(itemVersions.itemId, query.ids)),
      );
    const verifiedAt = dataset.finishedAt?.toISOString() ?? new Date().toISOString();
    return {
      prices: rows.flatMap((row) => {
        const price = npcPurchasePriceFromCatalog(row.itemId, row.sourceData, verifiedAt);
        return price ? [price] : [];
      }),
      dataset: this.toSummary(dataset),
    };
  }

  async recipeMarketEquivalents(
    rawQuery: Record<string, unknown>,
  ): Promise<RecipeMarketEquivalentsResponse> {
    const query = parseCatalogQuery(rawQuery, { pagination: false });
    if (!query.ids?.length)
      throw new BadRequestException({
        code: 'MISSING_RECIPE_MATERIALS',
        message: 'Informe os IDs dos materiais da receita.',
        field: 'ids',
      });
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset) return { equivalents: [], dataset: null };

    const sourceItems = await this.database.db
      .select({
        id: itemVersions.itemId,
        category: itemVersions.category,
        sourceData: itemVersions.sourceData,
      })
      .from(itemVersions)
      .where(
        and(eq(itemVersions.datasetVersionId, dataset.id), inArray(itemVersions.itemId, query.ids)),
      );
    const eligibleSourceIds = sourceItems
      .filter(
        (item) =>
          item.category === 'Fish' &&
          item.sourceData?.['forTrade'] === true &&
          item.sourceData?.['marketable'] !== true,
      )
      .map((item) => item.id);
    if (!eligibleSourceIds.length) return { equivalents: [], dataset: this.toSummary(dataset) };

    const dryRows = await this.database.db
      .select({
        type: recipes.recipeType,
        recipeKey: recipes.recipeKey,
        sourceItemId: recipeIngredients.itemId,
        inputPosition: recipeIngredients.position,
        inputQuantity: recipeIngredients.quantity,
        itemId: recipeOutputs.itemId,
        outputPosition: recipeOutputs.position,
        outputQuantity: recipeOutputs.quantity,
      })
      .from(recipes)
      .innerJoin(
        recipeIngredients,
        and(
          eq(recipeIngredients.datasetVersionId, recipes.datasetVersionId),
          eq(recipeIngredients.recipeKey, recipes.recipeKey),
        ),
      )
      .innerJoin(
        recipeOutputs,
        and(
          eq(recipeOutputs.datasetVersionId, recipes.datasetVersionId),
          eq(recipeOutputs.recipeKey, recipes.recipeKey),
        ),
      )
      .where(
        and(
          eq(recipes.datasetVersionId, dataset.id),
          eq(recipes.recipeType, 'DRY'),
          inArray(recipeIngredients.itemId, eligibleSourceIds),
        ),
      )
      .orderBy(asc(recipeIngredients.itemId), asc(recipeOutputs.itemId));
    const outputIds = [...new Set(dryRows.map((row) => row.itemId))];
    if (!outputIds.length) return { equivalents: [], dataset: this.toSummary(dataset) };

    const outputItems = await this.database.db
      .select({
        id: itemVersions.itemId,
        name: itemTranslations.name,
        category: itemVersions.category,
        sourceData: itemVersions.sourceData,
      })
      .from(itemVersions)
      .innerJoin(
        itemTranslations,
        and(
          eq(itemTranslations.datasetVersionId, itemVersions.datasetVersionId),
          eq(itemTranslations.itemId, itemVersions.itemId),
          eq(itemTranslations.language, dataset.locale),
        ),
      )
      .where(
        and(eq(itemVersions.datasetVersionId, dataset.id), inArray(itemVersions.itemId, outputIds)),
      );
    const iconUrls = new Map(
      await Promise.all(
        outputItems.map(
          async (item) =>
            [item.id, await this.assets.getIconUrl(item.id, dataset.checksum)] as const,
        ),
      ),
    );
    const recipesByKey = new Map<
      string,
      {
        type: string;
        inputs: Map<number, { itemId: number }>;
        outputs: Map<number, { itemId: number }>;
      }
    >();
    for (const row of dryRows) {
      const recipe = recipesByKey.get(row.recipeKey) ?? {
        type: row.type,
        inputs: new Map<number, { itemId: number }>(),
        outputs: new Map<number, { itemId: number }>(),
      };
      recipe.inputs.set(row.inputPosition, { itemId: row.sourceItemId });
      recipe.outputs.set(row.outputPosition, { itemId: row.itemId });
      recipesByKey.set(row.recipeKey, recipe);
    }
    const equivalents = deriveRecipeMarketEquivalents(
      sourceItems,
      [...recipesByKey.values()].map((recipe) => ({
        type: recipe.type,
        inputs: [...recipe.inputs.values()],
        outputs: [...recipe.outputs.values()],
      })),
      outputItems.map((item) => ({ ...item, iconUrl: iconUrls.get(item.id) ?? null })),
    );
    return { equivalents, dataset: this.toSummary(dataset) };
  }

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
      .orderBy(...this.itemOrder(query))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);

    const categoryMap = await this.categoriesByItem(
      dataset.id,
      dataset.locale,
      rows.map((row) => row.id),
    );
    return {
      items: await Promise.all(
        rows.map(async (row) => ({
          ...row,
          iconUrl: await this.assets.getIconUrl(row.id, dataset.checksum),
          categories: categoryMap.get(row.id) ?? [],
        })),
      ),
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

    const filters: SQL[] = [eq(categories.datasetVersionId, dataset.id)];
    if (query.scope === 'life-skill')
      filters.push(
        inArray(
          categories.id,
          sql`(
      select ${itemCategories.categoryId} from ${itemCategories}
      where ${itemCategories.datasetVersionId} = ${dataset.id}
        and ${inArray(itemCategories.itemId, this.lifeSkillItemIds(dataset.id))}
    )`,
        ),
      );

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
      .where(and(...filters))
      .orderBy(asc(categories.sortOrder), asc(categoryTranslations.name));

    return {
      categories: rows,
      dataset: this.toSummary(dataset),
    };
  }

  async getItem(
    rawId: unknown,
    rawQuery: Record<string, unknown>,
  ): Promise<{ item: CatalogItemDetail; dataset: ActiveDatasetSummary }> {
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
        sourceData: itemVersions.sourceData,
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
      item: {
        ...row,
        iconUrl: await this.assets.getIconUrl(row.id, dataset.checksum),
        categories: categoryMap.get(itemId) ?? [],
      },
      dataset: this.toSummary(dataset),
    };
  }

  async getItemRecipes(
    rawId: unknown,
    rawQuery: Record<string, unknown>,
    rawDirection: unknown,
  ): Promise<CatalogRecipesResponse> {
    const query = parseCatalogQuery({ ...rawQuery, pageSize: rawQuery['pageSize'] ?? 50 });
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
    if (!dataset)
      return {
        recipes: [],
        total: 0,
        direction,
        dataset: null,
        page: query.page,
        pageSize: query.pageSize,
      };

    const [itemVersion] = await this.database.db
      .select({ itemId: itemVersions.itemId, description: itemTranslations.description })
      .from(itemVersions)
      .innerJoin(
        itemTranslations,
        and(
          eq(itemTranslations.datasetVersionId, itemVersions.datasetVersionId),
          eq(itemTranslations.itemId, itemVersions.itemId),
          eq(itemTranslations.language, dataset.locale),
        ),
      )
      .where(and(eq(itemVersions.datasetVersionId, dataset.id), eq(itemVersions.itemId, itemId)))
      .limit(1);
    if (!itemVersion) throw new NotFoundException('Item não encontrado no catálogo ativo.');
    if (direction === 'produces' && isRandomByproductDescription(itemVersion.description))
      return {
        recipes: [],
        total: 0,
        direction,
        dataset: this.toSummary(dataset),
        page: query.page,
        pageSize: query.pageSize,
      };

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
      .selectDistinct({ key: relation.recipeKey })
      .from(relation)
      .where(relationFilter)
      .orderBy(asc(relation.recipeKey))
      .limit(query.pageSize)
      .offset((query.page - 1) * query.pageSize);
    const keys = [...new Set(related.map((row) => row.key))];
    if (!keys.length) {
      return {
        recipes: [],
        total: Number(relatedCount?.total ?? 0),
        direction,
        dataset: this.toSummary(dataset),
        page: query.page,
        pageSize: query.pageSize,
      };
    }

    const recipeRows = await this.database.db
      .select({
        key: recipes.recipeKey,
        type: recipes.recipeType,
        station: recipes.station,
        byproductOfItemId: recipes.byproductOfItemId,
      })
      .from(recipes)
      .where(and(eq(recipes.datasetVersionId, dataset.id), inArray(recipes.recipeKey, keys)))
      .orderBy(asc(recipes.recipeType), asc(recipes.recipeKey));
    const recipeDetails = await this.loadRecipeDetails(dataset, recipeRows);
    return {
      recipes: recipeDetails,
      total: Number(relatedCount?.total ?? 0),
      direction,
      dataset: this.toSummary(dataset),
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async getByproductRecipes(rawQuery: Record<string, unknown>): Promise<CatalogRecipesResponse> {
    const query = parseCatalogQuery(rawQuery, { pagination: false });
    if (!query.ids?.length)
      throw new BadRequestException({
        code: 'MISSING_BYPRODUCT_ITEMS',
        message: 'Informe de 1 a 100 IDs de produtos-base.',
        field: 'ids',
      });
    const dataset = await this.getActiveDataset(query.region, query.locale, query.preferredLocale);
    if (!dataset) return { recipes: [], total: 0, direction: 'byproducts', dataset: null };

    const recipeRows = await this.database.db
      .select({
        key: recipes.recipeKey,
        type: recipes.recipeType,
        station: recipes.station,
        byproductOfItemId: recipes.byproductOfItemId,
      })
      .from(recipes)
      .where(
        and(
          eq(recipes.datasetVersionId, dataset.id),
          inArray(recipes.byproductOfItemId, query.ids),
          inArray(recipes.recipeType, LIFE_SKILL_RECIPE_TYPES),
        ),
      )
      .orderBy(asc(recipes.byproductOfItemId), asc(recipes.recipeKey));
    const recipeDetails = await this.loadRecipeDetails(dataset, recipeRows);
    return {
      recipes: recipeDetails,
      total: recipeDetails.length,
      direction: 'byproducts',
      dataset: this.toSummary(dataset),
    };
  }

  private async loadRecipeDetails(
    dataset: DatasetVersion,
    recipeRows: {
      key: string;
      type: string;
      station: string | null;
      byproductOfItemId: number | null;
    }[],
  ): Promise<CatalogRecipe[]> {
    const keys = [...new Set(recipeRows.map((recipe) => recipe.key))];
    if (!keys.length) return [];
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
    const icons = new Map(
      await Promise.all(
        [...new Set([...inputRows, ...outputRows].map((row) => row.itemId))].map(
          async (id) => [id, await this.assets.getIconUrl(id, dataset.checksum)] as const,
        ),
      ),
    );
    for (const row of inputRows) {
      inputsByRecipe.set(row.recipeKey, [
        ...(inputsByRecipe.get(row.recipeKey) ?? []),
        {
          itemId: row.itemId,
          name: row.name,
          quantity: row.quantity,
          iconUrl: icons.get(row.itemId) ?? null,
        },
      ]);
    }
    for (const row of outputRows) {
      outputsByRecipe.set(row.recipeKey, [
        ...(outputsByRecipe.get(row.recipeKey) ?? []),
        {
          itemId: row.itemId,
          name: row.name,
          quantity: row.quantity,
          iconUrl: icons.get(row.itemId) ?? null,
        },
      ]);
    }
    return recipeRows.map((recipe) => ({
      ...recipe,
      inputs: inputsByRecipe.get(recipe.key) ?? [],
      outputs: outputsByRecipe.get(recipe.key) ?? [],
    }));
  }

  private itemFilters(query: CatalogQuery, datasetVersionId: string): SQL[] {
    const filters: SQL[] = [
      eq(itemVersions.datasetVersionId, datasetVersionId),
      eq(itemTranslations.datasetVersionId, datasetVersionId),
    ];
    if (query.ids) filters.push(inArray(items.id, query.ids));
    if (query.grade) filters.push(eq(itemVersions.grade, query.grade));
    if (query.scope === 'life-skill') {
      // Build the complete membership set before counting or paginating. Materials
      // without their own recipe remain searchable through their ingredient link.
      filters.push(inArray(items.id, this.lifeSkillItemIds(datasetVersionId)));
    }
    if (query.search) {
      if (/^[1-9]\d*$/.test(query.search) && Number(query.search) <= 2147483647) {
        filters.push(eq(items.id, Number(query.search)));
      } else {
        for (const word of this.normalizedSearch(query.search).split(/\s+/).filter(Boolean)) {
          const literal = word.replace(/[\\%_]/g, '\\$&');
          filters.push(sql`${catalogNameExpression(itemTranslations.name)} like ${`%${literal}%`}`);
        }
      }
    }
    return filters;
  }

  private lifeSkillItemIds(datasetVersionId: string): SQL {
    const allowed = inArray(recipes.recipeType, LIFE_SKILL_RECIPE_TYPES);
    return sql`(
        select ${recipeIngredients.itemId} from ${recipeIngredients}
        inner join ${recipes} on ${recipes.datasetVersionId} = ${recipeIngredients.datasetVersionId}
          and ${recipes.recipeKey} = ${recipeIngredients.recipeKey}
        where ${recipes.datasetVersionId} = ${datasetVersionId} and ${allowed}
        union
        select ${recipeOutputs.itemId} from ${recipeOutputs}
        inner join ${recipes} on ${recipes.datasetVersionId} = ${recipeOutputs.datasetVersionId}
          and ${recipes.recipeKey} = ${recipeOutputs.recipeKey}
        where ${recipes.datasetVersionId} = ${datasetVersionId} and ${allowed}
      )`;
  }

  private normalizedSearch(value: string): string {
    return value.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').trim();
  }

  private itemOrder(query: CatalogQuery): SQL[] {
    const ordering = [asc(itemTranslations.name), asc(items.id)];
    if (!query.search) return ordering;
    const name = catalogNameExpression(itemTranslations.name);
    const search = this.normalizedSearch(query.search);
    const prefix = search.replace(/[\\%_]/g, '\\$&') + '%';
    return [
      sql`case when ${name} = ${search} then 0 when ${name} like ${prefix} then 1 else 2 end`,
      ...ordering,
    ];
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

  async getActiveDataset(
    region: string,
    locale?: string,
    preferredLocale = DEFAULT_DATA_LOCALE,
  ): Promise<DatasetVersion | null> {
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
