// src/contexts/financial-tracking/infrastructure/persistence/drizzle-financial-item.repository.ts

import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { FinancialItem } from "../../domain/entities/financial-item.js";
import type {
  FinancialItemFilters,
  FinancialItemRepository,
} from "../../domain/repositories/financial-item.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { FinancialItemId } from "../../domain/value-objects/financial-item-id.js";
import { FinancialItemType } from "../../domain/value-objects/financial-item-type.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";
import { financialItems } from "./schema.js";

class DrizzleFinancialItemRepository implements FinancialItemRepository {
  async save(item: FinancialItem): Promise<void> {
    await db
      .insert(financialItems)
      .values({
        id: item.id.toString(),
        familyId: item.familyId.toString(),
        recordedBy: item.recordedBy.toString(),
        type: item.type,
        amount: item.amount.amount.toString(),
        currency: item.amount.currency.toString(),
        categoryId: item.categoryAssignment.categoryId.toString(),
        tagId: item.categoryAssignment.tagId?.toString() ?? null,
        title: item.title.toString(),
        note: item.note?.toString() ?? null,
        occurredOn: item.occurredOn.value,
        createdAt: item.createdAt,
      })
      .onConflictDoUpdate({
        target: financialItems.id,
        set: {
          type: item.type,
          amount: item.amount.amount.toString(),
          currency: item.amount.currency.toString(),
          categoryId: item.categoryAssignment.categoryId.toString(),
          tagId: item.categoryAssignment.tagId?.toString() ?? null,
          title: item.title.toString(),
          note: item.note?.toString() ?? null,
          occurredOn: item.occurredOn.value,
        },
      });
  }

  async findById(id: FinancialItemId): Promise<FinancialItem | null> {
    const row = (
      await db.select().from(financialItems).where(eq(financialItems.id, id.toString())).limit(1)
    )[0];
    return row ? this.toDomain(row) : null;
  }

  async findByFamilyId(
    familyId: FamilyId,
    filters?: FinancialItemFilters,
  ): Promise<FinancialItem[]> {
    const conditions = [eq(financialItems.familyId, familyId.toString())];
    if (filters?.categoryId)
      conditions.push(eq(financialItems.categoryId, filters.categoryId.toString()));
    if (filters?.tagId) conditions.push(eq(financialItems.tagId, filters.tagId.toString()));
    if (filters?.type) conditions.push(eq(financialItems.type, filters.type));
    if (filters?.period) {
      conditions.push(gte(financialItems.occurredOn, filters.period.from));
      conditions.push(lte(financialItems.occurredOn, filters.period.to));
    }

    const rows = await db
      .select()
      .from(financialItems)
      .where(and(...conditions));
    return rows.map((row) => this.toDomain(row));
  }

  async delete(id: FinancialItemId): Promise<void> {
    await db.delete(financialItems).where(eq(financialItems.id, id.toString()));
  }

  async countByCategory(categoryId: CategoryId): Promise<number> {
    const rows = await db
      .select({ id: financialItems.id })
      .from(financialItems)
      .where(eq(financialItems.categoryId, categoryId.toString()));
    return rows.length;
  }

  async countByTag(tagId: TagId): Promise<number> {
    const rows = await db
      .select({ id: financialItems.id })
      .from(financialItems)
      .where(eq(financialItems.tagId, tagId.toString()));
    return rows.length;
  }

  private toDomain(row: typeof financialItems.$inferSelect): FinancialItem {
    return FinancialItem.reconstitute({
      id: row.id,
      familyId: row.familyId,
      recordedBy: row.recordedBy,
      type: row.type === "EXPENSE" ? FinancialItemType.Expense : FinancialItemType.Income,
      amount: Number(row.amount),
      currency: row.currency,
      categoryId: row.categoryId,
      tagId: row.tagId,
      title: row.title,
      note: row.note,
      occurredOn: row.occurredOn,
      createdAt: row.createdAt,
    });
  }
}

export { DrizzleFinancialItemRepository };
