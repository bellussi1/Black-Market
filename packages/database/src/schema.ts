import {
  integer,
  index,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const datasetStatus = pgEnum("dataset_status", [
  "loading",
  "active",
  "failed",
]);

export const datasetVersions = pgTable(
  "dataset_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: varchar("source", { length: 80 }).notNull(),
    version: varchar("version", { length: 120 }).notNull(),
    status: datasetStatus("status").notNull().default("loading"),
    checksum: varchar("checksum", { length: 128 }),
    itemCount: integer("item_count"),
    recipeCount: integer("recipe_count"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("dataset_versions_source_version_uidx").on(
      table.source,
      table.version,
    ),
  ],
);

export const categories = pgTable("categories", {
  id: varchar("id", { length: 120 }).primaryKey(),
  parentId: varchar("parent_id", { length: 120 }).references(
    (): AnyPgColumn => categories.id,
    { onDelete: "set null" },
  ),
  slug: varchar("slug", { length: 160 }).notNull().unique(),
  sortOrder: integer("sort_order").notNull().default(0),
  datasetVersionId: uuid("dataset_version_id")
    .notNull()
    .references(() => datasetVersions.id),
});

export const items = pgTable("items", {
  id: integer("id").primaryKey(),
  grade: smallint("grade"),
  weight: numeric("weight", { precision: 12, scale: 4 }),
  datasetVersionId: uuid("dataset_version_id")
    .notNull()
    .references(() => datasetVersions.id),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const itemTranslations = pgTable(
  "item_translations",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    language: varchar("language", { length: 8 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    datasetVersionId: uuid("dataset_version_id")
      .notNull()
      .references(() => datasetVersions.id),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.language] })],
);

export const itemCategories = pgTable(
  "item_categories",
  {
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id", { length: 120 })
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.categoryId] })],
);

export const recipes = pgTable("recipes", {
  recipeKey: varchar("recipe_key", { length: 64 }).primaryKey(),
  recipeType: varchar("recipe_type", { length: 80 }).notNull(),
  station: varchar("station", { length: 120 }),
  datasetVersionId: uuid("dataset_version_id")
    .notNull()
    .references(() => datasetVersions.id),
});

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    recipeKey: varchar("recipe_key", { length: 64 })
      .notNull()
      .references(() => recipes.recipeKey, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.recipeKey, table.position] })],
);

export const recipeOutputs = pgTable(
  "recipe_outputs",
  {
    recipeKey: varchar("recipe_key", { length: 64 })
      .notNull()
      .references(() => recipes.recipeKey, { onDelete: "cascade" }),
    position: smallint("position").notNull(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id),
    quantity: numeric("quantity", { precision: 14, scale: 4 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.recipeKey, table.position] })],
);

export const marketCurrentPrices = pgTable(
  "market_current_prices",
  {
    region: varchar("region", { length: 12 }).notNull(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    minPrice: numeric("min_price", { precision: 22, scale: 0 }),
    maxPrice: numeric("max_price", { precision: 22, scale: 0 }),
    lastSoldPrice: numeric("last_sold_price", { precision: 22, scale: 0 }),
    dailyVolume: integer("daily_volume"),
    stock: integer("stock"),
    source: varchar("source", { length: 80 }).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.region, table.itemId] }),
    index("market_current_prices_observed_idx").on(
      table.region,
      table.observedAt,
    ),
  ],
);

export const marketPricePoints = pgTable(
  "market_price_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    region: varchar("region", { length: 12 }).notNull(),
    itemId: integer("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    minPrice: numeric("min_price", { precision: 22, scale: 0 }),
    maxPrice: numeric("max_price", { precision: 22, scale: 0 }),
    lastSoldPrice: numeric("last_sold_price", { precision: 22, scale: 0 }),
    dailyVolume: integer("daily_volume"),
    stock: integer("stock"),
    source: varchar("source", { length: 80 }).notNull(),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex("market_price_points_deduplicate_uidx").on(
      table.region,
      table.itemId,
      table.source,
      table.observedAt,
    ),
    index("market_price_points_history_idx").on(
      table.region,
      table.itemId,
      table.observedAt,
    ),
  ],
);

export const schema = {
  categories,
  datasetVersions,
  itemCategories,
  itemTranslations,
  items,
  marketCurrentPrices,
  marketPricePoints,
  recipeIngredients,
  recipeOutputs,
  recipes,
};

export type DatasetVersion = typeof datasetVersions.$inferSelect;
export type Item = typeof items.$inferSelect;
export type ItemTranslation = typeof itemTranslations.$inferSelect;
export type Recipe = typeof recipes.$inferSelect;
