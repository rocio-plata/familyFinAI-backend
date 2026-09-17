// src/contexts/financial-tracking/domain/errors/payment-method-is-someones-default.error.ts
import { DomainError } from "../../../../shared-kernel/errors/domain-error.js";

class PaymentMethodIsSomeonesDefaultError extends DomainError {
  readonly code = "FINANCIAL_TRACKING.PAYMENT_METHOD_IS_SOMEONES_DEFAULT";

  constructor(paymentMethodId: string) {
    super(`El medio de pago '${paymentMethodId}' es el predeterminado de algún usuario`);
  }
}

export { PaymentMethodIsSomeonesDefaultError };
