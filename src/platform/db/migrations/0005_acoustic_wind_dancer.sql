CREATE TABLE "budget_configurations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"default_amount" numeric(14, 2) NOT NULL,
	"default_currency" varchar(3) NOT NULL,
	"overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_period_statuses" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"period" varchar(7) NOT NULL,
	"limit_amount" numeric(14, 2) NOT NULL,
	"spent" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(3) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "budget_configurations_family_id_idx" ON "budget_configurations" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_configurations_family_category_idx" ON "budget_configurations" USING btree ("family_id","category_id");--> statement-breakpoint
CREATE INDEX "budget_period_statuses_family_period_idx" ON "budget_period_statuses" USING btree ("family_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_period_statuses_natural_key" ON "budget_period_statuses" USING btree ("family_id","category_id","period");