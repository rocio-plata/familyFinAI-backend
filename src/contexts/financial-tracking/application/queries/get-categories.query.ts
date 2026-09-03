// src/contexts/financial-tracking/application/queries/get-categories.query.ts
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { CategoryName } from "../../domain/value-objects/category-name.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";
import type { TagName } from "../../domain/value-objects/tag-name.js";
import type { TagStatus } from "../../domain/value-objects/tag-status.js";

interface GetCategoriesInput {
  familyId: FamilyId;
  includeDeprecated?: boolean;
}

interface TagDTO {
  id: TagId;
  name: TagName;
  status: TagStatus;
  displayOrder: number;
}

interface CategoryDTO {
  id: CategoryId;
  name: CategoryName;
  status: CategoryStatus;
  tags: TagDTO[];
}

class GetCategoriesQuery {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async execute(input: GetCategoriesInput): Promise<CategoryDTO[]> {
    const categories = await this.categoryRepository.findByFamilyId(input.familyId);
    const includeDeprecated = input.includeDeprecated ?? false;

    return categories
      .filter((category) => includeDeprecated || category.status === CategoryStatus.Active)
      .map((category) => ({
        id: category.id,
        name: category.name,
        status: category.status,
        tags: [...category.tags]
          .sort((a, b) => a.displayOrder - b.displayOrder)
          .map((tag) => ({
            id: tag.id,
            name: tag.name,
            status: tag.status,
            displayOrder: tag.displayOrder,
          })),
      }));
  }
}

export type { CategoryDTO, TagDTO };
export { GetCategoriesQuery };
