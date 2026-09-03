// contexts/financial-tracking/infrastructure/persistence/in-memory-financial-item.repository.ts

import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { FinancialItem } from "../../domain/entities/financial-item.js";
import type {
  FinancialItemFilters,
  FinancialItemRepository,
} from "../../domain/repositories/financial-item.repository.js";
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

  async findByFamilyId(
    familyId: FamilyId,
    filters?: FinancialItemFilters,
  ): Promise<FinancialItem[]> {
    return [...this.items.values()].filter((item) => matchesFilters(item, familyId, filters));
  }

  async delete(id: FinancialItemId): Promise<void> {
    this.items.delete(id.toString());
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

function matchesFilters(
  item: FinancialItem,
  familyId: FamilyId,
  filters?: FinancialItemFilters,
): boolean {
  if (item.familyId.toString() !== familyId.toString()) return false;
  if (filters?.categoryId && !item.categoryAssignment.categoryId.equals(filters.categoryId)) {
    return false;
  }
  if (filters?.tagId && !item.categoryAssignment.tagId?.equals(filters.tagId)) {
    return false;
  }
  if (filters?.type && item.type !== filters.type) {
    return false;
  }
  if (filters?.period) {
    const occurredOn = item.occurredOn.value.getTime();
    if (occurredOn < filters.period.from.getTime() || occurredOn > filters.period.to.getTime()) {
      return false;
    }
  }
  return true;
}

export { InMemoryFinancialItemRepository };
