// src/contexts/financial-tracking/application/commands/delete-tag.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import { TagNotFoundError } from "../../domain/errors/tag-not-found.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { TagDeletionService } from "../../domain/services/tag-deletion.service.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";

interface DeleteTagInput {
  familyId: FamilyId;
  requestedBy: UserId;
  categoryId: CategoryId;
  tagId: TagId;
}

class DeleteTagUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly tagDeletionService: TagDeletionService,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: DeleteTagInput): Promise<void> {
    // 1. Solo un Owner puede eliminar tags
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

    // 3. Buscar el tag dentro de la categoría
    const tag = category.tags.find((t) => t.id.equals(input.tagId));
    if (!tag) {
      throw new TagNotFoundError(input.tagId.toString());
    }

    // 4. Rechazar si tiene items asociados (el servicio de dominio consulta FinancialItemRepository)
    await this.tagDeletionService.delete(tag);

    // 5. Eliminar físicamente — elegible solo si nunca tuvo items
    category.removeTag(tag.id);
    await this.categoryRepository.save(category);
  }
}

export { DeleteTagUseCase };
