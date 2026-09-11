// src/contexts/reporting/application/event-handlers/on-item-amount-changed.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemAmountChanged } from "../../../financial-tracking/domain/events/item-amount-changed.event.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { CategoryPeriodAggregate } from "../../domain/entities/category-period-aggregate.js";
import type { CategoryPeriodAggregateRepository } from "../../domain/repositories/category-period-aggregate.repository.js";

class OnItemAmountChangedEventHandler {
  constructor(private readonly aggregateRepository: CategoryPeriodAggregateRepository) {}

  async handle(event: ItemAmountChanged): Promise<void> {
    const familyId = FamilyId.of(event.familyId);
    const period = Period.fromDate(event.occurredOn);
    const currency = Currency.of(event.currency);
    const previousAmount = Money.of(event.previousAmount, currency);
    const newAmount = Money.of(event.newAmount, currency);
    const aggregates = await this.aggregateRepository.findByFamilyIdAndPeriod(familyId, period);
    const aggregate =
      aggregates.find((candidate) => candidate.categoryId.equals(event.categoryId)) ??
      CategoryPeriodAggregate.create(familyId, event.categoryId, period, currency);

    if (aggregates.includes(aggregate)) {
      aggregate.changeItemAmount(event.type, previousAmount, newAmount);
    } else {
      aggregate.registerItem(event.type, newAmount);
    }
    await this.aggregateRepository.save(aggregate);
  }
}

export { OnItemAmountChangedEventHandler };
