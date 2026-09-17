// src/contexts/reporting/application/event-handlers/on-item-payment-method-changed.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemPaymentMethodChanged } from "../../../financial-tracking/domain/events/item-payment-method-changed.event.js";
import { PaymentMethodPeriodAggregate } from "../../domain/entities/payment-method-period-aggregate.js";
import type { PaymentMethodPeriodAggregateRepository } from "../../domain/repositories/payment-method-period-aggregate.repository.js";

class OnItemPaymentMethodChangedEventHandler {
  constructor(private readonly repository: PaymentMethodPeriodAggregateRepository) {}

  async handle(event: ItemPaymentMethodChanged): Promise<void> {
    const familyId = FamilyId.of(event.familyId);
    const period = Period.fromDate(event.occurredOn);
    const currency = Currency.of(event.currency);
    const amount = Money.of(event.amount, currency);
    const aggregates = await this.repository.findByFamilyIdAndPeriod(familyId, period);
    const previous = aggregates.find((candidate) =>
      candidate.paymentMethodId.equals(event.previousPaymentMethodId),
    );
    if (previous) {
      previous.removeItem(event.type, amount);
      await this.repository.save(previous);
    }
    const next =
      aggregates.find((candidate) => candidate.paymentMethodId.equals(event.paymentMethodId)) ??
      PaymentMethodPeriodAggregate.create(familyId, event.paymentMethodId, period, currency);
    next.registerItem(event.type, amount);
    await this.repository.save(next);
  }
}

export { OnItemPaymentMethodChangedEventHandler };
