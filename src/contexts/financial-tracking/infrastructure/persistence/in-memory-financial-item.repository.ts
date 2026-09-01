// contexts/financial-tracking/infrastructure/persistence/in-memory-financial-item.repository.ts

import type { FinancialItem } from "../../domain/entities/financial-item.js";
import type { FinancialItemRepository } from "../../domain/repositories/financial-item.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { FinancialItemId } from "../../domain/value-objects/financial-item-id.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";

class InMemoryFinancialItemRepository implements FinancialItemRepository {
  private readonly items = new Map<string, FinancialItem>();

  async save(item: FinancialItem): Promise<void> {
    this.items.set(item.id.toString(), item);
  }

  async findById(id: FinancialItemId): Promise<FinancialItem | null> {
    return this.items.get(id.toString()) ?? null;
  }

  async countByCategory(categoryId: CategoryId): Promise<number> {
    let count = 0;
    for (const item of this.items.values()) {
      if (item.categoryAssignment.categoryId.equals(categoryId)) count++;
    }
    return count;
  }

  async countByTag(tagId: TagId): Promise<number> {
    let count = 0;
    for (const item of this.items.values()) {
      if (item.categoryAssignment.tagId?.equals(tagId)) count++;
    }
    return count;
  }
}

export { InMemoryFinancialItemRepository };
