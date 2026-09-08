CREATE TYPE "public"."category_status" AS ENUM('ACTIVE', 'DEPRECATED');--> statement-breakpoint
CREATE TYPE "public"."financial_item_type" AS ENUM('EXPENSE', 'INCOME');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"name" varchar(50) NOT NULL,
	"status" "category_status" DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"type" "financial_item_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"category_id" uuid NOT NULL,
	"tag_id" uuid,
	"title" varchar(100) NOT NULL,
	"note" text,
	"occurred_on" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(30) NOT NULL,
	"display_order" integer NOT NULL,
	"status" "category_status" DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_items" ADD CONSTRAINT "financial_items_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_items" ADD CONSTRAINT "financial_items_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "categories_family_id_idx" ON "categories" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "financial_items_family_id_idx" ON "financial_items" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "financial_items_family_occurred_on_idx" ON "financial_items" USING btree ("family_id","occurred_on");--> statement-breakpoint
CREATE INDEX "tags_category_id_idx" ON "tags" USING btree ("category_id");