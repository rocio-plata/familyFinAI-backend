// src/contexts/financial-tracking/infrastructure/persistence/drizzle-category.repository.ts

import { eq } from "drizzle-orm";
import { db } from "../../../../platform/db/connection.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import { Category } from "../../domain/entities/category.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import { FinancialItemType } from "../../domain/value-objects/financial-item-type.js";
import { TagStatus } from "../../domain/value-objects/tag-status.js";
import { categories, tags } from "./schema.js";

class DrizzleCategoryRepository implements CategoryRepository {
  async save(category: Category): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .insert(categories)
        .values({
          id: category.id.toString(),
          familyId: category.familyId.toString(),
          type: category.type,
          name: category.name.toString(),
          status: category.status,
        })
        .onConflictDoUpdate({
          target: categories.id,
          set: { name: category.name.toString(), status: category.status },
        });

      await tx.delete(tags).where(eq(tags.categoryId, category.id.toString()));
      if (category.tags.length > 0) {
        await tx.insert(tags).values(
          category.tags.map((tag) => ({
            id: tag.id.toString(),
            categoryId: category.id.toString(),
            name: tag.name.toString(),
            displayOrder: tag.displayOrder,
            status: tag.status,
          })),
        );
      }
    });
  }

  async findById(categoryId: CategoryId): Promise<Category | null> {
    const categoryRow = (
      await db.select().from(categories).where(eq(categories.id, categoryId.toString())).limit(1)
    )[0];
    if (!categoryRow) return null;

    const tagRows = await db.select().from(tags).where(eq(tags.categoryId, categoryId.toString()));
    return this.toDomain(categoryRow, tagRows);
  }

  async findByFamilyId(familyId: FamilyId): Promise<Category[]> {
    const categoryRows = await db
      .select()
      .from(categories)
      .where(eq(categories.familyId, familyId.toString()));
    const tagRows = await db.select().from(tags);

    return categoryRows.map((categoryRow) =>
      this.toDomain(
        categoryRow,
        tagRows.filter((tagRow) => tagRow.categoryId === categoryRow.id),
      ),
    );
  }

  async delete(categoryId: CategoryId): Promise<void> {
    await db.delete(categories).where(eq(categories.id, categoryId.toString()));
  }

  private toDomain(
    categoryRow: typeof categories.$inferSelect,
    tagRows: (typeof tags.$inferSelect)[],
  ): Category {
    return Category.reconstitute({
      id: categoryRow.id,
      familyId: categoryRow.familyId,
      type: categoryRow.type === "EXPENSE" ? FinancialItemType.Expense : FinancialItemType.Income,
      name: categoryRow.name,
      status: categoryRow.status === "ACTIVE" ? CategoryStatus.Active : CategoryStatus.Deprecated,
      tags: tagRows.map((tagRow) => ({
        id: tagRow.id,
        name: tagRow.name,
        displayOrder: tagRow.displayOrder,
        status: tagRow.status === "ACTIVE" ? TagStatus.Active : TagStatus.Deprecated,
      })),
    });
  }
}

export { DrizzleCategoryRepository };
