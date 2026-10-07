ALTER TYPE "public"."dataset_status" ADD VALUE 'archived' BEFORE 'failed';--> statement-breakpoint
CREATE TABLE "category_translations" (
	"dataset_version_id" uuid NOT NULL,
	"category_id" varchar(120) NOT NULL,
	"language" varchar(8) NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "category_translations_dataset_version_id_category_id_language_pk" PRIMARY KEY("dataset_version_id","category_id","language")
);
--> statement-breakpoint
CREATE TABLE "item_versions" (
	"dataset_version_id" uuid NOT NULL,
	"item_id" integer NOT NULL,
	"grade" varchar(24),
	"weight" numeric(12, 4),
	"icon" text,
	"category" varchar(80),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_versions_dataset_version_id_item_id_pk" PRIMARY KEY("dataset_version_id","item_id")
);
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_slug_unique";--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_parent_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT "categories_dataset_version_id_dataset_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "item_categories" DROP CONSTRAINT "item_categories_item_id_items_id_fk";
--> statement-breakpoint
ALTER TABLE "item_categories" DROP CONSTRAINT "item_categories_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "item_translations" DROP CONSTRAINT "item_translations_item_id_items_id_fk";
--> statement-breakpoint
ALTER TABLE "item_translations" DROP CONSTRAINT "item_translations_dataset_version_id_dataset_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "items" DROP CONSTRAINT "items_dataset_version_id_dataset_versions_id_fk";
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_recipe_key_recipes_recipe_key_fk";
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_item_id_items_id_fk";
--> statement-breakpoint
ALTER TABLE "recipe_outputs" DROP CONSTRAINT "recipe_outputs_recipe_key_recipes_recipe_key_fk";
--> statement-breakpoint
ALTER TABLE "recipe_outputs" DROP CONSTRAINT "recipe_outputs_item_id_items_id_fk";
--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT "recipes_dataset_version_id_dataset_versions_id_fk";
--> statement-breakpoint
DROP INDEX "dataset_versions_source_version_uidx";--> statement-breakpoint
ALTER TABLE "item_categories" DROP CONSTRAINT "item_categories_item_id_category_id_pk";--> statement-breakpoint
ALTER TABLE "item_translations" DROP CONSTRAINT "item_translations_item_id_language_pk";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_recipe_key_position_pk";--> statement-breakpoint
ALTER TABLE "recipe_outputs" DROP CONSTRAINT "recipe_outputs_recipe_key_position_pk";--> statement-breakpoint
ALTER TABLE "dataset_versions" ALTER COLUMN "version" SET DATA TYPE varchar(160);--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ALTER COLUMN "quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_outputs" ALTER COLUMN "quantity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset_versions" ADD COLUMN "region" varchar(12) DEFAULT 'sa' NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset_versions" ADD COLUMN "locale" varchar(8) DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "dataset_versions" ALTER COLUMN "region" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "dataset_versions" ALTER COLUMN "locale" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "item_categories" ADD COLUMN "dataset_version_id" uuid;--> statement-breakpoint
UPDATE "item_categories" AS links SET "dataset_version_id" = source."dataset_version_id" FROM "items" AS source WHERE links."item_id" = source."id";--> statement-breakpoint
ALTER TABLE "item_categories" ALTER COLUMN "dataset_version_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD COLUMN "dataset_version_id" uuid;--> statement-breakpoint
UPDATE "recipe_ingredients" AS ingredients SET "dataset_version_id" = source."dataset_version_id" FROM "recipes" AS source WHERE ingredients."recipe_key" = source."recipe_key";--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ALTER COLUMN "dataset_version_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_outputs" ADD COLUMN "dataset_version_id" uuid;--> statement-breakpoint
UPDATE "recipe_outputs" AS outputs SET "dataset_version_id" = source."dataset_version_id" FROM "recipes" AS source WHERE outputs."recipe_key" = source."recipe_key";--> statement-breakpoint
ALTER TABLE "recipe_outputs" ALTER COLUMN "dataset_version_id" SET NOT NULL;--> statement-breakpoint
INSERT INTO "item_versions" ("dataset_version_id", "item_id", "grade", "weight", "icon", "category", "updated_at") SELECT "dataset_version_id", "id", "grade"::text, "weight", NULL, NULL, "updated_at" FROM "items" ON CONFLICT DO NOTHING;--> statement-breakpoint
ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "categories_pkey";--> statement-breakpoint
ALTER TABLE "recipes" DROP CONSTRAINT IF EXISTS "recipes_pkey";--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_dataset_version_id_id_pk" PRIMARY KEY("dataset_version_id","id");--> statement-breakpoint
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_dataset_version_id_item_id_category_id_pk" PRIMARY KEY("dataset_version_id","item_id","category_id");--> statement-breakpoint
ALTER TABLE "item_translations" ADD CONSTRAINT "item_translations_dataset_version_id_item_id_language_pk" PRIMARY KEY("dataset_version_id","item_id","language");--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_dataset_version_id_recipe_key_position_pk" PRIMARY KEY("dataset_version_id","recipe_key","position");--> statement-breakpoint
ALTER TABLE "recipe_outputs" ADD CONSTRAINT "recipe_outputs_dataset_version_id_recipe_key_position_pk" PRIMARY KEY("dataset_version_id","recipe_key","position");--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_dataset_version_id_recipe_key_pk" PRIMARY KEY("dataset_version_id","recipe_key");--> statement-breakpoint
ALTER TABLE "category_translations" ADD CONSTRAINT "category_translations_version_category_fk" FOREIGN KEY ("dataset_version_id","category_id") REFERENCES "public"."categories"("dataset_version_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_versions" ADD CONSTRAINT "item_versions_dataset_version_id_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."dataset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_versions" ADD CONSTRAINT "item_versions_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "item_versions_item_id_idx" ON "item_versions" USING btree ("item_id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_version_parent_fk" FOREIGN KEY ("dataset_version_id","parent_id") REFERENCES "public"."categories"("dataset_version_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_dataset_version_id_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."dataset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_version_item_fk" FOREIGN KEY ("dataset_version_id","item_id") REFERENCES "public"."item_versions"("dataset_version_id","item_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_categories" ADD CONSTRAINT "item_categories_version_category_fk" FOREIGN KEY ("dataset_version_id","category_id") REFERENCES "public"."categories"("dataset_version_id","id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_translations" ADD CONSTRAINT "item_translations_version_item_fk" FOREIGN KEY ("dataset_version_id","item_id") REFERENCES "public"."item_versions"("dataset_version_id","item_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_version_recipe_fk" FOREIGN KEY ("dataset_version_id","recipe_key") REFERENCES "public"."recipes"("dataset_version_id","recipe_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_version_item_fk" FOREIGN KEY ("dataset_version_id","item_id") REFERENCES "public"."item_versions"("dataset_version_id","item_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_outputs" ADD CONSTRAINT "recipe_outputs_version_recipe_fk" FOREIGN KEY ("dataset_version_id","recipe_key") REFERENCES "public"."recipes"("dataset_version_id","recipe_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_outputs" ADD CONSTRAINT "recipe_outputs_version_item_fk" FOREIGN KEY ("dataset_version_id","item_id") REFERENCES "public"."item_versions"("dataset_version_id","item_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_dataset_version_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."dataset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "categories_version_slug_uidx" ON "categories" USING btree ("dataset_version_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "dataset_versions_source_version_region_locale_uidx" ON "dataset_versions" USING btree ("source","version","region","locale");--> statement-breakpoint
CREATE UNIQUE INDEX "dataset_versions_one_active_uidx" ON "dataset_versions" USING btree ("source","region","locale") WHERE "dataset_versions"."status" = 'active';--> statement-breakpoint
CREATE INDEX "item_categories_category_idx" ON "item_categories" USING btree ("dataset_version_id","category_id");--> statement-breakpoint
CREATE INDEX "item_translations_name_prefix_idx" ON "item_translations" USING btree (lower("name") text_pattern_ops);--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "grade";--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "weight";--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "dataset_version_id";--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "updated_at";
