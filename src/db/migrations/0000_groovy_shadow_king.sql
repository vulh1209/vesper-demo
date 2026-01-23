CREATE TABLE "asset_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"version" text NOT NULL,
	"author" text,
	"author_name" text,
	"slack_channel_id" text NOT NULL,
	"slack_message_ts" text NOT NULL,
	"slack_permalink" text,
	"raw_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" text PRIMARY KEY NOT NULL,
	"raw_name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"category" text,
	"latest_version" text,
	"latest_version_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "channels" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"last_sync_ts" text,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "slack_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"channel_id" text NOT NULL,
	"message_ts" text NOT NULL,
	"user_id" text,
	"text" text,
	"message_data" jsonb NOT NULL,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_versions_asset_id" ON "asset_versions" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_versions_created_at" ON "asset_versions" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_versions_unique" ON "asset_versions" USING btree ("slack_channel_id","slack_message_ts","asset_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_assets_normalized_name" ON "assets" USING btree ("normalized_name");--> statement-breakpoint
CREATE INDEX "idx_messages_channel_ts" ON "slack_messages" USING btree ("channel_id","message_ts");--> statement-breakpoint
CREATE INDEX "idx_messages_processed" ON "slack_messages" USING btree ("processed_at");