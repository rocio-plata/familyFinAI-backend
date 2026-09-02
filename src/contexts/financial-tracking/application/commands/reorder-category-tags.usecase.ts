// src/contexts/financial-tracking/application/commands/reorder-category-tags.usecase.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { Category } from "../../domain/entities/category.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";

interface ReorderCategoryTagsInput {
  familyId: FamilyId;
  categoryId: CategoryId;
  orderedTagIds: TagId[];
}

class ReorderCategoryTagsUseCase {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(input: ReorderCategoryTagsInput): Promise<Category> {
    // 1. Buscar la categoría, validando que pertenezca a la familia
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.familyId.toString() !== input.familyId.toString()) {
      throw new CategoryNotFoundError(input.categoryId.toString());
    }

    // 2. Reordenar (la entidad valida que el array coincida con los tags actuales)
    category.reorderTags(input.orderedTagIds);

    // 3. Persistir
    await this.categoryRepository.save(category);

    return category;
  }
}

export { ReorderCategoryTagsUseCase };
