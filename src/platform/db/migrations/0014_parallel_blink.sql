ALTER TABLE "categories" ADD COLUMN "deprecated_at" timestamp;--> statement-breakpoint
ALTER TABLE "categories" ADD COLUMN "display_order" integer DEFAULT 0 NOT NULL;