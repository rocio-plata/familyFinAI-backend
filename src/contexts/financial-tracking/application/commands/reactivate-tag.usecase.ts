// /src/contexts/financial-tracking/application/commands/reactivate-tag.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import type { Category } from "../../domain/entities/category.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";

interface ReactivateTagInput {
  familyId: FamilyId;
  requestedBy: UserId;
  categoryId: CategoryId;
  tagId: TagId;
}

class ReactivateTagUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: ReactivateTagInput): Promise<Category> {
    // 1. Solo un Owner puede reactivar tags
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

    // 3. Reactivar el tag (lanza TagNotFoundError si no existe)
    category.reactivateTag(input.tagId);

    // 4. Persistir
    await this.categoryRepository.save(category);

    // 5. Publicar eventos
    const events = category.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return category;
  }
}

export { ReactivateTagUseCase };
