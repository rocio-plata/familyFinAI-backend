// tests/contexts/financial-tracking/doubles/in-memory-category.repository.ts
import type { Category } from "../../../../src/contexts/financial-tracking/domain/entities/category.js";
import type { CategoryRepository } from "../../../../src/contexts/financial-tracking/domain/repositories/category.repository.js";
import type { CategoryId } from "../../../../src/contexts/financial-tracking/domain/value-objects/category-id.js";

class InMemoryCategoryRepository implements CategoryRepository {
  private categories = new Map<string, Category>();

  async findById(categoryId: CategoryId): Promise<Category | null> {
    return this.categories.get(categoryId.toString()) ?? null;
  }

  add(category: Category): void {
    this.categories.set(category.id.toString(), category);
  }
}

export { InMemoryCategoryRepository };
