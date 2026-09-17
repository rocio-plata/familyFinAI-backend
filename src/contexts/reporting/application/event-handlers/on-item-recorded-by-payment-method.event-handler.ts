// src/contexts/reporting/application/event-handlers/on-item-recorded-by-payment-method.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemRecorded } from "../../../financial-tracking/domain/events/item-recorded.event.js";
import { PaymentMethodPeriodAggregate } from "../../domain/entities/payment-method-period-aggregate.js";
import type { PaymentMethodPeriodAggregateRepository } from "../../domain/repositories/payment-method-period-aggregate.repository.js";

class OnItemRecordedByPaymentMethodEventHandler {
  constructor(private readonly repository: PaymentMethodPeriodAggregateRepository) {}

  async handle(event: ItemRecorded): Promise<void> {
    const familyId = FamilyId.of(event.familyId);
    const period = Period.fromDate(event.occurredOn);
    const currency = Currency.of(event.currency);
    const aggregates = await this.repository.findByFamilyIdAndPeriod(familyId, period);
    const aggregate =
      aggregates.find((candidate) => candidate.paymentMethodId.equals(event.paymentMethodId)) ??
      PaymentMethodPeriodAggregate.create(familyId, event.paymentMethodId, period, currency);
    aggregate.registerItem(event.type, Money.of(event.amount, currency));
    await this.repository.save(aggregate);
  }
}

export { OnItemRecordedByPaymentMethodEventHandler };
