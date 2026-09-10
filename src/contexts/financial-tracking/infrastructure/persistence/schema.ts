// src/contexts/financial-tracking/infrastructure/persistence/schema.ts

import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const financialItemTypeEnum = pgEnum("financial_item_type", ["EXPENSE", "INCOME"]);
export const categoryStatusEnum = pgEnum("category_status", ["ACTIVE", "DEPRECATED"]);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey(),
    familyId: uuid("family_id").notNull(),
    type: financialItemTypeEnum("type").notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    status: categoryStatusEnum("status").notNull().default("ACTIVE"),
  },
  (table) => ({
    familyIdIndex: index("categories_family_id_idx").on(table.familyId),
  }),
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 30 }).notNull(),
    displayOrder: integer("display_order").notNull(),
    status: categoryStatusEnum("status").notNull().default("ACTIVE"),
  },
  (table) => ({
    categoryIdIndex: index("tags_category_id_idx").on(table.categoryId),
  }),
);

export const financialItems = pgTable(
  "financial_items",
  {
    id: uuid("id").primaryKey(),
    familyId: uuid("family_id").notNull(),
    recordedBy: uuid("recorded_by").notNull(),
    type: financialItemTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
    tagId: uuid("tag_id").references(() => tags.id),
    title: varchar("title", { length: 100 }).notNull(),
    note: text("note"),
    occurredOn: timestamp("occurred_on").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    familyIdIndex: index("financial_items_family_id_idx").on(table.familyId),
    familyOccurredOnIndex: index("financial_items_family_occurred_on_idx").on(
      table.familyId,
      table.occurredOn,
    ),
  }),
);
