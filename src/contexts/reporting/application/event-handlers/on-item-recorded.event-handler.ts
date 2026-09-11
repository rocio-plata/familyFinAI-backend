// src/contexts/reporting/application/event-handlers/on-item-recorded.event-handler.ts

import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemRecorded } from "../../../financial-tracking/domain/events/item-recorded.event.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { CategoryPeriodAggregate } from "../../domain/entities/category-period-aggregate.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

class OnItemRecordedEventHandler {
  constructor(private readonly aggregateRepository: CategoryPeriodAggregateRepository) {}

  async handle(event: ItemRecorded): Promise<void> {
    const familyId = FamilyId.of(event.familyId);
    const period = Period.fromDate(event.occurredOn);
    const aggregates = await this.aggregateRepository.findByFamilyIdAndPeriod(familyId, period);
    const aggregate =
      aggregates.find((candidate) => candidate.categoryId.equals(event.categoryId)) ??
      CategoryPeriodAggregate.create(
        familyId,
        event.categoryId,
        period,
        Currency.of(event.currency),
      );

    aggregate.registerItem(event.type, Money.of(event.amount, Currency.of(event.currency)));
    await this.aggregateRepository.save(aggregate);
  }
}

export { OnItemRecordedEventHandler };
