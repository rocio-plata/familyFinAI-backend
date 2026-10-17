ALTER TABLE "budget_configurations" RENAME COLUMN "default_amount" TO "default_amount_minor";--> statement-breakpoint
ALTER TABLE "budget_configurations" ALTER COLUMN "default_amount_minor" TYPE bigint USING ROUND("default_amount_minor" * CASE WHEN "default_currency" IN ('USD', 'EUR') THEN 100 ELSE 1 END)::bigint;--> statement-breakpoint
ALTER TABLE "budget_period_statuses" RENAME COLUMN "limit_amount" TO "limit_amount_minor";--> statement-breakpoint
ALTER TABLE "budget_period_statuses" RENAME COLUMN "spent" TO "spent_minor";--> statement-breakpoint
ALTER TABLE "budget_period_statuses" ALTER COLUMN "limit_amount_minor" TYPE bigint USING ROUND("limit_amount_minor" * CASE WHEN "currency" IN ('USD', 'EUR') THEN 100 ELSE 1 END)::bigint;--> statement-breakpoint
ALTER TABLE "budget_period_statuses" ALTER COLUMN "spent_minor" TYPE bigint USING ROUND("spent_minor" * CASE WHEN "currency" IN ('USD', 'EUR') THEN 100 ELSE 1 END)::bigint;--> statement-breakpoint
ALTER TABLE "financial_items" RENAME COLUMN "amount" TO "amount_minor";--> statement-breakpoint
ALTER TABLE "financial_items" ALTER COLUMN "amount_minor" TYPE bigint USING ROUND("amount_minor" * CASE WHEN "currency" IN ('USD', 'EUR') THEN 100 ELSE 1 END)::bigint;--> statement-breakpoint
ALTER TABLE "category_period_aggregates" RENAME COLUMN "total_expense" TO "total_expense_minor";--> statement-breakpoint
ALTER TABLE "category_period_aggregates" RENAME COLUMN "total_income" TO "total_income_minor";--> statement-breakpoint
ALTER TABLE "category_period_aggregates" ALTER COLUMN "total_expense_minor" TYPE bigint USING ROUND("total_expense_minor" * CASE WHEN "currency" IN ('USD', 'EUR') THEN 100 ELSE 1 END)::bigint;--> statement-breakpoint
ALTER TABLE "category_period_aggregates" ALTER COLUMN "total_income_minor" TYPE bigint USING ROUND("total_income_minor" * CASE WHEN "currency" IN ('USD', 'EUR') THEN 100 ELSE 1 END)::bigint;--> statement-breakpoint
ALTER TABLE "payment_method_period_aggregates" RENAME COLUMN "total_expense" TO "total_expense_minor";--> statement-breakpoint
ALTER TABLE "payment_method_period_aggregates" RENAME COLUMN "total_income" TO "total_income_minor";--> statement-breakpoint
ALTER TABLE "payment_method_period_aggregates" ALTER COLUMN "total_expense_minor" TYPE bigint USING ROUND("total_expense_minor" * CASE WHEN "currency" IN ('USD', 'EUR') THEN 100 ELSE 1 END)::bigint;--> statement-breakpoint
ALTER TABLE "payment_method_period_aggregates" ALTER COLUMN "total_income_minor" TYPE bigint USING ROUND("total_income_minor" * CASE WHEN "currency" IN ('USD', 'EUR') THEN 100 ELSE 1 END)::bigint;--> statement-breakpoint
ALTER TABLE "suggestions" RENAME COLUMN "suggested_amount" TO "suggested_amount_minor";--> statement-breakpoint
ALTER TABLE "suggestions" ALTER COLUMN "suggested_amount_minor" TYPE bigint USING ROUND("suggested_amount_minor" * CASE WHEN "suggested_currency" IN ('USD', 'EUR') THEN 100 ELSE 1 END)::bigint;--> statement-breakpoint