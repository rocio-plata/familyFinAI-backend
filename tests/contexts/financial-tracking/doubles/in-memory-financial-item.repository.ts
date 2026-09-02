// tests/contexts/financial-tracking/doubles/in-memory-financial-item.repository.tsimport type { FinancialItem } from "../../../../src/contexts/financial-tracking/domain/entities/financial-item.js";
import type { FinancialItemRepository } from "../../../../src/contexts/financial-tracking/domain/repositories/financial-item.repository.js";
import type { CategoryId } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";
import type { FinancialItemId } from "../../../../src/contexts/financial-tracking/domain/value-objects/financial-item-id.js";
import type { TagId } from "../../../../src/contexts/financial-tracking/domain/value-objects/tag-id.js";

class InMemoryFinancialItemRepository implements FinancialItemRepository {
  private items = new Map<string, FinancialItem>();
  private categoryCount = new Map<string, number>();
  private tagCount = new Map<string, number>();

  async save(item: FinancialItem): Promise<void> {
    this.items.set(item.id.toString(), item);
    const categoryId = item.categoryAssignment.categoryId.toString();
    this.categoryCount.set(categoryId, (this.categoryCount.get(categoryId) ?? 0) + 1);
    if (item.categoryAssignment.tagId) {
      const tagId = item.categoryAssignment.tagId.toString();
      this.tagCount.set(tagId, (this.tagCount.get(tagId) ?? 0) + 1);
    }
  }

  async findById(id: FinancialItemId): Promise<FinancialItem | null> {
    return this.items.get(id.toString()) ?? null;
  }

  async delete(id: FinancialItemId): Promise<void> {
    const item = this.items.get(id.toString());
    if (!item) {
      return;
    }
    this.items.delete(id.toString());
    const categoryId = item.categoryAssignment.categoryId.toString();
    this.categoryCount.set(categoryId, Math.max((this.categoryCount.get(categoryId) ?? 0) - 1, 0));
    if (item.categoryAssignment.tagId) {
      const tagId = item.categoryAssignment.tagId.toString();
      this.tagCount.set(tagId, Math.max((this.tagCount.get(tagId) ?? 0) - 1, 0));
    }
  }

  async countByCategory(categoryId: CategoryId): Promise<number> {
    return this.categoryCount.get(categoryId.toString()) ?? 0;
  }

  async countByTag(tagId: TagId): Promise<number> {
    return this.tagCount.get(tagId.toString()) ?? 0;
  }
}

export { InMemoryFinancialItemRepository };
