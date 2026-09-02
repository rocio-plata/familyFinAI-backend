// src/contexts/financial-tracking/application/commands/delete-category.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryDeletionService } from "../../domain/services/category-deletion.service.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";

interface DeleteCategoryInput {
  familyId: FamilyId;
  requestedBy: UserId;
  categoryId: CategoryId;
}

class DeleteCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly categoryDeletionService: CategoryDeletionService,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: DeleteCategoryInput): Promise<void> {
    // 1. Solo un Owner puede eliminar categorías
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

    // 3. Rechazar si tiene items asociados (el servicio de dominio consulta FinancialItemRepository)
    await this.categoryDeletionService.delete(category);

    // 4. Eliminar físicamente — elegible solo si nunca tuvo items
    await this.categoryRepository.delete(category.id);
  }
}

export { DeleteCategoryUseCase };
