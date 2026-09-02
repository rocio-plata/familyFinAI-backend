// src/contexts/financial-tracking/domain/repositories/category.repository.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { Category } from "../entities/category.js";
import type { CategoryId } from "../value-objects/category-id.js";

interface CategoryRepository {
  save(category: Category): Promise<void>;
  findById(categoryId: CategoryId): Promise<Category | null>;
  findByFamilyId(familyId: FamilyId): Promise<Category[]>;
}

export type { CategoryRepository };
