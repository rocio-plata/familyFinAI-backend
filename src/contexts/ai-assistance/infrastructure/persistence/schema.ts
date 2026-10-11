// src/contexts/ai-assistance/infrastructure/persistence/schema.ts
import {
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const suggestionStatusEnum = pgEnum("suggestion_status", [
  "PENDING",
  "CONFIRMED",
  "DISCARDED",
]);
export const suggestionSourceEnum = pgEnum("suggestion_source", ["TEXT", "RECEIPT"]);
export const suggestionTypeEnum = pgEnum("suggestion_type", ["EXPENSE", "INCOME"]);

export const suggestions = pgTable(
  "suggestions",
  {
    id: uuid("id").primaryKey(),
    familyId: uuid("family_id").notNull(),
    requestedBy: uuid("requested_by").notNull(),
    source: suggestionSourceEnum("source").notNull(),
    suggestedType: suggestionTypeEnum("suggested_type").notNull(),
    rawInput: text("raw_input"),
    receiptImageRef: text("receipt_image_ref"),
    merchantName: varchar("merchant_name", { length: 100 }),
    suggestedAmount: numeric("suggested_amount", { precision: 14, scale: 2 }).notNull(),
    suggestedCurrency: varchar("suggested_currency", { length: 3 }).notNull(),
    suggestedCategoryId: uuid("suggested_category_id"),
    suggestedTagId: uuid("suggested_tag_id"),
    suggestedDate: timestamp("suggested_date").notNull(),
    suggestedTitle: varchar("suggested_title", { length: 100 }),
    confidence: real("confidence").notNull(),
    status: suggestionStatusEnum("status").notNull().default("PENDING"),
  },
  (table) => ({
    familyStatusIndex: index("suggestions_family_status_idx").on(table.familyId, table.status),
  }),
);

export const merchantCategoryHistory = pgTable(
  "merchant_category_history",
  {
    id: uuid("id").primaryKey(),
    familyId: uuid("family_id").notNull(),
    merchantName: varchar("merchant_name", { length: 100 }).notNull(),
    categoryId: uuid("category_id").notNull(),
    tagId: uuid("tag_id"),
    timesUsed: integer("times_used").notNull().default(1),
  },
  (table) => ({
    familyMerchantKey: uniqueIndex("merchant_category_history_family_merchant_key").on(
      table.familyId,
      table.merchantName,
    ),
  }),
);
