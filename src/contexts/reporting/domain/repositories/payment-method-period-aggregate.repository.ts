// src/contexts/reporting/domain/repositories/payment-method-period-aggregate.repository.ts
import type { Period } from "../../../../shared-kernel/domain/period.js";
import type { FamilyId } from "../../../family-access/domain/value-objects/family-id.js";
import type { PaymentMethodPeriodAggregate } from "../entities/payment-method-period-aggregate.js";

interface PaymentMethodPeriodAggregateRepository {
  save(aggregate: PaymentMethodPeriodAggregate): Promise<void>;
  findByFamilyIdAndPeriod(
    familyId: FamilyId,
    period: Period,
  ): Promise<PaymentMethodPeriodAggregate[]>;
}

export type { PaymentMethodPeriodAggregateRepository };
