CREATE TABLE "tutorial_guide_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"guide_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"anchor_key" varchar(120),
	"title" varchar(100) NOT NULL,
	"body" varchar(360) NOT NULL,
	CONSTRAINT "tutorial_guide_steps_order_check" CHECK ("tutorial_guide_steps"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "tutorial_guides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"screen_key" varchar(64) NOT NULL,
	"locale" varchar(16) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tutorial_guide_steps" ADD CONSTRAINT "tutorial_guide_steps_guide_id_tutorial_guides_id_fk" FOREIGN KEY ("guide_id") REFERENCES "public"."tutorial_guides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tutorial_guide_steps_guide_order_uidx" ON "tutorial_guide_steps" USING btree ("guide_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorial_guides_screen_locale_uidx" ON "tutorial_guides" USING btree ("screen_key","locale");