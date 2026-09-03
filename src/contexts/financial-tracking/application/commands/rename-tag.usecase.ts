// src/contexts/financial-tracking/application/commands/rename-tag.usecase.ts
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { Category } from "../../domain/entities/category.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { DuplicateTagNameError } from "../../domain/errors/duplicate-tag-name.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import { TagNotFoundError } from "../../domain/errors/tag-not-found.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";
import type { TagName } from "../../domain/value-objects/tag-name.js";

interface RenameTagInput {
  familyId: FamilyId;
  requestedBy: UserId;
  categoryId: CategoryId;
  tagId: TagId;
  newName: TagName;
}

class RenameTagUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
  ) {}

  async execute(input: RenameTagInput): Promise<Category> {
    // 1. Solo un Owner puede renombrar tags
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

    // 4. Verificar que ningún otro tag de la categoría tenga ya ese nombre
    const duplicate = category.tags.some(
      (other) => !other.id.equals(tag.id) && other.name.equals(input.newName),
    );
    if (duplicate) {
      throw new DuplicateTagNameError(input.newName.toString());
    }

    // 5. Renombrar
    tag.rename(input.newName);

    // 6. Persistir
    await this.categoryRepository.save(category);

    return category;
  }
}

export { RenameTagUseCase };
