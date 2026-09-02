// src/contexts/financial-tracking/application/commands/add-tag-to-category.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { Category } from "../../domain/entities/category.js";
import { CategoryNotActiveError } from "../../domain/errors/category-not-active.error.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { DuplicateTagNameError } from "../../domain/errors/duplicate-tag-name.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import type { TagName } from "../../domain/value-objects/tag-name.js";

interface AddTagToCategoryInput {
  familyId: FamilyId;
  categoryId: CategoryId;
  tagName: TagName;
}

class AddTagToCategoryUseCase {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: AddTagToCategoryInput): Promise<Category> {
    // 1. Buscar la categoría, validando que pertenezca a la familia
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category || category.familyId.toString() !== input.familyId.toString()) {
      throw new CategoryNotFoundError(input.categoryId.toString());
    }

    // 2. Validar que la categoría esté activa
    if (category.status !== CategoryStatus.Active) {
      throw new CategoryNotActiveError(input.categoryId.toString());
    }

    // 3. Verificar que no colisione con otro tag existente en la categoría
    const duplicate = category.tags.some((tag) => tag.name.equals(input.tagName));
    if (duplicate) {
      throw new DuplicateTagNameError(input.tagName.toString());
    }

    // 4. Agregar el tag
    category.addTag(input.tagName);

    // 5. Persistir
    await this.categoryRepository.save(category);

    // 6. Publicar eventos
    const events = category.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return category;
  }
}

export { AddTagToCategoryUseCase };
