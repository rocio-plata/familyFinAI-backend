// src/contexts/financial-tracking/application/commands/create-category.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { GetFamilyMembershipQuery } from "../../../family-access/application/queries/get-family-membership.query.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import { Category } from "../../domain/entities/category.js";
import { DuplicateCategoryNameError } from "../../domain/errors/duplicate-category-name.error.js";
import { InsufficientRoleError } from "../../domain/errors/insufficient-role.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryName } from "../../domain/value-objects/category-name.js";

interface CreateCategoryInput {
  familyId: FamilyId;
  requestedBy: UserId;
  name: CategoryName;
}

class CreateCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly getFamilyMembership: GetFamilyMembershipQuery,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateCategoryInput): Promise<Category> {
    // 1. Solo un Owner puede crear categorías
    const membership = await this.getFamilyMembership.execute({
      familyId: input.familyId,
      userId: input.requestedBy,
    });
    if (!membership?.role.isOwner()) {
      throw new InsufficientRoleError();
    }

    // 2. Verificar que no exista otra categoría con el mismo nombre en la familia,
    // sin importar su estado — reactivar una deprecada usa ReactivateCategory
    const familyCategories = await this.categoryRepository.findByFamilyId(input.familyId);
    const duplicate = familyCategories.some((category) => category.name.equals(input.name));
    if (duplicate) {
      throw new DuplicateCategoryNameError(input.name.toString());
    }

    // 3. Crear la categoría
    const category = Category.create(input.familyId, input.name);

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

export { CreateCategoryUseCase };
