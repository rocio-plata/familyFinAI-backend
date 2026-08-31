// src/contexts/financial-tracking/domain/services/category-deletion.service.ts
import type { Category } from "../entities/category.js";
import { CategoryHasAssociatedItemsError } from "../errors/category-has-associated-items.error.js";
import type { FinancialItemRepository } from "../repositories/financial-item.repository.js";

class CategoryDeletionService {
  constructor(private readonly financialItemRepository: FinancialItemRepository) {}

  async delete(category: Category): Promise<void> {
    const itemCount = await this.financialItemRepository.countByCategory(category.id);

    if (itemCount > 0) {
      throw new CategoryHasAssociatedItemsError(category.id);
    }

    category.markAsDeleted(); // el agregado solo cambia su propio estado
  }
}

export { CategoryDeletionService };
