CREATE TABLE "category_period_aggregates" (
	"family_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"period" varchar(7) NOT NULL,
	"total_expense" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(3) NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "category_period_aggregates_family_period_idx" ON "category_period_aggregates" USING btree ("family_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "category_period_aggregates_natural_key" ON "category_period_aggregates" USING btree ("family_id","category_id","period");