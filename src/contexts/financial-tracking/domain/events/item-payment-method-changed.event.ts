// src/contexts/financial-tracking/domain/events/item-payment-method-changed.event.ts
import { DomainEvent } from "../../../../shared-kernel/domain/domain-event.js";
import type { FinancialItemId } from "../value-objects/financial-item-id.js";
import type { FinancialItemType } from "../value-objects/financial-item-type.js";
import type { PaymentMethodId } from "../value-objects/payment-method-id.js";

class ItemPaymentMethodChanged extends DomainEvent {
  readonly eventName = "financial-tracking.item-payment-method-changed";

  constructor(
    readonly itemId: FinancialItemId,
    readonly familyId: string,
    readonly previousPaymentMethodId: PaymentMethodId,
    readonly paymentMethodId: PaymentMethodId,
    readonly amount: number,
    readonly type: FinancialItemType,
  ) {
    super();
  }
}

export { ItemPaymentMethodChanged };
