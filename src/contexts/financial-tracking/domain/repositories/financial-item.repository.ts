// contexts/financial-tracking/domain/repositories/financial-item.repository.ts

import type { FinancialItem } from "../entities/financial-item.js";
import type { CategoryId } from "../value-objects/category-id.js";
import type { FinancialItemId } from "../value-objects/financial-item-id.js";
import type { TagId } from "../value-objects/tag-id.js";

interface FinancialItemRepository {
  save(item: FinancialItem): Promise<void>;
  findById(id: FinancialItemId): Promise<FinancialItem | null>;
  delete(id: FinancialItemId): Promise<void>;
  countByCategory(categoryId: CategoryId): Promise<number>;
  countByTag(tagId: TagId): Promise<number>;
}

export type { FinancialItemRepository };
