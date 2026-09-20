// src/contexts/financial-tracking/application/commands/update-category.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { Category } from "../../domain/entities/category.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { DuplicateCategoryNameError } from "../../domain/errors/duplicate-category-name.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryIcon } from "../../domain/value-objects/category-icon.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { CategoryName } from "../../domain/value-objects/category-name.js";

interface UpdateCategoryInput {
  familyId: FamilyId;
  requestedBy: UserId;
  categoryId: CategoryId;
  newName?: CategoryName;
  newIcon?: CategoryIcon | null;
}

class UpdateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: UpdateCategoryInput): Promise<Category> {
    // 1. Solo un Owner puede actualizar categorías
    const membership = await this.getFamilyMembership.execute({
      familyId: input.familyId,
      userId: input.requestedBy,
    });
    if (!membership?.role.isOwner()) {
      throw new InsufficientRoleError();
    }

    // 2. Buscar la categoría, validando que pertenezca a la familia
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.familyId.toString() !== input.familyId.toString()) {
      throw new CategoryNotFoundError(input.categoryId.toString());
    }

    // 3. Aplicar cada cambio solicitado
    if (input.newName !== undefined) {
      const newName = input.newName;
      const familyCategories = await this.categoryRepository.findByFamilyId(input.familyId);
      const duplicate = familyCategories.some(
        (other) => !other.id.equals(category.id) && other.name.equals(newName),
      );
      if (duplicate) {
        throw new DuplicateCategoryNameError(newName.toString());
      }

      category.rename(newName);
    }

    if (input.newIcon !== undefined) {
      category.updateIcon(input.newIcon);
    }

    // 4. Persistir
    await this.categoryRepository.save(category);

    return category;
  }
}

export { UpdateCategoryUseCase };
