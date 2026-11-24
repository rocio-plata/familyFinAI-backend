// src/contexts/financial-tracking/application/commands/reorder-categories.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { Category } from "../../domain/entities/category.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import { InvalidCategoryOrderError } from "../../domain/errors/invalid-category-order.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";

interface ReorderCategoriesInput {
  familyId: FamilyId;
  requestedBy: UserId;
  orderedCategoryIds: CategoryId[];
}

class ReorderCategoriesUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: ReorderCategoriesInput): Promise<void> {
    // 1. Solo un Owner puede reordenar categorías
    const membership = await this.getFamilyMembership.execute({
      familyId: input.familyId,
      userId: input.requestedBy,
    });
    if (!membership?.role.isOwner()) {
      throw new InsufficientRoleError();
    }

    // 2. Validar la lista: no vacía y sin repetidos
    const uniqueIds = new Set(input.orderedCategoryIds.map((id) => id.toString()));
    if (
      input.orderedCategoryIds.length === 0 ||
      uniqueIds.size !== input.orderedCategoryIds.length
    ) {
      throw new InvalidCategoryOrderError();
    }

    // 3. Todas deben existir en la familia y compartir tipo
    const familyCategories = await this.categoryRepository.findByFamilyId(input.familyId);
    const byId = new Map(familyCategories.map((category) => [category.id.toString(), category]));
    const ordered: Category[] = [];
    for (const id of input.orderedCategoryIds) {
      const category = byId.get(id.toString());
      if (!category) {
        throw new CategoryNotFoundError(id.toString());
      }
      ordered.push(category);
    }
    const type = ordered[0]?.type;
    if (ordered.some((category) => category.type !== type)) {
      throw new InvalidCategoryOrderError();
    }

    // 4. Las recibidas van primero; el resto del mismo tipo conserva su orden relativo después
    const rest = familyCategories
      .filter((category) => category.type === type && !uniqueIds.has(category.id.toString()))
      .sort((a, b) => a.displayOrder - b.displayOrder);
    for (const [index, category] of [...ordered, ...rest].entries()) {
      category.changeDisplayOrder(index);
      await this.categoryRepository.save(category);
    }
  }
}

export { ReorderCategoriesUseCase };
