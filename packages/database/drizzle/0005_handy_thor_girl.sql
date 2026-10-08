CREATE TABLE "market_snapshots" (
	"region" varchar(12) NOT NULL,
	"item_id" integer NOT NULL,
	"sub_id" integer NOT NULL,
	"locale" varchar(8) NOT NULL,
	"payload" jsonb NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "market_snapshots_region_item_id_sub_id_locale_fetched_at_pk" PRIMARY KEY("region","item_id","sub_id","locale","fetched_at")
);
--> statement-breakpoint
CREATE TABLE "reference_collections" (
	"dataset_version_id" uuid NOT NULL,
	"kind" varchar(40) NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"count" integer NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reference_collections_dataset_version_id_kind_pk" PRIMARY KEY("dataset_version_id","kind")
);
--> statement-breakpoint
CREATE TABLE "reference_records" (
	"dataset_version_id" uuid NOT NULL,
	"kind" varchar(40) NOT NULL,
	"id" varchar(120) NOT NULL,
	"name" text NOT NULL,
	"search_name" text NOT NULL,
	"data" jsonb NOT NULL,
	CONSTRAINT "reference_records_dataset_version_id_kind_id_pk" PRIMARY KEY("dataset_version_id","kind","id")
);
--> statement-breakpoint
CREATE TABLE "user_workspaces" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"data" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reference_collections" ADD CONSTRAINT "reference_collections_dataset_version_id_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."dataset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_records" ADD CONSTRAINT "reference_records_dataset_version_id_dataset_versions_id_fk" FOREIGN KEY ("dataset_version_id") REFERENCES "public"."dataset_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "market_snapshots_history_idx" ON "market_snapshots" USING btree ("region","item_id","sub_id","fetched_at");--> statement-breakpoint
CREATE INDEX "reference_name_search_idx" ON "reference_records" USING gin ("search_name" gin_trgm_ops);