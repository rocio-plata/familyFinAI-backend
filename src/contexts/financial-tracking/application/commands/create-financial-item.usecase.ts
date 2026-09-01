// src/contexts/financial-tracking/application/commands/create-financial-item.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { UserId } from "../../../family-access/domain/value-objects/user-id.js";
import {
  type CreateFinancialItemProps,
  FinancialItem,
} from "../../domain/entities/financial-item.js";
import { CategoryNotActiveError } from "../../domain/errors/category-not-active.error.js";
import { CategoryNotFoundError } from "../../domain/errors/category-not-found.error.js";
import { TagDoesNotBelongToCategoryError } from "../../domain/errors/tag-does-not-belong-to-category.error.js";
import { TagNotActiveError } from "../../domain/errors/tag-not-active.error.js";
import type { CategoryRepository } from "../../domain/repositories/category.repository.js";
import type { FinancialItemRepository } from "../../domain/repositories/financial-item.repository.js";
import { CategoryAssignment } from "../../domain/value-objects/category-assignment.js";
import type { CategoryId } from "../../domain/value-objects/category-id.js";
import { CategoryStatus } from "../../domain/value-objects/category-status.js";
import type { FinancialItemType } from "../../domain/value-objects/financial-item-type.js";
import type { Money } from "../../domain/value-objects/money.js";
import type { Note } from "../../domain/value-objects/note.js";
import type { TagId } from "../../domain/value-objects/tag-id.js";
import { TagStatus } from "../../domain/value-objects/tag-status.js";
import type { Title } from "../../domain/value-objects/title.js";
import type { TransactionDate } from "../../domain/value-objects/transaction-date.js";

interface CreateFinancialItemInput {
  familyId: FamilyId;
  recordedBy: UserId;
  type?: FinancialItemType;
  amount: Money;
  categoryId: CategoryId;
  tagId: TagId | null;
  title: Title;
  note?: Note;
  occurredOn: TransactionDate;
}

class CreateFinancialItemUseCase {
  constructor(
    private readonly itemRepository: FinancialItemRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: CreateFinancialItemInput): Promise<FinancialItem> {
    // 1. Buscar la categoría
    const category = await this.categoryRepository.findById(input.categoryId);
    if (!category) {
      throw new CategoryNotFoundError(input.categoryId.toString());
    }

    // 2. Validar que la categoría esté activa
    if (category.status !== CategoryStatus.Active) {
      throw new CategoryNotActiveError(input.categoryId.toString());
    }

    // 3. Si hay tag, validar que existe, pertenece a la categoría, y está activo
    if (input.tagId !== null) {
      const tagId = input.tagId;
      const tag = category.tags.find((t) => t.id.equals(tagId));
      if (!tag) {
        throw new TagDoesNotBelongToCategoryError(tagId.toString(), input.categoryId.toString());
      }

      if (tag.status !== TagStatus.Active) {
        throw new TagNotActiveError(input.tagId.toString());
      }
    }

    // 4. Construir CategoryAssignment
    const categoryAssignment = CategoryAssignment.of(input.categoryId, input.tagId);

    // 5. Crear el FinancialItem
    const props: CreateFinancialItemProps = {
      familyId: input.familyId,
      recordedBy: input.recordedBy,
      amount: input.amount,
      category: categoryAssignment,
      title: input.title,
      occurredOn: input.occurredOn,
      ...(input.type && { type: input.type }),
      ...(input.note && { note: input.note }),
    };
    const item = FinancialItem.create(props);

    // 6. Publicar eventos
    const events = item.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    // 7. Persistir
    await this.itemRepository.save(item);

    return item;
  }
}

export { CreateFinancialItemUseCase };
