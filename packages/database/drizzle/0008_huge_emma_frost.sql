CREATE TYPE "public"."auth_provider" AS ENUM('google', 'steam');--> statement-breakpoint
CREATE TABLE "auth_identities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "auth_provider" NOT NULL,
	"subject" varchar(160) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_firebase_uid_unique" UNIQUE("firebase_uid")
);
--> statement-breakpoint
CREATE TABLE "steam_auth_attempts" (
	"state_hash" varchar(64) PRIMARY KEY NOT NULL,
	"code_challenge" varchar(43) NOT NULL,
	"firebase_uid" varchar(128),
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "steam_auth_exchanges" (
	"code_hash" varchar(64) PRIMARY KEY NOT NULL,
	"code_challenge" varchar(43) NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steam_auth_attempts" ADD CONSTRAINT "steam_auth_attempts_firebase_uid_auth_users_firebase_uid_fk" FOREIGN KEY ("firebase_uid") REFERENCES "public"."auth_users"("firebase_uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "steam_auth_exchanges" ADD CONSTRAINT "steam_auth_exchanges_firebase_uid_auth_users_firebase_uid_fk" FOREIGN KEY ("firebase_uid") REFERENCES "public"."auth_users"("firebase_uid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_provider_subject_uidx" ON "auth_identities" USING btree ("provider","subject");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_identities_user_provider_uidx" ON "auth_identities" USING btree ("user_id","provider");--> statement-breakpoint
CREATE INDEX "steam_auth_attempts_expires_idx" ON "steam_auth_attempts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "steam_auth_exchanges_expires_idx" ON "steam_auth_exchanges" USING btree ("expires_at");