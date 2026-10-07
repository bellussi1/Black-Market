CREATE TYPE "public"."dataset_status" AS ENUM('loading', 'active', 'failed');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar(120) PRIMARY KEY NOT NULL,
	"parent_id" varchar(120),
	"slug" varchar(160) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"dataset_version_id" uuid NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "dataset_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" varchar(80) NOT NULL,
	"version" varchar(120) NOT NULL,
	"status" "dataset_status" DEFAULT 'loading' NOT NULL,
	"checksum" varchar(128),
	"item_count" integer,
	"recipe_count" integer,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "item_categories" (
	"item_id" integer NOT NULL,
	"category_id" varchar(120) NOT NULL,
	CONSTRAINT "item_categories_item_id_category_id_pk" PRIMARY KEY("item_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "item_translations" (
	"item_id" integer NOT NULL,
	"language" varchar(8) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"dataset_version_id" uuid NOT NULL,
	CONSTRAINT "item_translations_item_id_language_pk" PRIMARY KEY("item_id","language")
);
--> statement-breakpoint
CREATE TABLE "items" (
	"id" integer PRIMARY KEY NOT NULL,
	"grade" smallint,
	"weight" numeric(12, 4),
	"dataset_version_id" uuid NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_current_prices" (
	"region" varchar(12) NOT NULL,
	"item_id" integer NOT NULL,
	"min_price" numeric(22, 0),
	"max_price" numeric(22, 0),
	"last_sold_price" numeric(22, 0),
	"daily_volume" integer,
	"stock" integer,
	"source" varchar(80) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_current_prices_region_item_id_pk" PRIMARY KEY("region","item_id")
);
--> statement-breakpoint
CREATE TABLE "market_price_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region" varchar(12) NOT NULL,
	"item_id" integer NOT NULL,
	"min_price" numeric(22, 0),
	"max_price" numeric(22, 0),
	"last_sold_price" numeric(22, 0),
	"daily_volume" integer,
	"stock" integer,
	"source" varchar(80) NOT NULL,
	"observed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"recipe_key" varchar(64) NOT NULL,
	"position" smallint NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	CONSTRAINT "recipe_ingredients_recipe_key_position_pk" PRIMARY KEY("recipe_key","position")
);
--> statement-breakpoint
CREATE TABLE "recipe_outputs" (
	"recipe_key" varchar(64) NOT NULL,
	"position" smallint NOT NULL,
	"item_id" integer NOT NULL,
	"quantity" numeric(14, 4) NOT NULL,
	CONSTRAINT "recipe_outputs_recipe_key_position_pk" PRIMARY KEY("recipe_key","position")
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"recipe_key" varchar(64) PRIMARY KEY NOT NULL,
	"recipe_type" varchar(80) NOT NULL,
	"station" varchar(120),
	"dataset_version_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_dataset_version_id_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."dataset_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_translations" ADD CONSTRAINT "item_translations_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_translations" ADD CONSTRAINT "item_translations_dataset_version_id_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."dataset_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_dataset_version_id_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."dataset_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_current_prices" ADD CONSTRAINT "market_current_prices_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_price_points" ADD CONSTRAINT "market_price_points_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_key_recipes_recipe_key_fk" FOREIGN KEY ("recipe_key") REFERENCES "public"."recipes"("recipe_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_outputs" ADD CONSTRAINT "recipe_outputs_recipe_key_recipes_recipe_key_fk" FOREIGN KEY ("recipe_key") REFERENCES "public"."recipes"("recipe_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_outputs" ADD CONSTRAINT "recipe_outputs_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_dataset_version_id_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."dataset_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dataset_versions_source_version_uidx" ON "dataset_versions" USING btree ("source","version");--> statement-breakpoint
CREATE INDEX "market_current_prices_observed_idx" ON "market_current_prices" USING btree ("region","observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "market_price_points_deduplicate_uidx" ON "market_price_points" USING btree ("region","item_id","source","observed_at");--> statement-breakpoint
CREATE INDEX "market_price_points_history_idx" ON "market_price_points" USING btree ("region","item_id","observed_at");