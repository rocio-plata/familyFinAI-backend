// src/contexts/financial-tracking/application/commands/update-financial-item.usecase.ts
import type { EventBus } from "../../../../platform/events/event-bus.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { FinancialItem } from "../../domain/entities/financial-item.js";
import { FinancialItemNotFoundError } from "../../domain/errors/financial-item-not-found.error.js";
import type { FinancialItemRepository } from "../../domain/repositories/financial-item.repository.js";
import type { Money } from "../../domain/value-objects/money.js";
import type { Note } from "../../domain/value-objects/note.js";
import type { Title } from "../../domain/value-objects/title.js";
import type { TransactionDate } from "../../domain/value-objects/transaction-date.js";

interface UpdateFinancialItemInput {
  familyId: FamilyId;
  itemId: FinancialItem["id"];
  amount?: Money;
  occurredOn?: TransactionDate;
  title?: Title;
  note?: Note | null;
}

class UpdateFinancialItemUseCase {
  constructor(
    private readonly itemRepository: FinancialItemRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(input: UpdateFinancialItemInput): Promise<FinancialItem> {
    // 1. Buscar el item
    const item = await this.itemRepository.findById(input.itemId);
    if (!item) {
      throw new FinancialItemNotFoundError(input.itemId.toString());
    }

    // 2. Validar que pertenezca a la familia
    if (item.familyId.toString() !== input.familyId.toString()) {
      throw new FinancialItemNotFoundError(input.itemId.toString());
    }

    // 3. Aplicar cambios a cada campo presente
    if (input.amount !== undefined) {
      item.updateAmount(input.amount);
    }

    if (input.occurredOn !== undefined) {
      item.updateOccurredOn(input.occurredOn);
    }

    if (input.title !== undefined) {
      item.updateTitle(input.title);
    }

    if (input.note !== undefined) {
      item.updateNote(input.note);
    }

    // 4. Persistir
    await this.itemRepository.save(item);

    // 5. Publicar eventos
    const events = item.pullDomainEvents();
    for (const event of events) {
      await this.eventBus.publish(event);
    }

    return item;
  }
}

export { UpdateFinancialItemUseCase };
