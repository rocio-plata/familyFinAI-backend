// src/contexts/reporting/application/event-handlers/on-item-reclassified.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemReclassified } from "../../../financial-tracking/domain/events/item-reclassified.event.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { CategoryPeriodAggregate } from "../../domain/entities/category-period-aggregate.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

class OnItemReclassifiedEventHandler {
  constructor(private readonly aggregateRepository: CategoryPeriodAggregateRepository) {}

  async handle(event: ItemReclassified): Promise<void> {
    const familyId = FamilyId.of(event.familyId);
    const period = Period.fromDate(event.occurredOn);
    const currency = Currency.of(event.currency);
    const amount = Money.of(event.amount, currency);
    const aggregates = await this.aggregateRepository.findByFamilyIdAndPeriod(familyId, period);
    const previousAggregate = aggregates.find((aggregate) =>
      aggregate.categoryId.equals(event.previousCategoryId),
    );
    const newAggregate =
      aggregates.find((aggregate) => aggregate.categoryId.equals(event.newCategoryId)) ??
      CategoryPeriodAggregate.create(familyId, event.newCategoryId, period, currency);

    if (previousAggregate) {
      previousAggregate.removeItem(event.type, amount);
      await this.aggregateRepository.save(previousAggregate);
    }
    newAggregate.registerItem(event.type, amount);
    await this.aggregateRepository.save(newAggregate);
  }
}

export { OnItemReclassifiedEventHandler };
