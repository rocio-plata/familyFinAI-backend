// src/contexts/financial-tracking/application/commands/rename-category.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { Category } from "../../domain/entities/category.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { DuplicateCategoryNameError } from "../../domain/errors/duplicate-category-name.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { CategoryName } from "../../domain/value-objects/category-name.js";

interface RenameCategoryInput {
  familyId: FamilyId;
  requestedBy: UserId;
  categoryId: CategoryId;
  newName: CategoryName;
}

class RenameCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: RenameCategoryInput): Promise<Category> {
    // 1. Solo un Owner puede renombrar categorías
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

    // 3. Verificar que ninguna otra categoría de la familia tenga ya ese nombre,
    // sin importar su estado (mismo criterio que CreateCategory)
    const familyCategories = await this.categoryRepository.findByFamilyId(input.familyId);
    const duplicate = familyCategories.some(
      (other) => !other.id.equals(category.id) && other.name.equals(input.newName),
    );
    if (duplicate) {
      throw new DuplicateCategoryNameError(input.newName.toString());
    }

    // 4. Renombrar
    category.rename(input.newName);

    // 5. Persistir
    await this.categoryRepository.save(category);

    return category;
  }
}

export { RenameCategoryUseCase };
