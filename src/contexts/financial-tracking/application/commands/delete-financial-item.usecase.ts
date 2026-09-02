// src/contexts/financial-tracking/application/commands/delete-financial-item.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { FinancialItem } from "../../domain/entities/financial-item.js";
import { FinancialItemNotFoundError } from "../../domain/errors/financial-item-not-found.error.js";
import { ItemDeleted } from "../../domain/events/item-deleted.event.js";
import type { FinancialItemRepository } from "../../domain/repositories/financial-item.repository.js";

interface DeleteFinancialItemInput {
  familyId: FamilyId;
  itemId: FinancialItem["id"];
}

class DeleteFinancialItemUseCase {
  constructor(
    private readonly itemRepository: FinancialItemRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: DeleteFinancialItemInput): Promise<void> {
    // 1. Buscar el item, validando que pertenezca a la familia
    const item = await this.itemRepository.findById(input.itemId);
    if (!item || item.familyId.toString() !== input.familyId.toString()) {
      throw new FinancialItemNotFoundError(input.itemId.toString());
    }

    // 2. Eliminar
    await this.itemRepository.delete(item.id);

    // 3. Publicar evento para que Budgeting/Reporting reviertan el efecto de ItemRecorded
    await this.eventBus.publish(
      new ItemDeleted(
        item.id,
        item.familyId.toString(),
        item.categoryAssignment.categoryId,
        item.categoryAssignment.tagId,
        item.amount.amount,
        item.type,
      ),
    );
  }
}

export { DeleteFinancialItemUseCase };
