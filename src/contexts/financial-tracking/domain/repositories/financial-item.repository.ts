// contexts/financial-tracking/domain/repositories/financial-item.repository.ts

import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { FinancialItem } from "../entities/financial-item.js";
import type { CategoryId } from "../value-objects/category-id.js";
import type { FinancialItemId } from "../value-objects/financial-item-id.js";
import type { FinancialItemType } from "../value-objects/financial-item-type.js";
import type { TagId } from "../value-objects/tag-id.js";

interface FinancialItemFilters {
  period?: { from: Date; to: Date };
  categoryId?: CategoryId;
  tagId?: TagId;
  type?: FinancialItemType;
}

interface FinancialItemRepository {
  save(item: FinancialItem): Promise<void>;
  findById(id: FinancialItemId): Promise<FinancialItem | null>;
  findByFamilyId(familyId: FamilyId, filters?: FinancialItemFilters): Promise<FinancialItem[]>;
  delete(id: FinancialItemId): Promise<void>;
  countByCategory(categoryId: CategoryId): Promise<number>;
  countByTag(tagId: TagId): Promise<number>;
}

export type { FinancialItemFilters, FinancialItemRepository };
