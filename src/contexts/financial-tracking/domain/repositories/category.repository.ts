// src/contexts/financial-tracking/domain/repositories/category.repository.ts
import type { Category } from "../entities/category.js";
import type { CategoryId } from "../value-objects/category-id.js";

interface CategoryRepository {
  findById(categoryId: CategoryId): Promise<Category | null>;
}

export type { CategoryRepository };
