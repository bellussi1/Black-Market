import { sql, type SQLWrapper } from 'drizzle-orm';
import {
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const datasetStatus = pgEnum('dataset_status', ['loading', 'active', 'archived', 'failed']);

/** Keep the indexed expression identical to the catalog query expression. */
export function catalogNameExpression(name: SQLWrapper) {
  return sql`translate(lower(${name}), 'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn')`;
}

export const datasetVersions = pgTable(
  'dataset_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: varchar('source', { length: 80 }).notNull(),
    version: varchar('version', { length: 160 }).notNull(),
    region: varchar('region', { length: 12 }).notNull(),
    locale: varchar('locale', { length: 8 }).notNull(),
    status: datasetStatus('status').notNull().default('loading'),
    checksum: varchar('checksum', { length: 128 }),
    itemCount: integer('item_count'),
    recipeCount: integer('recipe_count'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('dataset_versions_source_version_region_locale_uidx').on(
      table.source,
      table.version,
      table.region,
      table.locale,
    ),
    uniqueIndex('dataset_versions_one_active_uidx')
      .on(table.source, table.region, table.locale)
      .where(sql`${table.status} = 'active'`),
  ],
);

// Item ids are stable across client extracts. Mutable catalog attributes are
// versioned separately so a failed or newer import cannot erase the last good set.
export const items = pgTable('items', {
  id: integer('id').primaryKey(),
});

export const itemVersions = pgTable(
  'item_versions',
  {
    datasetVersionId: uuid('dataset_version_id')
      .notNull()
      .references(() => datasetVersions.id, { onDelete: 'cascade' }),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    grade: varchar('grade', { length: 24 }),
    weight: numeric('weight', { precision: 12, scale: 4 }),
    icon: text('icon'),
    category: varchar('category', { length: 80 }),
    sourceData: jsonb('source_data').$type<Record<string, unknown>>().notNull().default({}),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.datasetVersionId, table.itemId] }),
    index('item_versions_item_id_idx').on(table.itemId),
  ],
);

export const itemTranslations = pgTable(
  'item_translations',
  {
    datasetVersionId: uuid('dataset_version_id').notNull(),
    itemId: integer('item_id').notNull(),
    language: varchar('language', { length: 8 }).notNull(),
    name: text('name').notNull(),
    description: text('description'),
  },
  (table) => [
    primaryKey({
      columns: [table.datasetVersionId, table.itemId, table.language],
    }),
    foreignKey({
      name: 'item_translations_version_item_fk',
      columns: [table.datasetVersionId, table.itemId],
      foreignColumns: [itemVersions.datasetVersionId, itemVersions.itemId],
    }).onDelete('cascade'),
    index('item_translations_name_prefix_idx').using(
      'btree',
      sql`lower(${table.name}) text_pattern_ops`,
    ),
    index('item_translations_name_search_idx').using(
      'gin',
      sql`${catalogNameExpression(table.name)} gin_trgm_ops`,
    ),
  ],
);

export const categories = pgTable(
  'categories',
  {
    datasetVersionId: uuid('dataset_version_id')
      .notNull()
      .references(() => datasetVersions.id, { onDelete: 'cascade' }),
    id: varchar('id', { length: 120 }).notNull(),
    parentId: varchar('parent_id', { length: 120 }),
    slug: varchar('slug', { length: 160 }).notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
  },
  (table) => [
    primaryKey({ columns: [table.datasetVersionId, table.id] }),
    uniqueIndex('categories_version_slug_uidx').on(table.datasetVersionId, table.slug),
    foreignKey({
      name: 'categories_version_parent_fk',
      columns: [table.datasetVersionId, table.parentId],
      foreignColumns: [table.datasetVersionId, table.id],
    }).onDelete('cascade'),
  ],
);

export const categoryTranslations = pgTable(
  'category_translations',
  {
    datasetVersionId: uuid('dataset_version_id').notNull(),
    categoryId: varchar('category_id', { length: 120 }).notNull(),
    language: varchar('language', { length: 8 }).notNull(),
    name: text('name').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.datasetVersionId, table.categoryId, table.language],
    }),
    foreignKey({
      name: 'category_translations_version_category_fk',
      columns: [table.datasetVersionId, table.categoryId],
      foreignColumns: [categories.datasetVersionId, categories.id],
    }).onDelete('cascade'),
  ],
);

export const itemCategories = pgTable(
  'item_categories',
  {
    datasetVersionId: uuid('dataset_version_id').notNull(),
    itemId: integer('item_id').notNull(),
    categoryId: varchar('category_id', { length: 120 }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.datasetVersionId, table.itemId, table.categoryId],
    }),
    foreignKey({
      name: 'item_categories_version_item_fk',
      columns: [table.datasetVersionId, table.itemId],
      foreignColumns: [itemVersions.datasetVersionId, itemVersions.itemId],
    }).onDelete('cascade'),
    foreignKey({
      name: 'item_categories_version_category_fk',
      columns: [table.datasetVersionId, table.categoryId],
      foreignColumns: [categories.datasetVersionId, categories.id],
    }).onDelete('cascade'),
    index('item_categories_category_idx').on(table.datasetVersionId, table.categoryId),
  ],
);

export const recipes = pgTable(
  'recipes',
  {
    datasetVersionId: uuid('dataset_version_id').notNull(),
    recipeKey: varchar('recipe_key', { length: 64 }).notNull(),
    recipeType: varchar('recipe_type', { length: 80 }).notNull(),
    station: varchar('station', { length: 120 }),
    byproductOfItemId: integer('byproduct_of_item_id'),
  },
  (table) => [
    primaryKey({ columns: [table.datasetVersionId, table.recipeKey] }),
    foreignKey({
      name: 'recipes_dataset_version_fk',
      columns: [table.datasetVersionId],
      foreignColumns: [datasetVersions.id],
    }).onDelete('cascade'),
    foreignKey({
      name: 'recipes_byproduct_version_item_fk',
      columns: [table.datasetVersionId, table.byproductOfItemId],
      foreignColumns: [itemVersions.datasetVersionId, itemVersions.itemId],
    }),
  ],
);

export const recipeIngredients = pgTable(
  'recipe_ingredients',
  {
    datasetVersionId: uuid('dataset_version_id').notNull(),
    recipeKey: varchar('recipe_key', { length: 64 }).notNull(),
    position: smallint('position').notNull(),
    itemId: integer('item_id').notNull(),
    quantity: numeric('quantity', { precision: 14, scale: 4 }),
  },
  (table) => [
    primaryKey({
      columns: [table.datasetVersionId, table.recipeKey, table.position],
    }),
    foreignKey({
      name: 'recipe_ingredients_version_recipe_fk',
      columns: [table.datasetVersionId, table.recipeKey],
      foreignColumns: [recipes.datasetVersionId, recipes.recipeKey],
    }).onDelete('cascade'),
    foreignKey({
      name: 'recipe_ingredients_version_item_fk',
      columns: [table.datasetVersionId, table.itemId],
      foreignColumns: [itemVersions.datasetVersionId, itemVersions.itemId],
    }).onDelete('cascade'),
  ],
);

export const recipeOutputs = pgTable(
  'recipe_outputs',
  {
    datasetVersionId: uuid('dataset_version_id').notNull(),
    recipeKey: varchar('recipe_key', { length: 64 }).notNull(),
    position: smallint('position').notNull(),
    itemId: integer('item_id').notNull(),
    quantity: numeric('quantity', { precision: 14, scale: 4 }),
  },
  (table) => [
    primaryKey({
      columns: [table.datasetVersionId, table.recipeKey, table.position],
    }),
    foreignKey({
      name: 'recipe_outputs_version_recipe_fk',
      columns: [table.datasetVersionId, table.recipeKey],
      foreignColumns: [recipes.datasetVersionId, recipes.recipeKey],
    }).onDelete('cascade'),
    foreignKey({
      name: 'recipe_outputs_version_item_fk',
      columns: [table.datasetVersionId, table.itemId],
      foreignColumns: [itemVersions.datasetVersionId, itemVersions.itemId],
    }).onDelete('cascade'),
  ],
);

// Market observations attach to stable game item ids, independently of which
// client extract is currently published.
export const marketCurrentPrices = pgTable(
  'market_current_prices',
  {
    region: varchar('region', { length: 12 }).notNull(),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    minPrice: numeric('min_price', { precision: 22, scale: 0 }),
    maxPrice: numeric('max_price', { precision: 22, scale: 0 }),
    lastSoldPrice: numeric('last_sold_price', { precision: 22, scale: 0 }),
    dailyVolume: integer('daily_volume'),
    stock: integer('stock'),
    source: varchar('source', { length: 80 }).notNull(),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.region, table.itemId] }),
    index('market_current_prices_observed_idx').on(table.region, table.observedAt),
  ],
);

export const marketPricePoints = pgTable(
  'market_price_points',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    region: varchar('region', { length: 12 }).notNull(),
    itemId: integer('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    minPrice: numeric('min_price', { precision: 22, scale: 0 }),
    maxPrice: numeric('max_price', { precision: 22, scale: 0 }),
    lastSoldPrice: numeric('last_sold_price', { precision: 22, scale: 0 }),
    dailyVolume: integer('daily_volume'),
    stock: integer('stock'),
    source: varchar('source', { length: 80 }).notNull(),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('market_price_points_deduplicate_uidx').on(
      table.region,
      table.itemId,
      table.source,
      table.observedAt,
    ),
    index('market_price_points_history_idx').on(table.region, table.itemId, table.observedAt),
  ],
);

export const referenceRecords = pgTable(
  'reference_records',
  {
    datasetVersionId: uuid('dataset_version_id')
      .notNull()
      .references(() => datasetVersions.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 40 }).notNull(),
    id: varchar('id', { length: 120 }).notNull(),
    name: text('name').notNull(),
    searchName: text('search_name').notNull(),
    data: jsonb('data').$type<Record<string, unknown>>().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.datasetVersionId, table.kind, table.id] }),
    index('reference_name_search_idx').using('gin', sql`${table.searchName} gin_trgm_ops`),
  ],
);

export const referenceCollections = pgTable(
  'reference_collections',
  {
    datasetVersionId: uuid('dataset_version_id')
      .notNull()
      .references(() => datasetVersions.id, { onDelete: 'cascade' }),
    kind: varchar('kind', { length: 40 }).notNull(),
    checksum: varchar('checksum', { length: 64 }).notNull(),
    count: integer('count').notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.datasetVersionId, table.kind] })],
);

export const userWorkspaces = pgTable('user_workspaces', {
  userId: uuid('user_id').primaryKey(),
  version: integer('version').notNull().default(1),
  data: jsonb('data').$type<Record<string, unknown>>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const marketSnapshots = pgTable(
  'market_snapshots',
  {
    region: varchar('region', { length: 12 }).notNull(),
    itemId: integer('item_id').notNull(),
    subId: integer('sub_id').notNull(),
    locale: varchar('locale', { length: 8 }).notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.region, table.itemId, table.subId, table.locale, table.fetchedAt],
    }),
    index('market_snapshots_history_idx').on(
      table.region,
      table.itemId,
      table.subId,
      table.fetchedAt,
    ),
  ],
);

export const schema = {
  referenceRecords,
  referenceCollections,
  userWorkspaces,
  marketSnapshots,
  categories,
  categoryTranslations,
  datasetVersions,
  itemCategories,
  itemTranslations,
  itemVersions,
  items,
  marketCurrentPrices,
  marketPricePoints,
  recipeIngredients,
  recipeOutputs,
  recipes,
};

export type DatasetVersion = typeof datasetVersions.$inferSelect;
export type Item = typeof items.$inferSelect;
export type ItemVersion = typeof itemVersions.$inferSelect;
export type ItemTranslation = typeof itemTranslations.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
