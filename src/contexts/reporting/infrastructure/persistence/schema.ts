// src/contexts/reporting/infrastructure/persistence/schema.ts
import { index, integer, numeric, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const categoryPeriodAggregates = pgTable(
  "category_period_aggregates",
  {
    familyId: uuid("family_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    period: varchar("period", { length: 7 }).notNull(),
    totalExpense: numeric("total_expense", { precision: 14, scale: 2 }).notNull().default("0"),
    totalIncome: numeric("total_income", { precision: 14, scale: 2 }).notNull().default("0"),
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
