// src/contexts/financial-tracking/infrastructure/persistence/in-memory-category.repository.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { Category } from "../../domain/entities/category.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";

class InMemoryCategoryRepository implements CategoryRepository {
  private readonly categories = new Map<string, Category>();

  async save(category: Category): Promise<void> {
    this.categories.set(category.id.toString(), category);
  }

  async findById(categoryId: CategoryId): Promise<Category | null> {
    return this.categories.get(categoryId.toString()) ?? null;
  }

  async findByFamilyId(familyId: FamilyId): Promise<Category[]> {
    return [...this.categories.values()].filter((category) => category.familyId.equals(familyId));
  }

  async delete(categoryId: CategoryId): Promise<void> {
    this.categories.delete(categoryId.toString());
  }
}

export { InMemoryCategoryRepository };
