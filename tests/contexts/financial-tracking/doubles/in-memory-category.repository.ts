// tests/contexts/financial-tracking/doubles/in-memory-category.repository.ts
import type { FamilyId } from "../../../../src/contexts/family-access/domain/value-objects/family-id.js";
import type { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import type { CategoryRepository } from "../../../../src/contexts/financial-tracking/domain/repositories/category.repository.js";
import type { CategoryId } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";

class InMemoryCategoryRepository implements CategoryRepository {
  private categories = new Map<string, Category>();

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

  add(category: Category): void {
    this.categories.set(category.id.toString(), category);
  }
}

export { InMemoryCategoryRepository };
