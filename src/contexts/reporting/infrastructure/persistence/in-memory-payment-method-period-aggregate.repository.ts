// src/contexts/reporting/infrastructure/persistence/in-memory-payment-method-period-aggregate.repository.ts
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { PaymentMethodPeriodAggregate } from "../../domain/entities/payment-method-period-aggregate.js";
import type { PaymentMethodPeriodAggregateRepository } from "../../domain/repositories/payment-method-period-aggregate.repository.js";

class InMemoryPaymentMethodPeriodAggregateRepository
  implements PaymentMethodPeriodAggregateRepository
{
  private readonly aggregates = new Map<string, PaymentMethodPeriodAggregate>();

  async save(aggregate: PaymentMethodPeriodAggregate): Promise<void> {
    this.aggregates.set(
      `${aggregate.familyId}:${aggregate.paymentMethodId}:${aggregate.period}`,
      aggregate,
    );
  }

  async findByFamilyIdAndPeriod(
    familyId: FamilyId,
    period: Period,
  ): Promise<PaymentMethodPeriodAggregate[]> {
    return [...this.aggregates.values()].filter(
      (aggregate) => aggregate.familyId.equals(familyId) && aggregate.period.equals(period),
    );
  }
}

export { InMemoryPaymentMethodPeriodAggregateRepository };
