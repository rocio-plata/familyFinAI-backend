// src/contexts/financial-tracking/application/commands/reclassify-financial-item.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { FinancialItem } from "../../domain/entities/financial-item.js";
import { CategoryNotActiveError } from "../../domain/errors/category-not-active.error.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { FinancialItemNotFoundError } from "../../domain/errors/financial-item-not-found.error.js";
import { TagDoesNotBelongToCategoryError } from "../../domain/errors/tag-does-not-belong-to-category.error.js";
import { TagNotActiveError } from "../../domain/errors/tag-not-active.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { FinancialItemRepository } from "../../domain/repositories/financial-item.repository.js";
import { CategoryAssignment } from "../../domain/value-objects/category-assignment.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";
import { TagStatus } from "../../domain/value-objects/tag-status.js";

interface ReclassifyFinancialItemInput {
  familyId: FamilyId;
  itemId: FinancialItem["id"];
  newCategoryId: CategoryId;
  newTagId: TagId | null;
}

class ReclassifyFinancialItemUseCase {
  constructor(
    private readonly itemRepository: FinancialItemRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: ReclassifyFinancialItemInput): Promise<FinancialItem> {
    // 1. Buscar el item, validando que pertenezca a la familia
    const item = await this.itemRepository.findById(input.itemId);
    if (!item || item.familyId.toString() !== input.familyId.toString()) {
      throw new FinancialItemNotFoundError(input.itemId.toString());
    }

    // 2. Buscar la nueva categoría
    const category = await this.categoryRepository.findById(input.newCategoryId);
    if (!category) {
      throw new CategoryNotFoundError(input.newCategoryId.toString());
    }

    // 3. Validar que la categoría esté activa
    if (category.status !== CategoryStatus.Active) {
      throw new CategoryNotActiveError(input.newCategoryId.toString());
    }

    // 4. Si hay tag, validar que exista dentro de la categoría y esté activo
    if (input.newTagId !== null) {
      const newTagId = input.newTagId;
      const tag = category.tags.find((t) => t.id.equals(newTagId));
      if (!tag) {
        throw new TagDoesNotBelongToCategoryError(
          newTagId.toString(),
          input.newCategoryId.toString(),
        );
      }

      if (tag.status !== TagStatus.Active) {
        throw new TagNotActiveError(newTagId.toString());
      }
    }

    // 5. Reclasificar
    const newCategoryAssignment = CategoryAssignment.of(input.newCategoryId, input.newTagId);
    item.reclassify(newCategoryAssignment);

    // 6. Persistir
    await this.itemRepository.save(item);

    // 7. Publicar eventos
    const events = item.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return item;
  }
}

export { ReclassifyFinancialItemUseCase };
