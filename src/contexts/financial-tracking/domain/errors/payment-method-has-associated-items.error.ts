// src/contexts/financial-tracking/domain/errors/payment-method-has-associated-items.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class PaymentMethodHasAssociatedItemsError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.PAYMENT_METHOD_HAS_ASSOCIATED_ITEMS";

  constructor(paymentMethodId: string) {
    super(
      `No se puede eliminar el medio de pago '${paymentMethodId}' porque tiene items asociados`,
    );
  }
}

export { PaymentMethodHasAssociatedItemsError };
