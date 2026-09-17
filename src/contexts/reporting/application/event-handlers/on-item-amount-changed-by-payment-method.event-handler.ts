// src/contexts/reporting/application/event-handlers/on-item-amount-changed-by-payment-method.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemAmountChanged } from "../../../financial-tracking/domain/events/item-amount-changed.event.js";
import { Money } from "../../../financial-tracking/domain/value-objects/money.js";
import { PaymentMethodPeriodAggregate } from "../../domain/entities/payment-method-period-aggregate.js";
import type { PaymentMethodPeriodAggregateRepository } from "../../domain/repositories/payment-method-period-aggregate.repository.js";

class OnItemAmountChangedByPaymentMethodEventHandler {
  constructor(private readonly repository: PaymentMethodPeriodAggregateRepository) {}

  async handle(event: ItemAmountChanged): Promise<void> {
    const familyId = FamilyId.of(event.familyId);
    const period = Period.fromDate(event.occurredOn);
    const currency = Currency.of(event.currency);
    const previousAmount = Money.of(event.previousAmount, currency);
    const newAmount = Money.of(event.newAmount, currency);
    const aggregates = await this.repository.findByFamilyIdAndPeriod(familyId, period);
    const aggregate =
      aggregates.find((candidate) => candidate.paymentMethodId.equals(event.paymentMethodId)) ??
      PaymentMethodPeriodAggregate.create(familyId, event.paymentMethodId, period, currency);
    if (aggregates.includes(aggregate))
      aggregate.changeItemAmount(event.type, previousAmount, newAmount);
    else aggregate.registerItem(event.type, newAmount);
    await this.repository.save(aggregate);
  }
}

export { OnItemAmountChangedByPaymentMethodEventHandler };
