// src/contexts/reporting/infrastructure/persistence/schema.ts
import { bigint, index, integer, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const categoryPeriodAggregates = pgTable(
  "category_period_aggregates",
  {
    familyId: uuid("family_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    period: varchar("period", { length: 7 }).notNull(),
    totalExpenseMinor: bigint("total_expense_minor", { mode: "number" }).notNull().default(0),
    totalIncomeMinor: bigint("total_income_minor", { mode: "number" }).notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull(),
    itemCount: integer("item_count").notNull().default(0),
  },
  (table) => ({
    familyPeriodIndex: index("category_period_aggregates_family_period_idx").on(
      table.familyId,
      table.period,
    ),
    naturalKey: uniqueIndex("category_period_aggregates_natural_key").on(
      table.familyId,
      table.categoryId,
      table.period,
    ),
  }),
);

export const paymentMethodPeriodAggregates = pgTable(
  "payment_method_period_aggregates",
  {
    familyId: uuid("family_id").notNull(),
    paymentMethodId: uuid("payment_method_id").notNull(),
    period: varchar("period", { length: 7 }).notNull(),
    totalExpenseMinor: bigint("total_expense_minor", { mode: "number" }).notNull().default(0),
    totalIncomeMinor: bigint("total_income_minor", { mode: "number" }).notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull(),
    itemCount: integer("item_count").notNull().default(0),
  },
  (table) => ({
    familyPeriodIndex: index("payment_method_period_aggregates_family_period_idx").on(
      table.familyId,
      table.period,
    ),
    naturalKey: uniqueIndex("payment_method_period_aggregates_natural_key").on(
      table.familyId,
      table.paymentMethodId,
      table.period,
    ),
  }),
);
