// src/contexts/reporting/application/event-handlers/on-item-deleted-by-payment-method.event-handler.ts
import { Currency } from "../../../../shared-kernel/domain/currency.js";
import { Money } from "../../../../shared-kernel/domain/money.js";
import { Period } from "../../../../shared-kernel/domain/period.js";
import { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { ItemDeleted } from "../../../financial-tracking/domain/events/item-deleted.event.js";
import type { PaymentMethodPeriodAggregateRepository } from "../../domain/repositories/payment-method-period-aggregate.repository.js";

class OnItemDeletedByPaymentMethodEventHandler {
  constructor(private readonly repository: PaymentMethodPeriodAggregateRepository) {}

  async handle(event: ItemDeleted): Promise<void> {
    const familyId = FamilyId.of(event.familyId);
    const period = Period.fromDate(event.occurredOn);
    const aggregate = (await this.repository.findByFamilyIdAndPeriod(familyId, period)).find(
      (candidate) => candidate.paymentMethodId.equals(event.paymentMethodId),
    );
    if (!aggregate) return;
    aggregate.removeItem(event.type, Money.of(event.amount, Currency.of(event.currency)));
    await this.repository.save(aggregate);
  }
}

export { OnItemDeletedByPaymentMethodEventHandler };
