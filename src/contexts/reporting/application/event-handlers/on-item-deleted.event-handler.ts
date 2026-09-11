// src/contexts/reporting/application/event-handlers/on-item-deleted.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemDeleted } from "../../../financial-tracking/domain/events/item-deleted.event.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

class OnItemDeletedEventHandler {
  constructor(private readonly aggregateRepository: CategoryPeriodAggregateRepository) {}

  async handle(event: ItemDeleted): Promise<void> {
    const familyId = FamilyId.of(event.familyId);
    const period = Period.fromDate(event.occurredOn);
    const currency = Currency.of(event.currency);
    const amount = Money.of(event.amount, currency);
    const aggregates = await this.aggregateRepository.findByFamilyIdAndPeriod(familyId, period);
    const aggregate = aggregates.find((candidate) => candidate.categoryId.equals(event.categoryId));

    if (!aggregate) return;

    aggregate.removeItem(event.type, amount);
    await this.aggregateRepository.save(aggregate);
  }
}

export { OnItemDeletedEventHandler };
