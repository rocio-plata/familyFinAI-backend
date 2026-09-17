CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"family_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"status" "category_status" DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_payment_method_preferences" (
	"user_id" uuid NOT NULL,
	"family_id" uuid NOT NULL,
	"default_payment_method_id" uuid NOT NULL,
	CONSTRAINT "user_payment_method_preferences_user_id_family_id_pk" PRIMARY KEY("user_id","family_id")
);
--> statement-breakpoint
CREATE TABLE "payment_method_period_aggregates" (
	"family_id" uuid NOT NULL,
	"payment_method_id" uuid NOT NULL,
	"period" varchar(7) NOT NULL,
	"total_expense" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_income" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(3) NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "financial_items" ADD COLUMN "payment_method_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_payment_method_preferences" ADD CONSTRAINT "user_payment_method_preferences_default_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("default_payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_methods_family_id_idx" ON "payment_methods" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_family_name_unique" ON "payment_methods" USING btree ("family_id","name");--> statement-breakpoint
CREATE INDEX "user_payment_method_preferences_payment_method_id_idx" ON "user_payment_method_preferences" USING btree ("default_payment_method_id");--> statement-breakpoint
CREATE INDEX "payment_method_period_aggregates_family_period_idx" ON "payment_method_period_aggregates" USING btree ("family_id","period");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_method_period_aggregates_natural_key" ON "payment_method_period_aggregates" USING btree ("family_id","payment_method_id","period");--> statement-breakpoint
ALTER TABLE "financial_items" ADD CONSTRAINT "financial_items_payment_method_id_payment_methods_id_fk" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;