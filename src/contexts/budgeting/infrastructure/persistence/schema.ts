// src/contexts/budgeting/infrastructure/persistence/schema.ts
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const budgetConfigurations = pgTable(
  "budget_configurations",
  {
    id: uuid("id").primaryKey(),
    familyId: uuid("family_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    defaultAmount: numeric("default_amount", { precision: 14, scale: 2 }).notNull(),
    defaultCurrency: varchar("default_currency", { length: 3 }).notNull(),
    overrides: jsonb("overrides").notNull().default({}),
    isActive: boolean("is_active").notNull().default(true),
  },
  (table) => ({
    familyIdIndex: index("budget_configurations_family_id_idx").on(table.familyId),
    familyCategoryIndex: uniqueIndex("budget_configurations_family_category_idx").on(
      table.familyId,
      table.categoryId,
    ),
  }),
);

export const budgetPeriodStatuses = pgTable(
  "budget_period_statuses",
  {
    id: uuid("id").primaryKey(),
    familyId: uuid("family_id").notNull(),
    categoryId: uuid("category_id").notNull(),
    period: varchar("period", { length: 7 }).notNull(),
    limitAmount: numeric("limit_amount", { precision: 14, scale: 2 }).notNull(),
    spent: numeric("spent", { precision: 14, scale: 2 }).notNull().default("0"),
    currency: varchar("currency", { length: 3 }).notNull(),
  },
  (table) => ({
    familyPeriodIndex: index("budget_period_statuses_family_period_idx").on(
      table.familyId,
      table.period,
    ),
    familyCategoryPeriodIndex: uniqueIndex("budget_period_statuses_natural_key").on(
      table.familyId,
      table.categoryId,
      table.period,
    ),
  }),
);
