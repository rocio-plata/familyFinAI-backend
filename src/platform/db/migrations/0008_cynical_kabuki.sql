CREATE TYPE "public"."suggestion_source" AS ENUM('TEXT', 'RECEIPT');--> statement-breakpoint
CREATE TYPE "public"."suggestion_status" AS ENUM('PENDING', 'CONFIRMED', 'DISCARDED');--> statement-breakpoint
CREATE TYPE "public"."suggestion_type" AS ENUM('EXPENSE', 'INCOME');--> statement-breakpoint
CREATE TABLE "merchant_category_history" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"merchant_name" varchar(100) NOT NULL,
	"category_id" uuid NOT NULL,
	"tag_id" uuid,
	"times_used" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suggestions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"requested_by" uuid NOT NULL,
	"source" "suggestion_source" NOT NULL,
	"suggested_type" "suggestion_type" NOT NULL,
	"raw_input" text,
	"receipt_image_ref" text,
	"merchant_name" varchar(100),
	"suggested_amount" numeric(14, 2) NOT NULL,
	"suggested_currency" varchar(3) NOT NULL,
	"suggested_category_id" uuid,
	"suggested_tag_id" uuid,
	"suggested_date" timestamp NOT NULL,
	"suggested_title" varchar(100),
	"confidence" real NOT NULL,
	"status" "suggestion_status" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "merchant_category_history_family_merchant_key" ON "merchant_category_history" USING btree ("family_id","merchant_name");--> statement-breakpoint
CREATE INDEX "suggestions_family_status_idx" ON "suggestions" USING btree ("family_id","status");